from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.api import auth, google, employees, campaigns, templates, logo
from app.models.models import User, Employee, GoogleAccount, EmailTemplate
from app.core.security import hash_password

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Recruiter-focused employee & bulk email management API",
    version="1.0.0"
)

# Allowed CORS origins for local development and production
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://localhost:8000",
    "https://rapid-conect.vercel.app",
]
if settings.FRONTEND_URL and settings.FRONTEND_URL not in allowed_origins:
    allowed_origins.append(settings.FRONTEND_URL.rstrip('/'))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https://rapid-conect(-[a-z0-9-]+)?\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

class SecurityHeadersMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.append((b"x-content-type-options", b"nosniff"))
                headers.append((b"x-frame-options", b"SAMEORIGIN"))
                headers.append((b"x-xss-protection", b"1; mode=block"))
                headers.append((b"referrer-policy", b"strict-origin-when-cross-origin"))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_wrapper)

app.add_middleware(SecurityHeadersMiddleware)

app.include_router(auth.router, prefix="/api")
app.include_router(google.router, prefix="/api")
app.include_router(employees.router, prefix="/api")
app.include_router(campaigns.router, prefix="/api")
app.include_router(templates.router, prefix="/api")
app.include_router(logo.router, prefix="/api")

@app.get("/")
def root_redirect(request: Request):
    """
    Redirects root requests to the Vite frontend (http://localhost:5173 on local),
    forwarding all query parameters like ?connected=true&token=... seamlessly.
    """
    qs = f"?{request.query_params}" if request.query_params else ""
    frontend_base = settings.effective_frontend_url.rstrip('/')
    return RedirectResponse(url=f"{frontend_base}/{qs}")

@app.on_event("startup")
def startup_db_seed():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Database schema initialization warning: {e}")

    # Column additions if needed
    try:
        with engine.connect() as conn:
            for col_sql in [
                "ALTER TABLE users ADD COLUMN company_name VARCHAR DEFAULT 'Rapid Conect'",
                "ALTER TABLE users ADD COLUMN official_email VARCHAR",
                "ALTER TABLE users ADD COLUMN company_logo TEXT"
            ]:
                try:
                    conn.execute(text(col_sql))
                    conn.commit()
                except Exception:
                    pass
    except Exception as e:
        print(f"Table alteration warning: {e}")

    db = SessionLocal()
    try:
        # Seed sample templates if empty
        template_count = db.query(EmailTemplate).count()
        if template_count == 0:
            sample_templates = [
                {
                    "name": "Standard Opportunity Outreach",
                    "category": "General Outreach",
                    "subject": "Following up: {{job_title}} opportunity",
                    "body": "Hi {{employee_name}},\n\nThis is {{loggedin_username}} from {{loggedin_user_company}}. I’m reaching out regarding a Below job opportunity with our client.\n\n{{job_description}}\n\nFor quicker communication regarding this opportunity, could you please share your WhatsApp number, if you’re comfortable doing so?\n\nThanks & Regards,\n{{loggedin_username}}\nEmail: {{official_email}}\n{{company_logo}}"
                },
                {
                    "name": "Direct Client Placement",
                    "category": "Engineering",
                    "subject": "Opportunity — {{job_title}} at {{company_name}}",
                    "body": "Hi {{employee_name}},\n\nThis is {{loggedin_username}} from {{loggedin_user_company}}. We have an active job opportunity matching your background as {{job_title}}.\n\n{{job_description}}\n\nPlease review and let us know if your contact number {{contact_number}} or WhatsApp is best for a brief call.\n\nThanks & Regards,\n{{loggedin_username}}\nEmail: {{official_email}}\n{{company_logo}}"
                }
            ]
            for t_item in sample_templates:
                db.add(EmailTemplate(**t_item))
            db.commit()
    except Exception as e:
        print(f"Startup seeding error: {e}")
    finally:
        db.close()

@app.get("/api/health")
def health_check():
    db_status = "unknown"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"[Health Check] Database probe failed: {e}")
        db_status = "disconnected"
    
    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "app": "Rapid Conect API",
        "database_status": db_status,
        "database_type": "postgresql" if "postgres" in settings.DATABASE_URL else "sqlite"
    }
