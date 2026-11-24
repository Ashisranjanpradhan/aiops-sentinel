import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.errors import (
    AppError,
    app_error_handler,
    unhandled_error_handler,
    validation_error_handler,
)
from app.core.telemetry_metrics import (
    get_prometheus_metrics_response,
    prometheus_metrics_middleware,
)
from app.db.session import init_db
from app.services.alert_worker import alert_evaluator_worker


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    await init_db()
    # Ensure default admin user exists with admin role
    from app.core.security import hash_password
    from app.db.session import AsyncSessionLocal
    from app.models.entities import User
    from sqlalchemy import select
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(User).where(User.email == "admin@aiops.sentinel"))
            admin_u = result.scalar_one_or_none()
            if admin_u:
                if admin_u.role != "admin":
                    admin_u.role = "admin"
                    await session.commit()
            else:
                new_admin = User(
                    email="admin@aiops.sentinel",
                    display_name="Site Reliability Lead",
                    password_hash=hash_password("SentinelAdmin1234!"),
                    role="admin",
                    is_active=True,
                )
                session.add(new_admin)
                await session.commit()
    except Exception as exc:
        pass
    # Start background alert evaluation daemon (interval 30s)
    alert_evaluator_worker.start(interval_seconds=30)
    try:
        yield
    finally:
        await alert_evaluator_worker.stop()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="AIOps Sentinel - Microservice Observability, Anomaly Detection & RCA Platform",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_request_id_middleware(request: Request, call_next):
    req_id = request.headers.get("X-Request-ID", f"req_{uuid.uuid4().hex[:12]}")
    request.state.request_id = req_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = req_id
    return response


# Register Prometheus Metrics Middleware
app.middleware("http")(prometheus_metrics_middleware)


# Register Exception Handlers
app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(Exception, unhandled_error_handler)


# Prometheus Metrics Scraping Endpoints
@app.get("/metrics", include_in_schema=False)
@app.get(f"{settings.API_V1_PREFIX}/metrics", include_in_schema=False)
def metrics():
    return get_prometheus_metrics_response()


# Include API Router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
