from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.response import make_response
from app.db.session import get_db
from app.integrations.telemetry import telemetry_client

router = APIRouter()


@router.get("/health/live")
async def health_live():
    """Process liveness probe."""
    return make_response(
        {
            "status": "alive",
            "service": settings.APP_NAME,
            "timestamp": datetime.now(UTC).isoformat(),
        }
    )


@router.get("/health/ready")
async def health_ready(db: AsyncSession = Depends(get_db)):
    """Database and dependency readiness probe."""
    db_ok = True
    db_msg = "Database connection healthy"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as exc:
        db_ok = False
        db_msg = f"Database unavailable: {exc!s}"

    sources = await telemetry_client.check_health()
    telemetry_summary = {s.name: s.status for s in sources}

    ready = db_ok
    status_str = "ready" if ready else "degraded"

    return make_response(
        {
            "status": status_str,
            "database": {"ok": db_ok, "message": db_msg},
            "telemetry_backends": telemetry_summary,
            "timestamp": datetime.now(UTC).isoformat(),
        }
    )
