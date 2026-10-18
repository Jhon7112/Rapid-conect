from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import create_access_token
from app.api.auth import get_current_user, get_optional_current_user
from app.models.models import User, GoogleAccount
from app.services.gmail_service import GmailService
from app.core.config import settings

router = APIRouter(prefix="/google", tags=["Google OAuth"])

@router.get("/status")
def get_google_status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    account = db.query(GoogleAccount).filter(
        GoogleAccount.user_id == current_user.id,
        GoogleAccount.status == "connected"
    ).first()

    has_real_token = bool(
        account and
        account.encrypted_refresh_token and
        not account.encrypted_refresh_token.startswith("mock_")
    )

    if not account or not has_real_token:
        return {
            "connected": False,
            "google_email": None,
            "account_id": None,
            "status": "disconnected"
        }

    return {
        "connected": True,
        "google_email": account.google_email,
        "account_id": account.id,
        "status": account.status,
        "connected_at": account.connected_at
    }

def get_request_redirect_uri(request: Request) -> str:
    # If explicitly configured in production without localhost, honor it
    if settings.GOOGLE_REDIRECT_URI and "localhost" not in settings.GOOGLE_REDIRECT_URI:
        return settings.GOOGLE_REDIRECT_URI

    # Infer from incoming request headers
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or "rapid-conect.vercel.app"
    proto = request.headers.get("x-forwarded-proto", "https" if "vercel.app" in host else "http")
    return f"{proto}://{host}/api/google/callback"

def get_request_frontend_url(request: Request) -> str:
    if settings.FRONTEND_URL and "localhost" not in settings.FRONTEND_URL:
        return settings.FRONTEND_URL.rstrip('/')
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or "rapid-conect.vercel.app"
    proto = request.headers.get("x-forwarded-proto", "https" if "vercel.app" in host else "http")
    return f"{proto}://{host}"

@router.get("/connect")
def connect_google(
    request: Request,
    state: Optional[str] = Query(""),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    target_state = state or (current_user.id if current_user else "")
    redirect_uri = get_request_redirect_uri(request)
    url = GmailService.get_authorization_url(state=target_state, redirect_uri=redirect_uri)
    return {"auth_url": url}

@router.get("/callback")
def google_callback(
    request: Request,
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(""),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    frontend_url = get_request_frontend_url(request)
    redirect_uri = get_request_redirect_uri(request)

    import logging
    import urllib.parse
    logger = logging.getLogger(__name__)

    try:
        # Handle Google OAuth rejection / cancellation
        if error:
            logger.error(f"[Google OAuth Callback] Error returned by Google: {error} - {error_description}")
            safe_err = urllib.parse.quote(error_description or error)
            return RedirectResponse(url=f"{frontend_url}/settings?google_error={safe_err}", status_code=302)

        if not code:
            logger.error("[Google OAuth Callback] No authorization code found in request parameters.")
            return RedirectResponse(url=f"{frontend_url}/settings?google_error=Missing+authorization+code", status_code=302)

        # Exchange authorization code using the exact redirect URI
        logger.info(f"[Google OAuth Callback] Exchanging code with redirect_uri={redirect_uri}")
        encrypted_token, google_email, subject_id, full_name = GmailService.exchange_code_for_tokens(code, redirect_uri=redirect_uri)

        user_id = (state or "").strip()
        user = db.query(User).filter(User.id == user_id).first() if user_id else None

        if not user and google_email:
            user = db.query(User).filter(User.email == google_email).first()

        if user:
            if full_name and not user.name:
                user.name = full_name
            if subject_id:
                user.google_user_id = subject_id
        else:
            display_name = full_name or (google_email.split('@')[0].replace('.', ' ').title() if google_email else "Recruiter")
            user = User(
                name=display_name,
                email=google_email,
                google_user_id=subject_id,
                role="Senior Technical Recruiter"
            )
            db.add(user)

        db.commit()
        db.refresh(user)

        # Update or create Google account record
        account = db.query(GoogleAccount).filter(GoogleAccount.user_id == user.id).first()
        if account:
            account.google_email = google_email
            account.google_subject_id = subject_id
            account.encrypted_refresh_token = encrypted_token
            account.status = "connected"
        else:
            account = GoogleAccount(
                user_id=user.id,
                google_email=google_email,
                google_subject_id=subject_id,
                encrypted_refresh_token=encrypted_token,
                status="connected"
            )
            db.add(account)

        db.commit()

        # Generate fresh JWT token for seamless session persistence
        token = create_access_token({"sub": user.id, "email": user.email})

        logger.info(f"[Google OAuth Callback] Successfully authorized and linked Google account for: {google_email}")
        target_path = "/" if state in ("login", "") else "/settings"
        return RedirectResponse(url=f"{frontend_url}{target_path}?connected=true&token={token}", status_code=302)

    except Exception as exc:
        logger.exception(f"[Google OAuth Callback Exception] {exc}")
        safe_msg = urllib.parse.quote(str(exc))
        target_path = "/login" if state == "login" else "/settings"
        return RedirectResponse(url=f"{frontend_url}{target_path}?google_error={safe_msg}", status_code=302)

@router.post("/disconnect")
def disconnect_google(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    accounts = db.query(GoogleAccount).filter(GoogleAccount.user_id == current_user.id).all()
    for acc in accounts:
        acc.status = "disconnected"
    db.commit()
    return {"message": "Google Account disconnected successfully"}
