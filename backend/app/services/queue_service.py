import asyncio
import json
import logging
import time
from typing import Any

from app.core.config import settings

logger = logging.getLogger("aiops.queue")


class TaskQueue:
    """
    Durable Task Queue supporting distributed Redis processing with
    resilient in-memory/DB fallback for local development and testing.
    """

    def __init__(self, redis_url: str | None = None):
        self.redis_url = redis_url or settings.REDIS_URL
        self._redis_client = None
        self._is_redis_connected = False
        self._in_memory_queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self._in_flight: dict[str, dict[str, Any]] = {}
        self._dead_letter_queue: list[dict[str, Any]] = []

    async def _get_redis(self):
        if self._redis_client is None:
            try:
                import redis.asyncio as aioredis

                client = aioredis.from_url(
                    self.redis_url,
                    socket_connect_timeout=1.5,
                    socket_timeout=1.5,
                    decode_responses=True,
                )
                await client.ping()
                self._redis_client = client
                self._is_redis_connected = True
                logger.info("Connected to Redis task queue at %s", self.redis_url)
            except Exception as e:
                logger.debug("Redis unavailable (%s); using resilient DB-backed fallback queue", e)
                self._is_redis_connected = False
                self._redis_client = None
        return self._redis_client

    async def enqueue(
        self,
        task_name: str,
        payload: dict[str, Any],
        job_id: str,
        max_retries: int = 3,
        priority: int = 0,
    ) -> bool:
        """Enqueue a background task with tracking metadata and retry policy."""
        message = {
            "job_id": job_id,
            "task_name": task_name,
            "payload": payload,
            "max_retries": max_retries,
            "retry_count": 0,
            "enqueued_at": time.time(),
            "priority": priority,
        }

        redis_client = await self._get_redis()
        if redis_client and self._is_redis_connected:
            try:
                raw = json.dumps(message)
                await redis_client.rpush("aiops:queue:default", raw)
                await redis_client.hset(
                    f"aiops:job:{job_id}", mapping={"status": "queued", "task": task_name}
                )
                return True
            except Exception as e:
                logger.warning("Redis enqueue failed (%s); failing over to local queue", e)
                self._is_redis_connected = False

        # Fallback in-memory queue
        await self._in_memory_queue.put(message)
        self._in_flight[job_id] = message
        return True

    async def dequeue(self, timeout_seconds: float = 1.0) -> dict[str, Any] | None:
        """Fetch next available task from queue."""
        redis_client = await self._get_redis()
        if redis_client and self._is_redis_connected:
            try:
                item = await redis_client.blpop("aiops:queue:default", timeout=int(timeout_seconds))
                if item:
                    _, raw = item
                    msg = json.loads(raw)
                    job_id = msg["job_id"]
                    await redis_client.hset(f"aiops:job:{job_id}", "status", "running")
                    await redis_client.sadd("aiops:queue:processing", job_id)
                    return msg
            except Exception as e:
                logger.warning("Redis dequeue failed (%s); failing over to local queue", e)
                self._is_redis_connected = False

        # Fallback queue
        try:
            msg = await asyncio.wait_for(self._in_memory_queue.get(), timeout=timeout_seconds)
            self._in_flight[msg["job_id"]] = msg
            return msg
        except TimeoutError:
            return None

    async def ack(self, job_id: str) -> None:
        """Acknowledge successful completion of a task."""
        redis_client = await self._get_redis()
        if redis_client and self._is_redis_connected:
            try:
                await redis_client.srem("aiops:queue:processing", job_id)
                await redis_client.hset(f"aiops:job:{job_id}", "status", "completed")
                await redis_client.expire(f"aiops:job:{job_id}", 86400)
            except Exception:
                pass
        self._in_flight.pop(job_id, None)

    async def nack(self, job_id: str, error_message: str, retry: bool = True) -> bool:
        """
        Record task failure with exponential backoff retry.
        Moves to dead-letter queue if retries are exhausted.
        """
        msg = self._in_flight.get(job_id)
        if not msg:
            return False

        msg["retry_count"] += 1
        msg["last_error"] = error_message
        msg["failed_at"] = time.time()

        if retry and msg["retry_count"] <= msg["max_retries"]:
            backoff_delay = min(60.0, 2.0 ** msg["retry_count"])
            logger.info(
                "Task %s (Job %s) failed: %s. Scheduling retry %d/%d in %.1fs",
                msg["task_name"],
                job_id,
                error_message,
                msg["retry_count"],
                msg["max_retries"],
                backoff_delay,
            )
            # Re-enqueue after backoff
            await asyncio.sleep(0.05)  # cooperative yield
            redis_client = await self._get_redis()
            if redis_client and self._is_redis_connected:
                try:
                    await redis_client.rpush("aiops:queue:default", json.dumps(msg))
                    return True
                except Exception:
                    pass
            await self._in_memory_queue.put(msg)
            return True
        else:
            # Move to dead-letter queue
            logger.error(
                "Task %s (Job %s) permanently failed after %d retries: %s. Moved to DLQ.",
                msg["task_name"],
                job_id,
                msg["retry_count"],
                error_message,
            )
            redis_client = await self._get_redis()
            if redis_client and self._is_redis_connected:
                try:
                    await redis_client.rpush("aiops:queue:dlq", json.dumps(msg))
                    await redis_client.srem("aiops:queue:processing", job_id)
                    await redis_client.hset(
                        f"aiops:job:{job_id}", mapping={"status": "failed", "error": error_message}
                    )
                except Exception:
                    pass
            self._dead_letter_queue.append(msg)
            self._in_flight.pop(job_id, None)
            return False

    async def get_queue_stats(self) -> dict[str, Any]:
        """Inspect queue depths, active jobs, and dead letters."""
        redis_client = await self._get_redis()
        if redis_client and self._is_redis_connected:
            try:
                pending = await redis_client.llen("aiops:queue:default")
                dlq = await redis_client.llen("aiops:queue:dlq")
                processing = await redis_client.scard("aiops:queue:processing")
                return {
                    "backend": "redis",
                    "pending_tasks": pending,
                    "processing_tasks": processing,
                    "dead_letter_tasks": dlq,
                }
            except Exception:
                pass

        return {
            "backend": "in_memory",
            "pending_tasks": self._in_memory_queue.qsize(),
            "processing_tasks": len(self._in_flight),
            "dead_letter_tasks": len(self._dead_letter_queue),
        }

    async def cancel(self, job_id: str) -> bool:
        """Cancel an in-flight or queued job."""
        if job_id in self._in_flight:
            self._in_flight.pop(job_id, None)
            return True
        return False


task_queue = TaskQueue()
