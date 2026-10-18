import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Tuple
from app.core.config import settings
from app.core.security import decrypt_token, encrypt_token

class GmailService:
    @staticmethod
    @staticmethod
    def get_authorization_url(state: str = "", redirect_uri: Optional[str] = None) -> str:
        actual_redirect = redirect_uri or settings.effective_redirect_uri
        if not settings.GOOGLE_CLIENT_ID:
            # Fallback mock auth URL for local dev without credentials
            return f"{actual_redirect}?code=mock_oauth_code_12345&state={state}"
        
        scopes = [
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
            "openid"
        ]
        scope_str = "%20".join(scopes)
        return (
            f"https://accounts.google.com/o/oauth2/v2/auth?"
            f"client_id={settings.GOOGLE_CLIENT_ID}&"
            f"redirect_uri={actual_redirect}&"
            f"response_type=code&"
            f"scope={scope_str}&"
            f"access_type=offline&"
            f"prompt=consent&"
            f"state={state}"
        )

    @staticmethod
    def exchange_code_for_tokens(code: str, redirect_uri: Optional[str] = None) -> Tuple[str, str, str, str]:
        """
        Exchanges OAuth authorization code for refresh token, access token, user google_email, and user full name.
        """
        actual_redirect = redirect_uri or settings.effective_redirect_uri
        if code.startswith("mock_") or not settings.GOOGLE_CLIENT_SECRET:
            # Mock mode for seamless local testing
            return "mock_encrypted_refresh_token", "recruiter.demo@gmail.com", "mock_sub_12345", "Sarah Jenkins"

        import httpx
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": actual_redirect,
        }
        resp = httpx.post(token_url, data=data)
        resp_data = resp.json()

        if resp.status_code != 200 or "error" in resp_data:
            err_desc = resp_data.get("error_description") or resp_data.get("error") or resp.text
            raise ValueError(f"Google token exchange failed ({resp.status_code}): {err_desc}")

        access_token = resp_data.get("access_token")
        refresh_token = resp_data.get("refresh_token", "")

        if not access_token:
            raise ValueError("Google OAuth succeeded but no access token was returned.")

        # Get user info from Google OAuth API
        userinfo_resp = httpx.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        if userinfo_resp.status_code != 200:
            raise ValueError(f"Failed to fetch Google profile: {userinfo_resp.text}")

        user_data = userinfo_resp.json()
        email = user_data.get("email")
        if not email:
            raise ValueError("No email address associated with this Google account.")

        full_name = user_data.get("name") or email.split('@')[0].replace('.', ' ').title()
        subject_id = user_data.get("id", "")

        return encrypt_token(refresh_token), email, subject_id, full_name

    @staticmethod
    def create_mime_message(
        sender_email: str,
        to_email: str,
        subject: str,
        body: str,
        company_logo: Optional[str] = None,
        cc: Optional[str] = None,
        bcc: Optional[str] = None
    ) -> MIMEMultipart:
        import re
        import logging
        from email.mime.image import MIMEImage
        from email.mime.text import MIMEText
        from app.services.logo_service import LogoService

        logger = logging.getLogger(__name__)

        message = MIMEMultipart("related")
        message["From"] = sender_email
        message["To"] = to_email
        message["Subject"] = subject

        if cc:
            message["Cc"] = cc
        if bcc:
            message["Bcc"] = bcc

        has_company_logo = bool(company_logo and company_logo.strip())
        logo_len = len(company_logo) if has_company_logo else 0
        logger.info(f"[GmailService] create_mime_message | company_logo exists: {has_company_logo}, length: {logo_len}")

        image_attachment = None

        if has_company_logo and "{{company_logo}}" not in body and "<img" not in body and "data:image" not in body:
            body = body + "\n\n{{company_logo}}"

        # Replace {{company_logo}} placeholder, <img src="{{company_logo}}">, or existing <img src="data:image..."> tags with inline CID image
        if has_company_logo and ("{{company_logo}}" in body or "<img" in body or "data:image" in body):
            processed = LogoService.process_and_fix_logo(company_logo)
            is_success = bool(processed and processed.get("success") and processed.get("png_bytes"))
            png_len = len(processed.get("png_bytes", b"")) if is_success else 0
            w, h = processed.get("width", 0), processed.get("height", 0)

            logger.info(f"[GmailService] LogoService processing success: {is_success}, bytes: {png_len}, size: {w}x{h}")

            if is_success:
                try:
                    image_attachment = MIMEImage(processed["png_bytes"], _subtype="png")
                    image_attachment.add_header("Content-ID", "<company_logo>")
                    image_attachment.add_header("Content-Disposition", "inline", filename="company_logo.png")
                    image_attachment.add_header("X-Attachment-Id", "company_logo")

                    logo_html = f'<img src="cid:company_logo" width="{w}" height="{h}" alt="Company Logo" style="display:block; border:0; outline:none; text-decoration:none; max-width:240px; height:auto; margin-top:12px;" />'

                    if re.search(r'<img[^>]+src=["\'](?:data:image/[^"\']+|http://localhost[^"\']*|http://127\.0\.0\.1[^"\']*|\{\{\s*company_logo\s*\}\})["\'][^>]*>', body, re.IGNORECASE):
                        body = re.sub(r'<img[^>]+src=["\'](?:data:image/[^"\']+|http://localhost[^"\']*|http://127\.0\.0\.1[^"\']*|\{\{\s*company_logo\s*\}\})["\'][^>]*>', logo_html, body, flags=re.IGNORECASE)
                    elif "{{company_logo}}" in body:
                        body = re.sub(r'\{\{\s*company_logo\s*\}\}', logo_html, body, flags=re.IGNORECASE)
                    elif "<img" in body and "cid:company_logo" not in body:
                        body = re.sub(r'<img[^>]+>', logo_html, body, count=1, flags=re.IGNORECASE)

                    logger.info(f"[GmailService] Replaced logo placeholder/tag | cid:company_logo in body: {'cid:company_logo' in body}")
                except Exception as e:
                    logger.error(f"[GmailService] Error creating logo CID attachment: {e}")
                    body = body.replace("{{company_logo}}", "")
            else:
                body = body.replace("{{company_logo}}", "")
        else:
            body = body.replace("{{company_logo}}", "")

        # Clean up any leftover data:image URI tags if any remain
        if "data:image/" in body:
            body = re.sub(r'<img[^>]+src=["\']data:image/[^"\']+["\'][^>]*>', '', body, flags=re.IGNORECASE)

        # Format HTML body
        formatted_html = body.replace("\n", "<br/>")
        formatted_html = re.sub(r'(<img[^>]+>)<br\s*/?>', r'\1', formatted_html, flags=re.IGNORECASE)

        plain_body = re.sub(r"<[^>]+>", "", body)

        html_body = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b; margin: 0; padding: 12px;">
  <div style="max-width: 600px;">
    {formatted_html}
  </div>
