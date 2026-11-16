from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.response import make_response
from app.db.session import get_db
from app.models.entities import User
from app.services.overview_service import overview_service

router = APIRouter(prefix="/overview", tags=["Overview"])


@router.get("/summary")
async def get_overview_summary(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    summary = await overview_service.get_summary(db)
    return make_response(summary.model_dump())
