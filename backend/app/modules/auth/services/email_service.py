"""
Email service — SMTP-based password reset email sending.
"""

import smtplib
from email.mime.text import MIMEText

from app.core.config import SMTP_EMAIL, SMTP_PASSWORD, SMTP_HOST, SMTP_PORT


def send_reset_email(to_email: str, link: str) -> None:
    """Send a password-reset email to the given address."""
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        raise RuntimeError(
            "SMTP is not configured (SMTP_EMAIL / SMTP_PASSWORD missing)"
        )

    body = (
        "Click the link to reset your password:\n\n"
        f"{link}\n\n"
        "If you didn't request this, ignore this email."
    )

    msg = MIMEText(body)
    msg["Subject"] = "Hotel System Password Reset"
    msg["From"] = SMTP_EMAIL
    msg["To"] = to_email

    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
    try:
        server.ehlo()     # introduce client to server
        server.starttls()   # data encrypted using this
        server.ehlo()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.sendmail(SMTP_EMAIL, [to_email], msg.as_string())
    finally:
        server.quit()


def send_2fa_email(to_email: str, code: str) -> None:
    """Send a 2-factor authentication code email to the given address."""
    print(f"[2FA-email] Attempting to send OTP to {to_email}")

    if not SMTP_EMAIL or not SMTP_PASSWORD:
        print("[2FA-email] WARN: SMTP is not configured (SMTP_EMAIL or SMTP_PASSWORD missing). OTP code:", code)
        return

    body = (
        "Your Verification Code is:\n\n"
        f"{code}\n\n"
        "Please use this code to complete your 2FA setup.\n"
        "This code expires in 10 minutes."
    )

    msg = MIMEText(body)
    msg["Subject"] = "Hotel System 2FA Code"
    msg["From"] = SMTP_EMAIL
    msg["To"] = to_email

    try:
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.sendmail(SMTP_EMAIL, [to_email], msg.as_string())
        server.quit()
        print(f"[2FA-email] SUCCESS: OTP sent to {to_email}")
    except smtplib.SMTPAuthenticationError as e:
        print(f"[2FA-email] ERROR: SMTP authentication failed: {e}")
        raise RuntimeError(f"SMTP authentication failed: {e}") from e
    except smtplib.SMTPException as e:
        print(f"[2FA-email] ERROR: SMTP error while sending to {to_email}: {e}")
        raise RuntimeError(f"SMTP error: {e}") from e
    except Exception as e:
        print(f"[2FA-email] ERROR: Unexpected error while sending to {to_email}: {e}")
        raise RuntimeError(f"Email sending failed: {e}") from e


# send an email when user enable email notifications
def send_notification_email(to_email: str, title: str, message: str) -> None:
    """Send a general notification email to the given address."""
    # Checks whether email credentials are available
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        print("[email-notif] SMTP is not configured, skipping notification email:", title)
        return

    try:
        body = (
            f"{title}\n\n"
            f"{message}\n\n"
            "You are receiving this email because you have email notifications enabled."
        )

        msg = MIMEText(body, "plain", "utf-8")
        msg["Subject"] = f"ReviewHub Notification: {title}"
        msg["From"] = SMTP_EMAIL
        msg["To"] = to_email

        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        try:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, [to_email], msg.as_string())
            print(f"[email-notif] ✓ Email delivered to {to_email} — {title}")
        finally:
            server.quit()
    except Exception as e:
        print(f"[email-notif] ✗ SMTP error sending to {to_email}: {e}")

