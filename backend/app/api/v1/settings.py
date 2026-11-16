from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.response import make_response
from app.integrations.telemetry import telemetry_client
from app.models.entities import User

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("/sources")
async def get_sources_status(current_user: User = Depends(get_current_user)):
    sources = await telemetry_client.check_health()
    # Masked URLs and safe status without exposing private tokens (Section 7.3 M & 12.1)
    return make_response(
        [
            {
                "id": s.name.lower(),
                "name": s.name,
                "type": s.type,
                "status": s.status,
                "latency_ms": s.latency_ms,
                "configured": True,
                "endpoint": "http://***:***" if s.status == "healthy" else "Not reachable",
                "message": s.message,
            }
            for s in sources
        ]
    )
