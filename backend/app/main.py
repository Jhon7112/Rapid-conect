from fastapi import FastAPI
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

# CORS setup for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(google.router, prefix="/api")
app.include_router(employees.router, prefix="/api")
app.include_router(campaigns.router, prefix="/api")
app.include_router(templates.router, prefix="/api")
app.include_router(logo.router, prefix="/api")

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
        # Check if default demo user exists
        user_count = db.query(User).count()
        if user_count == 0:
            demo_user = User(
                name="Namrata Pandey",
                email="namratapandey2327@gmail.com",
                hashed_password=hash_password("reacher123"),
                role="Senior Vendor Procurement Lead",
                company_name="Rapid Conect"
            )
            db.add(demo_user)

            demo_recruiter = User(
                name="Demo Recruiter",
                email="recruiter.demo@gmail.com",
                hashed_password=hash_password("reacher123"),
                role="Senior Technical Recruiter",
                company_name="Rapid Conect"
            )
            db.add(demo_recruiter)
            db.commit()

            # Connect demo Google account
            google_acc = GoogleAccount(
                user_id=demo_user.id,
                google_email="namratapandey2327@gmail.com",
                google_subject_id="demo_sub_9988",
                encrypted_refresh_token="mock_encrypted_refresh_token",
                status="connected"
            )
            db.add(google_acc)
            db.commit()

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
    db_err = None
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = "failed"
        db_err = str(e)
    
    return {
        "status": "ok",
        "app": "Rapid Conect API",
        "database_status": db_status,
        "database_type": "postgresql" if "postgres" in settings.DATABASE_URL else "sqlite",
        "error": db_err
    }
