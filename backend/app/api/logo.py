from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.models.models import User
from app.services.logo_service import LogoService

router = APIRouter(prefix="/logo", tags=["Logo Microservice"])

class LogoFixRequest(BaseModel):
    logo: Optional[str] = None

class LogoFixResponse(BaseModel):
    success: bool
    mime_type: str
    data_uri: str
    width: int
    height: int
    cid_reference: str
    img_html_tag: str

@router.post("/fix", response_model=LogoFixResponse)
def fix_logo(payload: LogoFixRequest):
    """
    Microservice endpoint to fix broken, SVG, or unhosted logos.
    Converts input into a standardized, email-compatible 32-bit PNG.
    """
    processed = LogoService.process_and_fix_logo(payload.logo)
    
    img_html = f'<img src="{processed["data_uri"]}" width="{processed["width"]}" height="{processed["height"]}" alt="Company Logo" style="display:block; border:0; outline:none; text-decoration:none; max-width:240px; height:auto;" />'
    
    return {
        "success": processed["success"],
        "mime_type": processed["mime_type"],
        "data_uri": processed["data_uri"],
        "width": processed["width"],
        "height": processed["height"],
        "cid_reference": processed["cid_reference"],
        "img_html_tag": img_html
    }

@router.get("/render/{user_id}.png")
def render_user_logo(user_id: str, db: Session = Depends(get_db)):
    """
    Hosted Image Proxy endpoint. Serves the user's fixed company logo directly
    as a raw image/png file for email client HTTP compatibility.
    """
    user = db.query(User).filter(User.id == user_id).first()
    raw_logo = user.company_logo if user else None
    
    processed = LogoService.process_and_fix_logo(raw_logo)
    png_bytes = processed["png_bytes"]

    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={
            "Cache-Control": "public, max-age=86400",
            "Content-Disposition": f'inline; filename="logo_{user_id[:8]}.png"'
        }
    )
