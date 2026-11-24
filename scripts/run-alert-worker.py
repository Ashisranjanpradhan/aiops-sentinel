#!/usr/bin/env python3
"""
scripts/run-alert-worker.py

Production-grade Standalone Alert Evaluation Worker Daemon for AIOps Sentinel.

Features:
- Advisory singleton process locking (prevents split-brain duplicate incident creation).
- Configurable evaluation interval and anti-flapping cooldown.
- Graceful shutdown handling on SIGINT and SIGTERM.
- Structured metrics logging on each cycle.
"""

import argparse
import asyncio
import fcntl
import logging
import os
import signal
import sys
import time
from pathlib import Path

# Add backend directory to sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.db.session import AsyncSessionLocal
from app.services.alert_worker import AlertEvaluatorWorker, DistributedAdvisoryLock

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("aiops.alert_daemon")

LOCK_FILE_PATH = str(REPO_ROOT / ".alert_worker.lock")


async def run_daemon(interval_seconds: int, cooldown_seconds: int):
    worker = AlertEvaluatorWorker(cooldown_seconds=cooldown_seconds)
    stop_event = asyncio.Event()

    def signal_handler(signum, frame):
        logger.info("Received termination signal %s. Initiating graceful shutdown...", signum)
        stop_event.set()

    # Register OS signals
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, lambda s=sig: signal_handler(s, None))
        except NotImplementedError:
            # Fallback for platforms without loop.add_signal_handler
            signal.signal(sig, signal_handler)

    logger.info(
        "AlertEvaluatorWorker daemon started [interval=%ds, cooldown=%ds, pid=%d]",
        interval_seconds,
        cooldown_seconds,
        os.getpid(),
    )

    cycle = 0
    while not stop_event.is_set():
        cycle += 1
        start_time = time.perf_counter()

        try:
            async with AsyncSessionLocal() as db:
                results = await worker.evaluate_once(db)
                duration_ms = (time.perf_counter() - start_time) * 1000.0

                firing_count = sum(1 for r in results if r.get("status") == "firing")
                resolved_count = sum(1 for r in results if r.get("status") == "resolved")

                logger.info(
                    "Cycle #%d completed in %.2fms: %d evaluated, %d firing, %d resolved",
                    cycle,
                    duration_ms,
                    len(results),
                    firing_count,
                    resolved_count,
                )
        except Exception as ex:
            logger.exception("Error in evaluation cycle #%d: %s", cycle, ex)

        # Interruptible sleep
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=interval_seconds)
        except asyncio.TimeoutError:
            pass

    logger.info("Worker evaluation loop terminated. Cleaning up...")
    await worker.stop()
    logger.info("AlertEvaluatorWorker shutdown completed cleanly.")


async def async_main(args):
    lock = DistributedAdvisoryLock(lock_path=LOCK_FILE_PATH)
    async with AsyncSessionLocal() as session:
        acquired = await lock.acquire(db_session=session)
        if not acquired:
            logger.error(
                "Distributed advisory lock held by another active leader replica (path=%s). Exiting standby.",
                LOCK_FILE_PATH,
            )
            sys.exit(1)

        try:
            await run_daemon(args.interval, args.cooldown)
        finally:
            await lock.release(db_session=session)
            logger.info("Distributed advisory lock released.")


def main():
    parser = argparse.ArgumentParser(description="AIOps Sentinel Standalone Alert Worker Daemon")
    parser.add_argument("--interval", type=int, default=15, help="Evaluation interval in seconds (default: 15)")
    parser.add_argument("--cooldown", type=int, default=180, help="Flapping cooldown in seconds (default: 180)")
    args = parser.parse_args()
    asyncio.run(async_main(args))


if __name__ == "__main__":
    main()
