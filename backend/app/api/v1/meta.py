from fastapi import APIRouter

from app.core.config import settings
from app.core.response import make_response

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
