"""
Main entry point for the FastAPI application.
Configures CORS, registers router routes, handles startup/shutdown lifecycle,
and exposes security/healthcheck APIs.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import get_settings
from app.api.auth import router as auth_router
from app.api.workflows import router as workflows_router
from app.api.crm import router as crm_router
from app.api.employees import router as employees_router
from app.api.inventory import router as inventory_router
from app.api.accounting import router as accounting_router
from app.api.reports import router as reports_router
from app.api.booking import router as booking_router
from app.api.billing import router as billing_router
from app.api.audit_logs import router as audit_router
from app.api.shop import router as shop_router
from app.db.session import Base, engine

# Import all models to ensure SQLAlchemy registers them on Base.metadata
from app.models.user import User  # noqa: F401
from app.models.refresh_token import RefreshToken  # noqa: F401
from app.models.crm import Lead  # noqa: F401
from app.models.workflow import Workflow, Trigger, Action  # noqa: F401
from app.models.inventory import Product  # noqa: F401
from app.models.accounting import Transaction  # noqa: F401
from app.models.booking import Booking  # noqa: F401
from app.models.audit_log import AuditLog  # noqa: F401
from app.models.shop import ShopProduct, ShopCart, ShopOrder  # noqa: F401

settings = get_settings()


def create_app() -> FastAPI:
    # Database tables are managed via Alembic migrations.
    # Base.metadata.create_all(bind=engine)

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        debug=settings.DEBUG,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # CORS Middleware configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register Routers
    app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
    app.include_router(workflows_router, prefix="/api/workflows", tags=["Workflows"])
    app.include_router(crm_router, prefix="/api/crm", tags=["CRM"])
    app.include_router(employees_router, prefix="/api/employees", tags=["Employees"])
    app.include_router(inventory_router)
    app.include_router(accounting_router)
    app.include_router(reports_router)
    app.include_router(booking_router)
    app.include_router(billing_router)
    app.include_router(audit_router)
    app.include_router(shop_router)
    @app.get("/health", tags=["Health"])
    def health_check():
        return {
            "status": "healthy",
            "app_name": settings.APP_NAME,
            "version": settings.APP_VERSION,
        }

    return app


app = create_app()
