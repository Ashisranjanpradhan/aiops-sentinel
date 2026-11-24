from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.response import make_response
from app.db.session import get_db

router = APIRouter()


@router.get("/meta")
async def get_metadata():
    """Application version and feature availability metadata."""
    return make_response(
        {
            "app_name": settings.APP_NAME,
            "app_env": settings.APP_ENV,
            "api_version": "v1.0.0",
            "demo_mode": settings.DEMO_MODE,
            "supported_features": [
                "anomaly_detection",
                "rca_localization",
                "service_topology",
                "telemetry_correlation",
                "experiment_registry",
                "dataset_governance",
                "alert_policies",
            ],
            "roadmap_features": ["DeployGuard", "ArchMind", "ControlledRemediation"],
        }
    )


@router.post("/meta/seed-demo")
async def seed_demo_endpoint(
    force: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """Seed demo microservices, topology, incidents, alerts, experiments, and assessments."""
    from app.services.seed_service import seed_demo_data

    result = await seed_demo_data(db, force=force)
    return make_response(result)
