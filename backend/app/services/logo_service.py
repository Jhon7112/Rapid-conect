import io
import re
import base64
import logging
import httpx
try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    Image = None
    ImageDraw = None
    ImageFont = None
from typing import Tuple, Optional, Dict, Any

logger = logging.getLogger(__name__)

class LogoService:
    """
    Microservice for fixing broken logos in emails & web receivers.
    Converts SVGs, base64 Data URIs, and unhosted URLs into 100% email-compatible,
    optimized PNG raster images for inline CID MIME embedding and HTTP proxy rendering.
    """

    MAX_WIDTH = 240
    MAX_HEIGHT = 80

    @classmethod
    def process_and_fix_logo(cls, logo_input: Optional[str]) -> Dict[str, Any]:
        """
        Takes raw logo input (Base64 SVG, PNG/JPEG Data URI, or URL)
        and returns a standardized, high-density PNG byte stream, Base64 URI, and CID metadata.
        """
        if not logo_input or not logo_input.strip():
            logger.info("[LogoService] Empty logo input received, returning fallback logo.")
            return cls._generate_fallback_logo("LOGO")

        logo_str = logo_input.strip()

        # Case A: Base64 Data URI or raw SVG / Base64 string
        if logo_str.startswith("data:image/") or logo_str.startswith("<svg") or "base64," in logo_str:
            return cls._process_data_uri_or_svg(logo_str)

        # Case B: HTTP / HTTPS URL
        if logo_str.startswith("http://") or logo_str.startswith("https://"):
            return cls._fetch_and_process_url(logo_str)

        # Case C: Try direct base64 decode (strip any whitespace)
        try:
            clean_b64 = re.sub(r"\s+", "", logo_str)
            raw_bytes = base64.b64decode(clean_b64)
            return cls._process_raw_image_bytes(raw_bytes)
        except Exception as e:
            logger.warning(f"[LogoService] Direct base64 decode failed: {e}. Generating fallback logo.")
            return cls._generate_fallback_logo(logo_str[:12].upper())

    @classmethod
    def _process_data_uri_or_svg(cls, logo_str: str) -> Dict[str, Any]:
        # Check if SVG
        is_svg = "image/svg" in logo_str or logo_str.startswith("<svg")
        
        # Extract base64 payload
        if "base64," in logo_str:
            b64_part = logo_str.split("base64,")[1].strip()
        else:
            b64_part = logo_str if not logo_str.startswith("<svg") else ""

        clean_b64 = re.sub(r"\s+", "", b64_part)

        if is_svg:
            if clean_b64:
                try:
                    svg_bytes = base64.b64decode(clean_b64)
                    svg_text = svg_bytes.decode("utf-8", errors="ignore")
                except Exception as e:
                    logger.warning(f"[LogoService] Failed to decode SVG base64 payload: {e}")
                    svg_text = logo_str
            else:
                svg_text = logo_str

            return cls._convert_svg_to_png(svg_text)

        # Non-SVG base64 (PNG, JPEG, WebP, GIF)
        try:
            img_bytes = base64.b64decode(clean_b64)
            return cls._process_raw_image_bytes(img_bytes)
        except Exception as e:
            logger.warning(f"[LogoService] Failed to decode non-SVG base64 image: {e}")
            return cls._generate_fallback_logo("COMPANY")

    @classmethod
    def _convert_svg_to_png(cls, svg_text: str) -> Dict[str, Any]:
        """
        Converts SVG XML into a high-density PNG using resvg_py or PIL fallback.
        """
        try:
            import resvg_py
            png_bytes = resvg_py.svg_to_bytes(svg_text)
            return cls._process_raw_image_bytes(png_bytes)
        except Exception as e:
            logger.warning(f"[LogoService] resvg_py SVG conversion failed or unavailable: {e}. Using fallback generator.")

        # Parse basic SVG metadata or render visual brand placeholder
        width = cls.MAX_WIDTH
        height = cls.MAX_HEIGHT

        # Extract text or brand title if present in SVG
        text_match = re.search(r'>([^<]{2,30})</text>', svg_text, re.IGNORECASE)
        brand_name = text_match.group(1).strip() if text_match else "COMPANY"

        return cls._generate_fallback_logo(brand_name)

    @classmethod
    def _fetch_and_process_url(cls, url: str) -> Dict[str, Any]:
        import socket
        import ipaddress
        from urllib.parse import urlparse

        try:
            parsed = urlparse(url)
            if parsed.scheme not in ("http", "https"):
                logger.warning(f"[LogoService] Blocked disallowed scheme: {parsed.scheme}")
                return cls._generate_fallback_logo("VENDOR")

            hostname = parsed.hostname
            if not hostname or hostname in ("localhost", "0.0.0.0", "127.0.0.1", "::1", "169.254.169.254"):
                logger.warning(f"[LogoService] Blocked loopback/metadata host: {hostname}")
                return cls._generate_fallback_logo("VENDOR")

            try:
                ip_str = socket.gethostbyname(hostname)
                ip = ipaddress.ip_address(ip_str)
                if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                    logger.warning(f"[LogoService] Blocked private IP: {ip} for {hostname}")
                    return cls._generate_fallback_logo("VENDOR")
            except Exception:
                pass

            resp = httpx.get(
                url,
                timeout=5.0,
                follow_redirects=True,
                headers={"User-Agent": "RapidConect-LogoProxy/1.0"}
            )
            if resp.status_code == 200:
                if len(resp.content) > 5 * 1024 * 1024:
                    logger.warning("[LogoService] Remote image exceeds 5MB limit.")
                    return cls._generate_fallback_logo("VENDOR")

                content_type = resp.headers.get("content-type", "").lower()
                if "svg" in content_type:
                    return cls._convert_svg_to_png(resp.text)
                return cls._process_raw_image_bytes(resp.content)
            else:
                logger.warning(f"[LogoService] URL fetch returned status {resp.status_code} for {url}")
        except Exception as e:
            logger.warning(f"[LogoService] Failed to fetch image URL {url}: {e}")

        return cls._generate_fallback_logo("VENDOR")

    @classmethod
    def _process_raw_image_bytes(cls, img_bytes: bytes) -> Dict[str, Any]:
        """
        Resizes, auto-crops, and formats image to email-optimized 32-bit PNG.
        """
        try:
            image = Image.open(io.BytesIO(img_bytes))
            if image.mode != "RGBA":
                image = image.convert("RGBA")

            # Calculate proportional dimensions
            orig_w, orig_h = image.size
            if orig_w > cls.MAX_WIDTH or orig_h > cls.MAX_HEIGHT:
                ratio = min(cls.MAX_WIDTH / float(orig_w), cls.MAX_HEIGHT / float(orig_h))
                new_w = max(1, int(orig_w * ratio))
                new_h = max(1, int(orig_h * ratio))
                image = image.resize((new_w, new_h), Image.Resampling.LANCZOS)

            output_io = io.BytesIO()
            image.save(output_io, format="PNG", optimize=True)
            png_bytes = output_io.getvalue()
            b64_png = base64.b64encode(png_bytes).decode("utf-8")

            return {
                "success": True,
                "mime_type": "image/png",
                "png_bytes": png_bytes,
                "data_uri": f"data:image/png;base64,{b64_png}",
                "width": image.width,
                "height": image.height,
                "cid_reference": "cid:company_logo"
            }
        except Exception as e:
            logger.warning(f"[LogoService] PIL image processing failed: {e}")
            return cls._generate_fallback_logo("LOGO")

    @classmethod
    def _generate_fallback_logo(cls, text: str) -> Dict[str, Any]:
        """
        Generates a clean, modern raster PNG badge when input is missing or corrupt.
        """
        if Image is None:
            return {
                "success": False,
                "mime_type": "image/png",
                "png_bytes": b"",
                "data_uri": "",
                "width": 1,
                "height": 1,
                "cid_reference": "cid:company_logo"
            }
        width, height = 200, 50
        image = Image.new("RGBA", (width, height), (30, 41, 59, 255)) # Dark slate background
        draw = ImageDraw.Draw(image)

        # Draw left accent bar
        draw.rectangle([0, 0, 8, height], fill=(99, 102, 241, 255)) # Indigo accent bar

        # Draw brand text
        clean_text = text[:18].upper()
        draw.text((22, 16), clean_text, fill=(255, 255, 255, 255))

        output_io = io.BytesIO()
        image.save(output_io, format="PNG")
        png_bytes = output_io.getvalue()
        b64_png = base64.b64encode(png_bytes).decode("utf-8")

        return {
            "success": True,
            "mime_type": "image/png",
            "png_bytes": png_bytes,
            "data_uri": f"data:image/png;base64,{b64_png}",
            "width": width,
            "height": height,
            "cid_reference": "cid:company_logo"
        }

    @classmethod
    def fix_html_email_logos(cls, html_body: str) -> Tuple[str, Optional[Any]]:
        """
        Scans an HTML email body for any logo image tags, data URIs, or broken URLs.
        Fixes the image into a crisp 32-bit PNG, returns (updated_html, mime_image_attachment).
        """
        import re
        from email.mime.image import MIMEImage

        if not html_body:
            return html_body, None

        img_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>', html_body, re.IGNORECASE)
        
        image_attachment = None
        updated_html = html_body

        if img_match:
            raw_src = img_match.group(1)
            processed = cls.process_and_fix_logo(raw_src)

            if processed and processed.get("png_bytes"):
                try:
                    image_attachment = MIMEImage(processed["png_bytes"], _subtype="png")
                    image_attachment.add_header("Content-ID", "<company_logo>")
                    image_attachment.add_header("Content-Disposition", "inline", filename="company_logo.png")
                    image_attachment.add_header("X-Attachment-Id", "company_logo")

                    styled_img_tag = f'<img src="cid:company_logo" width="{processed["width"]}" height="{processed["height"]}" alt="Company Logo" style="display:block; border:0; outline:none; text-decoration:none; max-width:240px; height:auto; margin-top:12px;" />'

                    updated_html = re.sub(
                        r'<img[^>]+src=["\'][^"\']+["\'][^>]*>',
                        styled_img_tag,
                        updated_html,
                        count=1,
                        flags=re.IGNORECASE
                    )
                except Exception as e:
                    logger.error(f"[LogoService] Error creating CID attachment in fix_html_email_logos: {e}")

        return updated_html, image_attachment
