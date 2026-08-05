"""
Main entry point for the FastAPI application.
Configures CORS, registers router routes, handles startup/shutdown lifecycle,
and exposes security/healthcheck APIs.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

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
    # Resolve frontend build directory
    frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
    if not frontend_dist.exists():
        frontend_dist = Path("/app/frontend/dist")

    # Shared API info page HTML template
    def get_api_info_html():
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{settings.APP_NAME} - API Service</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {{
            --bg-color: #0B0F19;
            --card-bg: rgba(22, 30, 49, 0.7);
            --border-color: rgba(255, 255, 255, 0.08);
            --text-primary: #F3F4F6;
            --text-secondary: #9CA3AF;
            --primary: #6366F1;
            --primary-hover: #4F46E5;
            --accent: #10B981;
            --accent-glow: rgba(16, 185, 129, 0.2);
        }}

        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}

        body {{
            background-color: var(--bg-color);
            color: var(--text-primary);
            font-family: 'Plus Jakarta Sans', sans-serif;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            overflow-x: hidden;
            position: relative;
        }}

        /* Ambient background glow */
        body::before {{
            content: '';
            position: absolute;
            width: 400px;
            height: 400px;
            background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0,0,0,0) 70%);
            top: 10%;
            left: 10%;
            z-index: -1;
            filter: blur(40px);
        }}

        body::after {{
            content: '';
            position: absolute;
            width: 400px;
            height: 400px;
            background: radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, rgba(0,0,0,0) 70%);
            bottom: 10%;
            right: 10%;
            z-index: -1;
            filter: blur(40px);
        }}

        .container {{
            max-width: 650px;
            width: 90%;
            padding: 2.5rem;
            background: var(--card-bg);
            backdrop-filter: blur(16px);
            border: 1px solid var(--border-color);
            border-radius: 24px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
            text-align: center;
            transition: transform 0.3s ease;
        }}

        .logo-container {{
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.75rem;
            margin-bottom: 1.5rem;
        }}

        .logo-icon {{
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 8px 16px rgba(99, 102, 241, 0.3);
        }}

        .logo-icon svg {{
            width: 22px;
            height: 22px;
            fill: none;
            stroke: white;
            stroke-width: 2;
        }}

        h1 {{
            font-family: 'Outfit', sans-serif;
            font-size: 2.25rem;
            font-weight: 700;
            letter-spacing: -0.025em;
            background: linear-gradient(135deg, #FFFFFF 0%, #D1D5DB 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }}

        .status-badge {{
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: rgba(16, 185, 129, 0.08);
            border: 1px solid rgba(16, 185, 129, 0.2);
            border-radius: 9999px;
            color: var(--accent);
            font-size: 0.875rem;
            font-weight: 600;
            margin-bottom: 2rem;
        }}

        .status-dot {{
            width: 8px;
            height: 8px;
            background-color: var(--accent);
            border-radius: 50%;
            box-shadow: 0 0 12px var(--accent);
            animation: pulse 2s infinite;
        }}

        @keyframes pulse {{
            0% {{ transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }}
            70% {{ transform: scale(1); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }}
            100% {{ transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }}
        }}

        .description {{
            color: var(--text-secondary);
            font-size: 1.05rem;
            line-height: 1.6;
            margin-bottom: 2.5rem;
        }}

        .actions-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.25rem;
            margin-bottom: 2rem;
        }}

        .card {{
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 1.5rem;
            text-decoration: none;
            color: inherit;
            text-align: left;
            transition: all 0.2s ease-in-out;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }}

        .card:hover {{
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(99, 102, 241, 0.4);
            transform: translateY(-2px);
        }}

        .card-title {{
            font-family: 'Outfit', sans-serif;
            font-size: 1.15rem;
            font-weight: 600;
            color: #FFFFFF;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }}

        .card-icon {{
            color: var(--primary);
            transition: transform 0.2s ease;
        }}

        .card:hover .card-icon {{
            transform: translateX(3px);
        }}

        .card-description {{
            font-size: 0.875rem;
            color: var(--text-secondary);
            line-height: 1.4;
        }}

        .health-link {{
            display: inline-flex;
            align-items: center;
            gap: 0.375rem;
            color: var(--text-secondary);
            font-size: 0.875rem;
            text-decoration: none;
            transition: color 0.2s ease;
        }}

        .health-link:hover {{
            color: var(--text-primary);
        }}

        .footer {{
            margin-top: 3rem;
            color: rgba(255, 255, 255, 0.2);
            font-size: 0.75rem;
        }}

        @media (max-width: 600px) {{
            .actions-grid {{
                grid-template-columns: 1fr;
            }}
            .container {{
                padding: 1.75rem;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="logo-container">
            <div class="logo-icon">
                <svg viewBox="0 0 24 24">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <h1>{settings.APP_NAME}</h1>
        </div>

        <div class="status-badge">
            <div class="status-dot"></div>
            API Service Online
        </div>

        <p class="description">
            This is the backend API server for the {settings.APP_NAME} SaaS platform. Frontend services and API clients interact with these endpoints to power automated workflows, CRM, inventory, and more.
        </p>

        <div class="actions-grid">
            <a href="/docs" class="card">
                <div class="card-title">
                    Interactive Docs
                    <span class="card-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </span>
                </div>
                <p class="card-description">Explore and test the API endpoints interactively via Swagger UI.</p>
            </a>
            
            <a href="/redoc" class="card">
                <div class="card-title">
                    ReDoc Docs
                    <span class="card-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </span>
                </div>
                <p class="card-description">Read structured documentation for all schemas and endpoints.</p>
            </a>
        </div>

        <a href="/health" class="health-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
            Check API health status (/health)
        </a>
    </div>

    <div class="footer">
        &copy; 2026 {settings.APP_NAME}. All rights reserved.
    </div>
</body>
</html>"""

    if frontend_dist.exists():
        assets_dir = frontend_dist / "assets"
        if assets_dir.exists():
            app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

        @app.get("/")
        def serve_frontend_index():
            index_path = frontend_dist / "index.html"
            if index_path.exists():
                return FileResponse(str(index_path))
            return HTMLResponse(content=get_api_info_html(), status_code=200)

        @app.get("/api-info", response_class=HTMLResponse, tags=["Root"])
        def read_api_info():
            return HTMLResponse(content=get_api_info_html(), status_code=200)

        @app.get("/{catchall:path}")
        def serve_frontend_fallback(catchall: str):
            # If request starts with API/Docs/Health, let FastAPI return a standard 404
            if (
                catchall.startswith("api/")
                or catchall.startswith("docs")
                or catchall.startswith("redoc")
                or catchall.startswith("health")
            ):
                from fastapi import HTTPException
                raise HTTPException(status_code=404, detail="Not Found")

            # If the path points directly to an existing file in frontend/dist, serve it
            target_file = frontend_dist / catchall
            if target_file.is_file():
                return FileResponse(str(target_file))

            # Default to index.html for SPA router fallback
            index_path = frontend_dist / "index.html"
            if index_path.exists():
                return FileResponse(str(index_path))
            return HTMLResponse(content=get_api_info_html(), status_code=200)
    else:
        @app.get("/", response_class=HTMLResponse, tags=["Root"])
        def read_root():
            return HTMLResponse(content=get_api_info_html(), status_code=200)

    @app.get("/health", tags=["Health"])
    def health_check():
        return {
            "status": "healthy",
            "app_name": settings.APP_NAME,
            "version": settings.APP_VERSION,
        }

    return app


app = create_app()
