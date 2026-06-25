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

    # Professional HTML email body — proper formatting avoids spam filters
    html_body = f"""\
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background-color:#f4f4f7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0"
             style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">ReviewMate</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;">
            <p style="margin:0 0 12px;color:#374151;font-size:16px;">Hello,</p>
            <p style="margin:0 0 24px;color:#374151;font-size:16px;">
              Use the verification code below to complete your sign-in. This code is valid for <strong>10 minutes</strong>.
            </p>
            <!-- OTP Code Box -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <div style="display:inline-block;background-color:#F3F4F6;border:2px dashed #4F46E5;border-radius:10px;padding:18px 48px;margin:8px 0 24px;">
                  <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#1F2937;font-family:'Courier New',monospace;">{code}</span>
                </div>
              </td></tr>
            </table>
            <p style="margin:0 0 8px;color:#6B7280;font-size:14px;">
              If you did not request this code, you can safely ignore this email. Someone may have entered your email address by mistake.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:#F9FAFB;padding:20px 32px;text-align:center;border-top:1px solid #E5E7EB;">
            <p style="margin:0;color:#9CA3AF;font-size:12px;">&copy; 2026 ReviewMate. All rights reserved.</p>
            <p style="margin:4px 0 0;color:#9CA3AF;font-size:12px;">This is an automated message — please do not reply.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    plain_body = (
        f"Your ReviewMate verification code is: {code}\n\n"
        "This code expires in 10 minutes.\n"
        "If you did not request this, please ignore this email."
    )

    # Build a multipart message (HTML + plain text fallback)
    from email.mime.multipart import MIMEMultipart
    from email.utils import formataddr, formatdate, make_msgid

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Your ReviewMate verification code: {code}"
    msg["From"] = formataddr(("ReviewMate", SMTP_EMAIL))
    msg["To"] = to_email
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain="reviewmate.app")
    msg["Reply-To"] = SMTP_EMAIL

    # Attach plain text first, then HTML (email clients prefer the last part)
    msg.attach(MIMEText(plain_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
    try:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.sendmail(SMTP_EMAIL, [to_email], msg.as_string())
        print(f"[2FA-email] SUCCESS: OTP sent to {to_email}")
    except Exception as e:
        print(f"[2FA-email] ERROR: Unexpected error while sending to {to_email}: {e}")
        raise RuntimeError(f"Email sending failed: {e}") from e
    finally:
        server.quit()


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

