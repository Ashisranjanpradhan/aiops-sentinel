from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_analyst, get_current_user
from app.core.response import make_response
from app.db.session import get_db
from app.models.entities import User
from app.schemas.domain import ExperimentRunCreate
from app.services.experiment_service import experiment_service

router = APIRouter(prefix="/experiments", tags=["Experiments"])


@router.get("")
async def list_experiments(
    model_name: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    runs, total = await experiment_service.list_experiments(
        db=db, model_name=model_name, status=status_filter, page=page, page_size=page_size
    )
    return make_response(
        [r.model_dump() for r in runs], page=page, page_size=page_size, total=total
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_experiment(
    payload: ExperimentRunCreate,
    current_user: User = Depends(get_current_analyst),
    db: AsyncSession = Depends(get_db),
):
    run = await experiment_service.create_experiment(db, payload)
    detail = await experiment_service.get_experiment(db, run.id)
    return make_response(detail.model_dump())


@router.get("/{run_id}")
async def get_experiment(
    run_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    detail = await experiment_service.get_experiment(db, run_id)
    return make_response(detail.model_dump())