</body>
</html>"""

        msg_alt = MIMEMultipart("alternative")
        msg_alt.attach(MIMEText(plain_body, "plain", "utf-8"))
        msg_alt.attach(MIMEText(html_body, "html", "utf-8"))
        message.attach(msg_alt)

        if image_attachment:
            message.attach(image_attachment)

        # Verification metrics logging
        mime_str = message.as_string()
        cid_in_mime = "<company_logo>" in mime_str
        cid_in_html = "cid:company_logo" in html_body
        logger.info(f"[GmailService] Verification | Content-ID <company_logo> in MIME: {cid_in_mime} | cid:company_logo in HTML: {cid_in_html}")

        return message

    @staticmethod
    def send_email_via_gmail_api(
        encrypted_refresh_token: str,
        sender_email: str,
        to_email: str,
        subject: str,
        body: str,
        company_logo: Optional[str] = None,
        cc: Optional[str] = None,
        bcc: Optional[str] = None
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Sends an individual email via Gmail API. Returns (success, provider_message_id_or_error, raw_error).
        """
        import logging
        logger = logging.getLogger(__name__)

        has_logo = bool(company_logo and company_logo.strip())
        logger.info(f"[GmailService pre-call] sending to: {to_email} | company_logo provided: {has_logo} | body contains {{company_logo}}: {'{{company_logo}}' in body} | body contains data:image: {'data:image' in body}")

        # ALWAYS construct and validate the MIME message first before any early returns or sending
        mime_msg = GmailService.create_mime_message(
            sender_email=sender_email,
            to_email=to_email,
            subject=subject,
            body=body,
            company_logo=company_logo,
            cc=cc,
            bcc=bcc
        )

        # Pre-send validation check
        mime_str = mime_msg.as_string()
        if has_logo:
            if "<company_logo>" not in mime_str:
                err_msg = "[GmailService Pre-Send Validation Failed] Final MIME is missing 'Content-ID: <company_logo>' header on attachment!"
                logger.error(err_msg)
                raise ValueError(err_msg)
            if "data:image" in mime_str:
                err_msg = "[GmailService Pre-Send Validation Failed] Final MIME contains invalid 'data:image' URI in HTML body!"
                logger.error(err_msg)
                raise ValueError(err_msg)

        raw_refresh = decrypt_token(encrypted_refresh_token) if encrypted_refresh_token else ""
        if not raw_refresh or raw_refresh.startswith("mock_") or not settings.GOOGLE_CLIENT_SECRET:
            err_msg = (
                "Gmail delivery not performed: No authorized Google Account with a valid OAuth token was found. "
                "Please connect your real Google Account in Settings to authorize Gmail email dispatch."
            )
            logger.error(f"[GmailService] {err_msg}")
            return False, "", err_msg

        try:
            from google.oauth2.credentials import Credentials
            from googleapiclient.discovery import build

            creds = Credentials(
                token=None,
                refresh_token=raw_refresh,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=settings.GOOGLE_CLIENT_ID,
                client_secret=settings.GOOGLE_CLIENT_SECRET
            )

            service = build("gmail", "v1", credentials=creds)
            raw_msg = base64.urlsafe_b64encode(mime_msg.as_bytes()).decode()

            sent_msg = service.users().messages().send(
                userId="me",
                body={"raw": raw_msg}
            ).execute()

            return True, sent_msg.get("id", "gmail_api_success"), None
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "quota" in err_str.lower() or "rate limit" in err_str.lower() or "limitexceeded" in err_str.lower():
                err_str = "Rate Limit Exceeded: Gmail daily email sending quota reached for your Google account."
            return False, "", err_str
