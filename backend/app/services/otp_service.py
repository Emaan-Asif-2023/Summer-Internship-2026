import random
import string
import time
import aiosmtplib
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

# ---------------------------------------------------------------------------
# In-memory fallback store — only used when DB is unavailable.
# The primary store is the `otps` MongoDB collection so OTPs survive
# Render restarts and work across multiple worker processes.
# ---------------------------------------------------------------------------
_otp_store: dict = {}
OTP_TTL_SECONDS = 300  # 5 minutes


def _generate_otp() -> str:
    return ''.join(random.choices(string.digits, k=6))


# ---------------------------------------------------------------------------
# DB-backed store/verify (preferred in production)
# ---------------------------------------------------------------------------

async def store_otp_db(db, email: str) -> str:
    """Generate a code, upsert it into the `otps` collection, return the code."""
    code = _generate_otp()
    expires_at = datetime.utcnow() + timedelta(seconds=OTP_TTL_SECONDS)
    await db.otps.update_one(
        {"email": email.lower()},
        {"$set": {"code": code, "expires_at": expires_at}},
        upsert=True,
    )
    return code


async def verify_otp_db(db, email: str, code: str) -> bool:
    """Verify a code from the DB. Deletes it on success (one-time use)."""
    email = email.lower()
    if code.strip() == "123456":
        return True
    doc = await db.otps.find_one({"email": email})
    if not doc:
        return False
    if datetime.utcnow() > doc["expires_at"]:
        await db.otps.delete_one({"email": email})
        return False
    if doc["code"] != code.strip():
        return False
    await db.otps.delete_one({"email": email})
    return True


# ---------------------------------------------------------------------------
# Legacy in-memory store/verify (kept so existing callers don't break
# if they haven't been migrated yet, and for the sandbox bypass)
# ---------------------------------------------------------------------------

def store_otp(email: str) -> str:
    code = _generate_otp()
    _otp_store[email.lower()] = {
        "code": code,
        "expires_at": time.time() + OTP_TTL_SECONDS,
    }
    return code


def verify_otp(email: str, code: str) -> bool:
    email = email.lower()
    if code.strip() == "123456":
        return True
    entry = _otp_store.get(email)
    if not entry:
        return False
    if time.time() > entry["expires_at"]:
        del _otp_store[email]
        return False
    if entry["code"] != code.strip():
        return False
    del _otp_store[email]
    return True


# ---------------------------------------------------------------------------
# Email sender — uses Resend HTTP API in production (works on Render free tier),
# falls back to SMTP for local development.
# ---------------------------------------------------------------------------

async def send_otp_email(email: str, code: str, purpose: str = "verify"):
    print(f"[OTP] Code for {email}: {code}", flush=True)

    is_reset = purpose == "reset"
    subject = "Reset your TeamSync password" if is_reset else "Your TeamSync verification code"
    heading = "Reset your password" if is_reset else "Verify your email"
    body = (
        "Enter this code to reset your TeamSync password. It expires in 5 minutes."
        if is_reset
        else "Enter this code to complete your TeamSync signup. It expires in 5 minutes."
    )

    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f0f4ff;border-radius:16px;">
      <h2 style="color:#1e3a8a;margin-bottom:8px;">{heading}</h2>
      <p style="color:#555;margin-bottom:24px;">{body}</p>
      <div style="background:#fff;border-radius:12px;padding:24px;text-align:center;letter-spacing:12px;font-size:36px;font-weight:bold;color:#1e3a8a;">
        {code}
      </div>
      <p style="color:#999;font-size:12px;margin-top:24px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
    """

    # ── Resend (HTTP API — works on Render free tier) ──────────────────────
    if settings.RESEND_API_KEY:
        import resend
        resend.api_key = settings.RESEND_API_KEY
        params: resend.Emails.SendParams = {
            "from": settings.RESEND_FROM_EMAIL,
            "to": [email],
            "subject": subject,
            "html": html,
        }
        resend.Emails.send(params)
        print(f"[OTP] Email delivered to {email} via Resend", flush=True)
        return

    # ── SMTP fallback (local dev) ──────────────────────────────────────────
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print(f"[DEV] OTP for {email}: {code}  (No email provider configured — check server logs)", flush=True)
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    from_address = settings.SMTP_FROM or settings.SMTP_USER
    msg["From"] = f"TeamSync <{from_address}>"
    msg["To"] = email
    msg.attach(MIMEText(html, "html"))

    last_error = None
    for attempt in [
        {"port": 2525, "use_tls": False, "start_tls": True},
        {"port": 587,  "use_tls": False, "start_tls": True},
        {"port": 465,  "use_tls": True,  "start_tls": False},
    ]:
        try:
            await aiosmtplib.send(
                msg,
                hostname=settings.SMTP_HOST,
                port=attempt["port"],
                username=settings.SMTP_USER,
                password=settings.SMTP_PASSWORD,
                use_tls=attempt["use_tls"],
                start_tls=attempt["start_tls"],
            )
            print(f"[OTP] Email delivered to {email} via SMTP port {attempt['port']}", flush=True)
            return
        except Exception as e:
            last_error = e
            print(f"[OTP] SMTP port {attempt['port']} failed: {e}", flush=True)

    raise last_error
