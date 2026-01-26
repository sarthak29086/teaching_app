# app/email_utils.py
import os
import smtplib
from email.mime.text import MIMEText
from email.utils import formataddr

from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)


def send_otp_email(to_email: str, code: str):
    """
    Sends a simple OTP email.
    In dev, if SMTP isn't configured, just log and return.
    """
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASS:
        print(f"[EMAIL-DEV] Would send OTP {code} to {to_email}, but SMTP not configured.")
        return

    subject = "Your Teaching App OTP"
    body = f"""Hi,

Here is your one-time code for Teaching App:

    {code}

This code will expire in about 10 minutes.

If you did not request this, you can ignore this email.

– Teaching App
"""

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = formataddr(("Teaching App", SMTP_FROM))
    msg["To"] = to_email

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_FROM, [to_email], msg.as_string())
        print(f"[EMAIL] OTP {code} sent to {to_email}")
    except Exception as e:
        # Don't crash auth flow if email fails; just log it.
        print(f"[EMAIL-ERROR] Failed to send OTP to {to_email}: {e}")
