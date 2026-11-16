from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.response import make_response
from app.db.session import get_db
from app.models.entities import User
from app.services.topology_service import topology_service

router = APIRouter(prefix="/topology", tags=["Topology"])


@router.get("")
async def get_topology(
    environment: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    topology = await topology_service.get_topology(db, environment=environment)
    return make_response(topology.model_dump())
