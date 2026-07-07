"""
Email service — Brevo HTTP API-based email sending for password reset, 2FA, and notifications.
"""

import requests
from app.core.config import BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME

# Sender display name shown in email clients
SENDER_NAME = BREVO_SENDER_NAME or "ReviewMate"


def _send_via_brevo(to_email: str, subject: str, plain_content: str, html_content: str) -> None:
    """Send transactional email via Brevo REST API v3."""
    if not BREVO_API_KEY:
        raise RuntimeError("Brevo API key is not configured (BREVO_API_KEY is missing)")
    if not BREVO_SENDER_EMAIL:
        raise RuntimeError("Brevo sender email is not configured (BREVO_SENDER_EMAIL is missing)")

    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
    }
    payload = {
        "sender": {
            "name": SENDER_NAME,
            "email": BREVO_SENDER_EMAIL,
        },
        "to": [
            {
                "email": to_email,
            }
        ],
        "subject": subject,
        "htmlContent": html_content,
        "textContent": plain_content,
    }

    response = requests.post(url, json=payload, headers=headers, timeout=10)
    if response.status_code not in (200, 201, 202):
        raise RuntimeError(f"Failed to send email via Brevo API: {response.status_code} - {response.text}")


# ── Password Reset ───────────────────────────────────────────────────

def send_reset_email(to_email: str, link: str) -> None:
    """Send a password-reset email to the given address."""
    if not BREVO_API_KEY or not BREVO_SENDER_EMAIL:
        raise RuntimeError("Brevo is not configured (BREVO_API_KEY / BREVO_SENDER_EMAIL missing)")

    plain = (
        "You requested a password reset for your ReviewMate account.\n\n"
        f"Click the link below to reset your password:\n{link}\n\n"
        "This link expires in 1 hour.\n"
        "If you did not request this, you can safely ignore this email.\n\n"
        "— The ReviewMate Team"
    )

    html = f"""\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Reset your ReviewMate password</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background-color:#f4f4f7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0"
             style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">{SENDER_NAME}</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;">
            <p style="margin:0 0 12px;color:#374151;font-size:16px;">Hello,</p>
            <p style="margin:0 0 24px;color:#374151;font-size:16px;">
              We received a request to reset the password for your {SENDER_NAME} account.
              Click the button below to set a new password.
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding:8px 0 28px;">
                <a href="{link}"
                   style="display:inline-block;background-color:#4F46E5;color:#ffffff;text-decoration:none;
                          font-size:15px;font-weight:600;padding:14px 36px;border-radius:8px;">
                  Reset Password
                </a>
              </td></tr>
            </table>
            <p style="margin:0 0 8px;color:#6B7280;font-size:14px;">
              This link expires in <strong>1 hour</strong>. If you did not request a password reset,
              you can safely ignore this email — your account is unchanged.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:#F9FAFB;padding:20px 32px;text-align:center;border-top:1px solid #E5E7EB;">
            <p style="margin:0;color:#9CA3AF;font-size:12px;">&copy; 2026 {SENDER_NAME}. All rights reserved.</p>
            <p style="margin:4px 0 0;color:#9CA3AF;font-size:12px;">This is an automated security email.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    _send_via_brevo(to_email, f"Reset your {SENDER_NAME} password", plain, html)


# ── Two-Factor Authentication ─────────────────────────────────────────

def send_2fa_email(to_email: str, code: str) -> None:
    """Send a 2-factor authentication code email to the given address."""
    print(f"[2FA-email] Attempting to send OTP to {to_email}")

    if not BREVO_API_KEY or not BREVO_SENDER_EMAIL:
        print("[2FA-email] WARN: Brevo not configured. OTP code:", code)
        return

    plain = (
        f"Your {SENDER_NAME} sign-in verification code is: {code}\n\n"
        "This code expires in 10 minutes.\n"
        "If you did not attempt to sign in, please ignore this email.\n\n"
        f"— The {SENDER_NAME} Team"
    )

    html = f"""\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Your {SENDER_NAME} sign-in code</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background-color:#f4f4f7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0"
             style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">{SENDER_NAME}</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;">
            <p style="margin:0 0 12px;color:#374151;font-size:16px;">Hello,</p>
            <p style="margin:0 0 24px;color:#374151;font-size:16px;">
              Use the verification code below to complete your sign-in.
              This code is valid for <strong>10 minutes</strong>.
            </p>
            <!-- OTP Code Box -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <div style="display:inline-block;background-color:#F3F4F6;border:2px solid #4F46E5;
                            border-radius:10px;padding:18px 48px;margin:8px 0 24px;">
                  <span style="font-size:36px;font-weight:700;letter-spacing:8px;
                               color:#1F2937;font-family:'Courier New',monospace;">{code}</span>
                </div>
              </td></tr>
            </table>
            <p style="margin:0 0 8px;color:#6B7280;font-size:14px;">
              If you did not request this code, you can safely ignore this email.
              Someone may have entered your email address by mistake.
            </p>
            <p style="margin:8px 0 0;color:#6B7280;font-size:13px;">
              For security, never share this code with anyone.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:#F9FAFB;padding:20px 32px;text-align:center;border-top:1px solid #E5E7EB;">
            <p style="margin:0;color:#9CA3AF;font-size:12px;">&copy; 2026 {SENDER_NAME}. All rights reserved.</p>
            <p style="margin:4px 0 0;color:#9CA3AF;font-size:12px;">This is an automated security message — please do not reply.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    try:
        _send_via_brevo(to_email, f"Your {SENDER_NAME} sign-in verification code", plain, html)
        print(f"[2FA-email] SUCCESS: OTP sent to {to_email}")
    except Exception as e:
        print(f"[2FA-email] ERROR sending to {to_email}: {e}")
        raise RuntimeError(f"Email sending failed: {e}") from e


# ── Notification ─────────────────────────────────────────────────────

def send_notification_email(to_email: str, title: str, message: str) -> None:
    """Send a general notification email to the given address."""
    if not BREVO_API_KEY or not BREVO_SENDER_EMAIL:
        print("[email-notif] Brevo is not configured, skipping notification email:", title)
        return

    try:
        plain = (
            f"{title}\n\n"
            f"{message}\n\n"
            "You are receiving this email because you have email notifications enabled.\n"
            f"— The {SENDER_NAME} Team"
        )

        html = f"""\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background-color:#f4f4f7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0"
             style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:24px 32px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">{SENDER_NAME}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 16px;color:#1F2937;font-size:18px;">{title}</h2>
            <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">{message}</p>
            <p style="margin:0;color:#9CA3AF;font-size:13px;">
              You are receiving this because you have email notifications enabled on your account.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color:#F9FAFB;padding:16px 32px;text-align:center;border-top:1px solid #E5E7EB;">
            <p style="margin:0;color:#9CA3AF;font-size:12px;">&copy; 2026 {SENDER_NAME}. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

        _send_via_brevo(to_email, f"{SENDER_NAME}: {title}", plain, html)
        print(f"[email-notif] ✓ Email delivered to {to_email} — {title}")
    except Exception as e:
        print(f"[email-notif] ✗ Brevo API error sending to {to_email}: {e}")
