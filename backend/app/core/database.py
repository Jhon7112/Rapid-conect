import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Clean Prisma/Node specific query parameters not accepted by libpq/psycopg
db_url = db_url.replace("?pgbouncer=true", "").replace("&pgbouncer=true", "")

# Ensure environments use the Supabase Transaction Pooler (port 6543)
if "pooler.supabase.com:5432" in db_url:
    db_url = db_url.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543")

is_sqlite = "sqlite" in db_url
connect_args = {"check_same_thread": False} if is_sqlite else {
    "connect_timeout": 10,
    "application_name": "rapid_conect_api"
}

is_serverless = bool(os.getenv("VERCEL") or os.getenv("VERCEL_URL") or os.getenv("VERCEL_PROJECT_PRODUCTION_URL"))

engine_kwargs = {
    "connect_args": connect_args
}

if not is_sqlite:
    if is_serverless:
        from sqlalchemy.pool import NullPool
        engine_kwargs["poolclass"] = NullPool
    else:
        engine_kwargs.update({
            "pool_pre_ping": True,
            "pool_recycle": 300,
            "pool_timeout": 10,
            "pool_size": 5,
            "max_overflow": 10
        })

engine = create_engine(db_url, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
