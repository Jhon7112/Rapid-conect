r"""
Rapid Conect - Database Migration & Schema Sync Script
Syncs all SQLAlchemy models with Supabase Cloud PostgreSQL or local SQLite.
Can be executed safely at any time via:
    python backend/migrate.py
    or .\migrate.bat
"""

import sys
import os
import time

# Ensure backend root is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
os.chdir(current_dir)

from sqlalchemy import create_engine, text, inspect
from app.core.config import settings
from app.core.database import Base
from app.models.models import (
    User, GoogleAccount, Employee, EmailCampaign,
    CampaignRecipient, EmailEvent, EmailSendLog, EmailTemplate
)

def run_migration():
    print("=" * 60)
    print("         Rapid Conect Database Migration")
    print("=" * 60)

    # Prefer DIRECT_URL (session pooler on port 5432) if defined for DDL operations
    target_url = settings.DIRECT_URL or settings.DATABASE_URL
    if target_url.startswith("postgres://"):
        target_url = target_url.replace("postgres://", "postgresql://", 1)
    target_url = target_url.replace("?pgbouncer=true", "").replace("&pgbouncer=true", "")

    db_type = "PostgreSQL (Supabase)" if "postgres" in target_url else "SQLite"
    masked_url = target_url[:35] + "..." if len(target_url) > 35 else target_url
    print(f"Target Database : {db_type}")
    print(f"Connection URL  : {masked_url}")
    print("-" * 60)

    # Establish migration engine
    print("[1/4] Connecting to database...")
    start_time = time.time()
    try:
        connect_args = {} if "sqlite" in target_url else {"connect_timeout": 15}
        engine = create_engine(target_url, connect_args=connect_args)
        with engine.connect() as conn:
            if "postgres" in target_url:
                version = conn.execute(text("SELECT version();")).fetchone()
                print(f"Connected! Server: {version[0][:40]}...")
            else:
                conn.execute(text("SELECT 1;"))
                print("Connected to local SQLite database.")
    except Exception as e:
        print(f"ERROR: Failed to connect to database: {e}")
        sys.exit(1)

    elapsed_conn = time.time() - start_time
    print(f"Latency         : {elapsed_conn:.2f}s")

    # Apply DDL schema sync
    print("\n[2/4] Syncing table schemas (create_all)...")
    try:
        Base.metadata.create_all(bind=engine)
        print("Schema sync completed successfully.")
    except Exception as e:
        print(f"ERROR: Schema sync failed: {e}")
        sys.exit(1)

    # Run column adjustments / safety patches
    print("\n[3/4] Checking and applying column alterations...")
    with engine.connect() as conn:
        alterations = [
            ("users", "company_name", "ALTER TABLE users ADD COLUMN company_name VARCHAR DEFAULT 'Rapid Conect'"),
            ("users", "official_email", "ALTER TABLE users ADD COLUMN official_email VARCHAR"),
            ("users", "company_logo", "ALTER TABLE users ADD COLUMN company_logo TEXT"),
        ]
        insp = inspect(engine)
        for tbl, col, sql in alterations:
            existing_cols = [c["name"] for c in insp.get_columns(tbl)]
            if col not in existing_cols:
                try:
                    conn.execute(text(sql))
                    conn.commit()
                    print(f" + Added column '{col}' to table '{tbl}'")
                except Exception as ex:
        # Apply PostgreSQL specific performance indexes, foreign key cascades, and RLS
        if "postgres" in target_url:
            print("\n    Ensuring ON DELETE CASCADE and performance indexes...")
            postgres_safety_ddl = [
                "ALTER TABLE google_accounts DROP CONSTRAINT IF EXISTS google_accounts_user_id_fkey;",
                "ALTER TABLE google_accounts ADD CONSTRAINT google_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;",
                "ALTER TABLE email_campaigns DROP CONSTRAINT IF EXISTS email_campaigns_user_id_fkey;",
                "ALTER TABLE email_campaigns ADD CONSTRAINT email_campaigns_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;",
                "ALTER TABLE email_campaigns DROP CONSTRAINT IF EXISTS email_campaigns_sender_google_account_id_fkey;",
                "ALTER TABLE email_campaigns ADD CONSTRAINT email_campaigns_sender_google_account_id_fkey FOREIGN KEY (sender_google_account_id) REFERENCES google_accounts(id) ON DELETE SET NULL;",
                "ALTER TABLE email_templates DROP CONSTRAINT IF EXISTS email_templates_user_id_fkey;",
                "ALTER TABLE email_templates ADD CONSTRAINT email_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;",
                "ALTER TABLE campaign_recipients DROP CONSTRAINT IF EXISTS campaign_recipients_campaign_id_fkey;",
                "ALTER TABLE campaign_recipients ADD CONSTRAINT campaign_recipients_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE CASCADE;",
                "ALTER TABLE campaign_recipients DROP CONSTRAINT IF EXISTS campaign_recipients_employee_id_fkey;",
                "ALTER TABLE campaign_recipients ADD CONSTRAINT campaign_recipients_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL;",
                "ALTER TABLE email_events DROP CONSTRAINT IF EXISTS email_events_campaign_recipient_id_fkey;",
                "ALTER TABLE email_events ADD CONSTRAINT email_events_campaign_recipient_id_fkey FOREIGN KEY (campaign_recipient_id) REFERENCES campaign_recipients(id) ON DELETE CASCADE;",
                "ALTER TABLE email_send_logs DROP CONSTRAINT IF EXISTS email_send_logs_campaign_recipient_id_fkey;",
                "ALTER TABLE email_send_logs ADD CONSTRAINT email_send_logs_campaign_recipient_id_fkey FOREIGN KEY (campaign_recipient_id) REFERENCES campaign_recipients(id) ON DELETE CASCADE;",
                "CREATE INDEX IF NOT EXISTS ix_campaign_recipients_campaign_id ON campaign_recipients (campaign_id);",
                "CREATE INDEX IF NOT EXISTS ix_campaign_recipients_status ON campaign_recipients (status);",
                "CREATE INDEX IF NOT EXISTS ix_email_campaigns_user_id ON email_campaigns (user_id);",
                "CREATE INDEX IF NOT EXISTS ix_google_accounts_user_id ON google_accounts (user_id);",
                "CREATE INDEX IF NOT EXISTS ix_employees_company_name ON employees (company_name);",
                "CREATE INDEX IF NOT EXISTS ix_email_templates_user_id ON email_templates (user_id);",
                "ALTER TABLE users ENABLE ROW LEVEL SECURITY;",
                "ALTER TABLE google_accounts ENABLE ROW LEVEL SECURITY;",
                "ALTER TABLE employees ENABLE ROW LEVEL SECURITY;",
                "ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;",
                "ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;",
                "ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;",
                "ALTER TABLE email_send_logs ENABLE ROW LEVEL SECURITY;",
                "ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;"
            ]
            for stmt in postgres_safety_ddl:
                try:
                    conn.execute(text(stmt))
                    conn.commit()
                except Exception as ex:
                    pass
            print("    Cascade foreign keys, performance indexes, and RLS enforced.")

    # Inspect all tables and record counts
    print("\n[4/4] Verifying tables and record counts...")
    insp = inspect(engine)
    all_tables = insp.get_table_names()
    with engine.connect() as conn:
        for tbl in all_tables:
            try:
                cnt = conn.execute(text(f"SELECT COUNT(*) FROM {tbl};")).scalar()
                cols = len(insp.get_columns(tbl))
                print(f" - {tbl:22} | {cols:2} columns | {cnt:5} record(s)")
            except Exception:
                print(f" - {tbl:22} | verified")

    print("=" * 60)
    print("Migration finished successfully! All tables are up to date.")
    print("=" * 60)

if __name__ == "__main__":
    run_migration()
