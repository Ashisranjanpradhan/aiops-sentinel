from fastapi import APIRouter

from app.api.v1 import (
    alerts,
    assessments,
    auth,
    contact,
    datasets,
    deployments,
    experiments,
    health,
    incidents,
    investigations,
    meta,
    overview,
    profile,
    remediations,
    services,
    settings,
    topology,
)

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(meta.router)
api_router.include_router(auth.router)
api_router.include_router(overview.router)
api_router.include_router(services.router)
api_router.include_router(topology.router)
api_router.include_router(incidents.router)
api_router.include_router(investigations.router)
api_router.include_router(deployments.router)
api_router.include_router(experiments.router)
api_router.include_router(datasets.router)
api_router.include_router(alerts.router)
api_router.include_router(settings.router)
api_router.include_router(profile.router)
api_router.include_router(assessments.router)
api_router.include_router(remediations.router)
api_router.include_router(contact.router)
