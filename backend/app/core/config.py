import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Reacher API"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-reacher-key-change-in-production-2026")
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "gX8mU_3-T10A8J_8kL8M_3-T10A8J_8kL8M_3-T10A8=")  # Base64 32-byte key for Fernet
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./reacher.db")

    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI: str = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/google/callback")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    @property
    def effective_redirect_uri(self) -> str:
        # If explicitly set in environment to non-localhost, prefer it
        if self.GOOGLE_REDIRECT_URI and "localhost" not in self.GOOGLE_REDIRECT_URI:
            return self.GOOGLE_REDIRECT_URI
        # Auto-detect Vercel deployment hostname
        vercel_host = os.getenv("VERCEL_PROJECT_PRODUCTION_URL") or os.getenv("VERCEL_URL")
        if vercel_host:
            return f"https://{vercel_host}/api/google/callback"
        return self.GOOGLE_REDIRECT_URI

    @property
    def effective_frontend_url(self) -> str:
        if self.FRONTEND_URL and "localhost" not in self.FRONTEND_URL:
            return self.FRONTEND_URL
        vercel_host = os.getenv("VERCEL_PROJECT_PRODUCTION_URL") or os.getenv("VERCEL_URL")
        if vercel_host:
            return f"https://{vercel_host}"
        return self.FRONTEND_URL

    class Config:
        env_file = ".env"

settings = Settings()
