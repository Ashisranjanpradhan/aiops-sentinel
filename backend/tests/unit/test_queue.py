import pytest
from app.services.queue_service import TaskQueue


@pytest.mark.asyncio
async def test_task_queue_enqueue_dequeue_ack():
    q = TaskQueue(redis_url="redis://localhost:9999/0")  # Force fallback
    assert await q.enqueue("test_job", {"foo": "bar"}, job_id="job_001") is True

    msg = await q.dequeue(timeout_seconds=0.1)
    assert msg is not None
    assert msg["job_id"] == "job_001"
    assert msg["task_name"] == "test_job"
    assert msg["payload"]["foo"] == "bar"

    await q.ack("job_001")
    stats = await q.get_queue_stats()
    assert stats["processing_tasks"] == 0
    assert stats["pending_tasks"] == 0


@pytest.mark.asyncio
async def test_task_queue_nack_and_dead_letter():
    q = TaskQueue(redis_url="redis://localhost:9999/0")
    await q.enqueue("failing_job", {"attempt": 1}, job_id="job_fail_01", max_retries=2)

    msg = await q.dequeue(timeout_seconds=0.1)
    assert msg is not None

    # First failure -> retry scheduled
    retrying = await q.nack("job_fail_01", "Transient network timeout", retry=True)
    assert retrying is True

    msg2 = await q.dequeue(timeout_seconds=0.1)
    assert msg2 is not None
    assert msg2["retry_count"] == 1

    # Second failure -> retry scheduled
    retrying2 = await q.nack("job_fail_01", "Second timeout", retry=True)
    assert retrying2 is True

    msg3 = await q.dequeue(timeout_seconds=0.1)
    assert msg3 is not None
    assert msg3["retry_count"] == 2

    # Third failure -> max_retries (2) exceeded -> dead letter queue
    dead_lettered = await q.nack("job_fail_01", "Fatal error", retry=True)
    assert dead_lettered is False

    stats = await q.get_queue_stats()
    assert stats["dead_letter_tasks"] == 1
    assert stats["processing_tasks"] == 0


@pytest.mark.asyncio
async def test_task_queue_cancellation():
    q = TaskQueue(redis_url="redis://localhost:9999/0")
    await q.enqueue("cancel_job", {}, job_id="job_cancel_01")
    msg = await q.dequeue(timeout_seconds=0.1)
    assert msg is not None

    cancelled = await q.cancel("job_cancel_01")
    assert cancelled is True
    stats = await q.get_queue_stats()
    assert stats["processing_tasks"] == 0
