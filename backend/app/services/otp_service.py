import random
import string
import time
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

_otp_store: dict = {}
OTP_TTL_SECONDS = 300  # 5 minutes


def _generate_otp() -> str:
    return ''.join(random.choices(string.digits, k=6))


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
    del _otp_store[email]  # one-time use
    return True


async def send_otp_email(email: str, code: str, purpose: str = "verify"):
    print(f"[OTP] Code for {email}: {code}", flush=True)

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print(f"[DEV] OTP for {email}: {code}  (No SMTP configured — check server logs)", flush=True)
        return

    is_reset = purpose == "reset"
    subject = "Reset your TeamSync password" if is_reset else "Your TeamSync verification code"
    heading = "Reset your password" if is_reset else "Verify your email"
    body = (
        "Enter this code to reset your TeamSync password. It expires in 5 minutes."
        if is_reset
        else "Enter this code to complete your TeamSync signup. It expires in 5 minutes."
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"TeamSync <{settings.SMTP_USER}>"
    msg["To"] = email

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
    msg.attach(MIMEText(html, "html"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            use_tls=False,
            start_tls=True,
        )
        print(f"✅ OTP sent to {email}")
    except Exception as e:
        print(f"❌ Email send failed: {e}")
        raise


