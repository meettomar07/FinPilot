from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import engine
from app.models import Base
from app.routers import chat, dashboard, decision, forecast, goals, privacy, transactions, upload
from app.routers import settings as settings_router
from app.utils.logging import configure_logging


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging()
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    prefix = settings.api_v1_prefix
    app.include_router(upload.router, prefix=prefix)
    app.include_router(dashboard.router, prefix=prefix)
    app.include_router(transactions.router, prefix=prefix)
    app.include_router(goals.router, prefix=prefix)
    app.include_router(forecast.router, prefix=prefix)
    app.include_router(privacy.router, prefix=prefix)
    app.include_router(decision.router, prefix=prefix)
    app.include_router(chat.router, prefix=prefix)
    app.include_router(settings_router.router, prefix=prefix)

    @app.get("/", tags=["meta"])
    def root() -> dict[str, object]:
        return {
            "name": settings.app_name,
            "version": settings.app_version,
            "status": "ok",
            "docs_url": "/docs",
            "health_url": "/healthz",
            "api_prefix": prefix,
            "message": "Backend is running. Use /api/v1/* endpoints from the frontend.",
        }

    @app.get("/healthz", tags=["health"])
    def healthcheck() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
