"""
Email service — SMTP-based email sending for password reset, 2FA, notifications,
subscription confirmations, and broadcast messages.

Anti-spam best practices applied:
  - Proper multipart/alternative with plain-text + HTML
  - Sender display name matching brand
  - Date, Message-ID, MIME-Version headers
  - Message-ID domain matches the FROM email domain (gmail.com)
  - Subject line does NOT contain the OTP code (avoids spam heuristics)
  - X-Mailer header to identify the sender
  - Precedence: transactional header
"""

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, formatdate, make_msgid
from typing import Optional

from app.core.config import SMTP_EMAIL, SMTP_PASSWORD, SMTP_HOST, SMTP_PORT, SMTP_FROM_EMAIL

# Sender display name shown in email clients
SENDER_NAME = "ReviewMate"

# Domain for Message-ID must match SMTP sender domain (gmail.com here)
# Using the actual sending domain prevents Gmail's domain-mismatch spam check
_sender_domain = (SMTP_FROM_EMAIL or "gmail.com").split("@")[-1]


# ── Design tokens ─────────────────────────────────────────────────────────────
# Solid brand colour — no gradient (gradients are stripped by many Outlook builds,
# leaving white text on a white background).

_BRAND      = "#4F46E5"   # Indigo 600 — header, primary button, info accent
_BG         = "#F3F4F6"   # Page background
_CARD_BG    = "#FFFFFF"   # Email card
_TEXT       = "#111827"   # Primary body text
_TEXT_MUTED = "#6B7280"   # Secondary / helper text
_FOOTER_BG  = "#F9FAFB"   # Footer background
_BORDER     = "#E5E7EB"   # Dividers and borders

# Per-notification-type accent colours (left-border stripe, badges, tinted boxes)
_TYPE_COLOR: dict[str, str] = {
    "info":         "#4F46E5",   # Indigo
    "success":      "#16A34A",   # Green
    "warning":      "#D97706",   # Amber
    "error":        "#DC2626",   # Red
    "maintenance":  "#475569",   # Slate
    "announcement": "#7C3AED",   # Violet
}
_TYPE_BG: dict[str, str] = {
    "info":         "#EEF2FF",
    "success":      "#F0FDF4",
    "warning":      "#FFFBEB",
    "error":        "#FEF2F2",
    "maintenance":  "#F8FAFC",
    "announcement": "#F5F3FF",
}
_TYPE_LABEL: dict[str, str] = {
    "info":         "INFO",
    "success":      "SUCCESS",
    "warning":      "WARNING",
    "error":        "ALERT",
    "maintenance":  "MAINTENANCE",
    "announcement": "ANNOUNCEMENT",
}


# ── Shared HTML scaffold helpers ──────────────────────────────────────────────

def _header_html(subtitle: str = "") -> str:
    """Solid-colour brand header. Accepts an optional subtitle line."""
    sub_row = (
        f'<p style="margin:6px 0 0;color:#c7d2fe;font-size:13px;">{subtitle}</p>'
        if subtitle else ""
    )
    return f"""
        <tr>
          <td style="background-color:{_BRAND};padding:26px 32px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;
                       letter-spacing:-0.3px;">{SENDER_NAME}</h1>
            {sub_row}
          </td>
        </tr>"""


def _footer_html(note: str = "This is an automated message.") -> str:
    return f"""
        <tr>
          <td style="background-color:{_FOOTER_BG};padding:20px 32px;
                     text-align:center;border-top:1px solid {_BORDER};">
            <p style="margin:0;color:{_TEXT_MUTED};font-size:12px;">
              &copy; 2026 {SENDER_NAME}. All rights reserved.
            </p>
            <p style="margin:4px 0 0;color:{_TEXT_MUTED};font-size:12px;">{note}</p>
            <p style="margin:6px 0 0;color:{_TEXT_MUTED};font-size:12px;">
              Need help? Contact us at <a href="mailto:support@reviewmate.live" style="color:{_BRAND};text-decoration:none;font-weight:600;">support@reviewmate.live</a>
            </p>
          </td>
        </tr>"""


def _outer_table(inner_rows: str) -> str:
    """Wrap inner rows in the standard outer/card table scaffold."""
    return f"""\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;
             background-color:{_BG};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="background-color:{_BG};padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0"
             style="background-color:{_CARD_BG};border-radius:10px;overflow:hidden;
                    box-shadow:0 2px 10px rgba(0,0,0,0.07);max-width:520px;">
        {inner_rows}
      </table>
    </td></tr>
  </table>
</body>
</html>"""


# ── Core SMTP helpers ─────────────────────────────────────────────────────────

def _build_msg(to_email: str, subject: str, plain: str, html: str) -> MIMEMultipart:
    """Build a properly-headered multipart email message."""
    msg = MIMEMultipart("alternative")
    msg["MIME-Version"] = "1.0"
    msg["Subject"] = subject
    msg["From"] = formataddr((SENDER_NAME, SMTP_FROM_EMAIL))
    msg["To"] = to_email
    msg["Date"] = formatdate(localtime=False)          # UTC date (more consistent)
    msg["Message-ID"] = make_msgid(domain=_sender_domain)
    msg["Reply-To"] = formataddr((SENDER_NAME, SMTP_FROM_EMAIL))
    # Anti-spam: mark as transactional so filters treat it differently from bulk
    msg["Precedence"] = "transactional"
    msg["X-Mailer"] = f"ReviewMate/{SENDER_NAME}"
    # Plain text first, then HTML — clients prefer the last part
    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))
    return msg


def _send(msg: MIMEMultipart, to_email: str) -> None:
    """Open SMTP connection and send the message."""
    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
    try:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.sendmail(SMTP_FROM_EMAIL, [to_email], msg.as_string())
    finally:
        server.quit()


# ── Password Reset ────────────────────────────────────────────────────────────

def send_reset_email(to_email: str, link: str) -> None:
    """Send a password-reset email to the given address."""
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        raise RuntimeError("SMTP is not configured (SMTP_EMAIL / SMTP_PASSWORD missing)")

    plain = (
        "You requested a password reset for your ReviewMate account.\n\n"
        f"Click the link below to reset your password:\n{link}\n\n"
        "This link expires in 1 hour.\n"
        "If you did not request this, you can safely ignore this email.\n\n"
        "— The ReviewMate Team"
    )

    rows = (
        _header_html("Password Reset Request")
        + f"""
        <tr>
          <td style="padding:36px 32px 28px;">
            <p style="margin:0 0 8px;color:{_TEXT};font-size:18px;font-weight:700;">
              Reset Your Password
            </p>
            <p style="margin:0 0 22px;color:{_TEXT_MUTED};font-size:15px;line-height:1.6;">
              We received a request to reset the password for your
              <strong style="color:{_TEXT};">{SENDER_NAME}</strong> account.
              Click the button below to choose a new password.
            </p>

            <!-- CTA button -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding:4px 0 24px;">
                <a href="{link}"
                   style="display:inline-block;background-color:{_BRAND};color:#ffffff;
                          text-decoration:none;font-size:15px;font-weight:600;
                          padding:13px 40px;border-radius:8px;">
                  Reset Password
                </a>
              </td></tr>
            </table>

            <!-- Expiry note -->
            <p style="margin:0 0 18px;color:{_TEXT_MUTED};font-size:13px;text-align:center;">
              This link expires in
              <strong style="color:{_TEXT};">1 hour</strong>
            </p>

            <!-- Warning box — didn't request this -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border:1px solid {_BORDER};border-radius:6px;padding:14px 16px;">
                  <p style="margin:0;color:{_TEXT_MUTED};font-size:13px;line-height:1.6;">
                    <strong style="color:{_TEXT};">Didn't request this?</strong>&nbsp; Your account is safe.
                    Simply ignore this email — your password will remain unchanged.
                    If you're concerned, contact
                    <a href="mailto:{SMTP_FROM_EMAIL}"
                       style="color:{_BRAND};text-decoration:none;font-weight:600;">{SENDER_NAME} support</a>.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>"""
        + _footer_html("This is an automated security email — please do not reply.")
    )

    # Subject does NOT contain the link — keeps it clean for spam filters
    html = _outer_table(rows)
    msg = _build_msg(to_email, f"Reset your {SENDER_NAME} password", plain, html)
    _send(msg, to_email)


# ── Two-Factor Authentication ─────────────────────────────────────────────────

def send_2fa_email(to_email: str, code: str) -> None:
    """Send a 2-factor authentication code email to the given address."""
    print(f"[2FA-email] Attempting to send OTP to {to_email}")

    if not SMTP_EMAIL or not SMTP_PASSWORD:
        print("[2FA-email] WARN: SMTP not configured. OTP code:", code)
        return

    plain = (
        f"Your {SENDER_NAME} sign-in verification code is: {code}\n\n"
        "This code expires in 10 minutes.\n"
        "Never share this code with anyone, including ReviewMate support.\n"
        "If you did not attempt to sign in, please ignore this email.\n\n"
        f"— The {SENDER_NAME} Team"
    )

    # NOTE: OTP code is NOT in the Subject line — subject with digit codes
    # triggers spam heuristics on Gmail, Outlook and Yahoo.
    rows = (
        _header_html("Sign-In Verification")
        + f"""
        <tr>
          <td style="padding:36px 32px 28px;">
            <p style="margin:0 0 8px;color:{_TEXT};font-size:18px;font-weight:700;">
              Your Verification Code
            </p>
            <p style="margin:0 0 24px;color:{_TEXT_MUTED};font-size:15px;line-height:1.6;">
              Use the code below to complete your sign-in to
              <strong style="color:{_TEXT};">{SENDER_NAME}</strong>.
              This code is valid for
              <strong style="color:{_TEXT};">10 minutes</strong>.
            </p>

            <!-- OTP Code box -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding:4px 0 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background-color:#EEF2FF;border:2px solid {_BRAND};
                               border-radius:10px;padding:20px 48px;text-align:center;">
                      <span style="font-size:38px;font-weight:700;letter-spacing:10px;
                                   color:{_TEXT};font-family:'Courier New',monospace;">
                        {code}
                      </span>
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <!-- Security reminders box -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background-color:{_FOOTER_BG};border:1px solid {_BORDER};
                           border-radius:8px;padding:16px 18px;">
                  <p style="margin:0 0 8px;color:{_TEXT};font-size:13px;font-weight:600;">
                    Security reminders
                  </p>
                  <p style="margin:0;color:{_TEXT_MUTED};font-size:13px;line-height:1.75;">
                    &#8226;&nbsp; This code expires in
                      <strong style="color:{_TEXT};">10 minutes</strong><br>
                    &#8226;&nbsp; Never share this code with anyone, including
                      {SENDER_NAME} support<br>
                    &#8226;&nbsp; If you didn't try to sign in, you can safely
                      ignore this email
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>"""
        + _footer_html("This is an automated security message — please do not reply.")
    )

    # Subject: generic wording — no OTP digit in subject (avoids spam triggers)
    html = _outer_table(rows)
    msg = _build_msg(
        to_email,
        f"Your {SENDER_NAME} sign-in verification code",
        plain,
        html,
    )

    try:
        _send(msg, to_email)
        print(f"[2FA-email] SUCCESS: OTP sent to {to_email}")
    except Exception as e:
        print(f"[2FA-email] ERROR sending to {to_email}: {e}")
        raise RuntimeError(f"Email sending failed: {e}") from e


# ── Generic Notification ──────────────────────────────────────────────────────

def send_notification_email(
    to_email: str,
    title: str,
    message: str,
    notification_type: str = "info",
    extra_details: Optional[dict] = None,
) -> None:
    """
    Send a typed notification email with an optional structured details table.

    Parameters
    ----------
    notification_type : str
        One of: info, success, warning, error, maintenance, announcement.
        Controls the left-border accent colour and badge label.
    extra_details : dict | None
        Optional key→value pairs rendered as a summary table beneath the message
        (e.g. {"Plan": "Pro", "Effective": "2026-07-07"}).
    """
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        print("[email-notif] SMTP is not configured, skipping notification email:", title)
        return

    try:
        color = _TYPE_COLOR.get(notification_type, _BRAND)
        bg    = _TYPE_BG.get(notification_type, "#EEF2FF")
        label = _TYPE_LABEL.get(notification_type, "INFO")

        plain = (
            f"{title}\n\n"
            f"{message}\n\n"
            "You are receiving this email because you have email notifications enabled.\n"
            f"— The {SENDER_NAME} Team"
        )

        # Optional structured details table
        details_block = ""
        if extra_details:
            detail_rows = "".join(
                f"""<tr>
                  <td style="padding:7px 0;color:{_TEXT_MUTED};font-size:13px;
                             vertical-align:top;border-top:1px solid {_BORDER};">{k}</td>
                  <td style="padding:7px 0;color:{_TEXT};font-size:13px;
                             font-weight:600;text-align:right;vertical-align:top;
                             border-top:1px solid {_BORDER};">{v}</td>
                </tr>"""
                for k, v in extra_details.items()
            )
            details_block = f"""
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                   style="margin-top:20px;">
              {detail_rows}
            </table>"""

        rows = (
            _header_html()
            + f"""
            <tr>
              <td style="border-left:4px solid {color};padding:32px 32px 28px 28px;">
                <!-- Type badge -->
                <span style="display:inline-block;background-color:{bg};color:{color};
                             font-size:11px;font-weight:700;letter-spacing:0.6px;
                             padding:3px 9px;border-radius:4px;margin-bottom:14px;">
                  {label}
                </span>

                <h2 style="margin:0 0 12px;color:{_TEXT};font-size:17px;font-weight:700;">
                  {title}
                </h2>
                <p style="margin:0;color:{_TEXT_MUTED};font-size:15px;line-height:1.6;">
                  {message}
                </p>

                {details_block}

                <p style="margin:20px 0 0;color:{_TEXT_MUTED};font-size:12px;
                           border-top:1px solid {_BORDER};padding-top:16px;">
                  You are receiving this because you have email notifications enabled
                  on your account.
                </p>
              </td>
            </tr>"""
            + _footer_html()
        )

        html = _outer_table(rows)
        msg = _build_msg(to_email, f"{SENDER_NAME}: {title}", plain, html)
        _send(msg, to_email)
        print(f"[email-notif] SUCCESS: Email delivered to {to_email} - {title}")
    except Exception as e:
        print(f"[email-notif] FAILED: SMTP error sending to {to_email}: {e}")


# ── Subscription Plan ─────────────────────────────────────────────────────────

def send_subscription_email(
    to_email: str,
    plan_name: str,
    monthly_price: float,
    annual_price: float,
    currency: str,
    features: list[dict],
    changed_by_admin: bool = False,
) -> None:
    """
    Send a rich subscription-plan confirmation email with pricing and feature details.

    Parameters
    ----------
    features : list[dict]
        Each dict must contain:
          - name (str)            — display name of the feature
          - enabled (bool)        — whether the feature is included in this plan
          - supports_limit (bool) — whether the feature has a numeric limit
          - limit (int | None)    — the limit value, if applicable
    changed_by_admin : bool
        True when an admin changed the plan on the user's behalf.
    """
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        print("[email-sub] SMTP is not configured, skipping subscription email.")
        return

    try:
        # ── Format prices ──────────────────────────────────────────────
        _CURRENCY_SYMBOLS: dict[str, str] = {
            "USD": "$", "EUR": "€", "GBP": "£", "INR": "₹",
        }
        sym = _CURRENCY_SYMBOLS.get(currency, f"{currency} ")

        def _fmt(price: float) -> str:
            return "Free" if price == 0.0 else f"{sym}{price:,.2f}"

        monthly_str = _fmt(monthly_price)
        annual_str  = _fmt(annual_price)

        changed_note = (
            "An administrator has updated your subscription plan."
            if changed_by_admin
            else "Your subscription plan has been updated successfully."
        )

        # ── Feature list (enabled features only) ──────────────────────
        enabled = [f for f in features if f.get("enabled")]

        if enabled:
            feat_rows = ""
            for feat in enabled:
                fname         = feat.get("name", "")
                limit         = feat.get("limit")
                supports_lim  = feat.get("supports_limit", True)

                if supports_lim and limit is not None:
                    limit_badge = (
                        f"&nbsp;<span style='color:{_TEXT_MUTED};font-size:12px;"
                        f"background-color:{_FOOTER_BG};border:1px solid {_BORDER};"
                        f"border-radius:4px;padding:1px 6px;'>up to {limit:,}</span>"
                    )
                else:
                    limit_badge = ""

                feat_rows += f"""
                <tr>
                  <td style="padding:7px 0;border-top:1px solid {_BORDER};
                             vertical-align:middle;">
                    <span style="color:{_TYPE_COLOR['success']};font-size:16px;
                                 margin-right:8px;">&#10003;</span>
                    <span style="color:{_TEXT};font-size:14px;">{fname}</span>
                    {limit_badge}
                  </td>
                </tr>"""

            features_section = f"""
            <p style="margin:24px 0 8px;color:{_TEXT};font-size:14px;font-weight:600;">
              Included in your plan
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              {feat_rows}
            </table>"""
        else:
            features_section = ""

        plain = (
            f"Subscription Plan Update — {plan_name}\n\n"
            f"{changed_note}\n\n"
            f"Plan: {plan_name}\n"
            f"Monthly: {monthly_str}/month\n"
            f"Annual:  {annual_str}/year\n"
            f"Currency: {currency}\n\n"
            f"Log in to {SENDER_NAME} to manage your subscription.\n\n"
            f"— The {SENDER_NAME} Team"
        )

        rows = (
            _header_html("Subscription Updated")
            + f"""
            <tr>
              <td style="padding:32px 32px 28px;">

                <!-- Plan name card -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                       style="margin-bottom:22px;">
                  <tr>
                    <td style="background-color:#EEF2FF;border-radius:8px;
                               padding:16px 20px;text-align:center;">
                      <p style="margin:0 0 4px;color:{_TEXT_MUTED};font-size:11px;
                                 font-weight:700;letter-spacing:0.8px;
                                 text-transform:uppercase;">Your Current Plan</p>
                      <p style="margin:0;color:{_BRAND};font-size:26px;font-weight:700;">
                        {plan_name}
                      </p>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 22px;color:{_TEXT_MUTED};font-size:15px;line-height:1.6;">
                  {changed_note} Your new feature limits are now active.
                </p>

                <!-- Billing details table -->
                <p style="margin:0 0 8px;color:{_TEXT};font-size:14px;font-weight:600;">
                  Billing details
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                       style="background-color:{_FOOTER_BG};border:1px solid {_BORDER};
                              border-radius:8px;padding:4px 16px;">
                  <tr>
                    <td style="padding:10px 0;color:{_TEXT_MUTED};font-size:13px;">
                      Monthly price</td>
                    <td style="padding:10px 0;color:{_TEXT};font-size:13px;font-weight:600;
                               text-align:right;">{monthly_str} / month</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;color:{_TEXT_MUTED};font-size:13px;
                               border-top:1px solid {_BORDER};">Annual price</td>
                    <td style="padding:10px 0;color:{_TEXT};font-size:13px;font-weight:600;
                               text-align:right;border-top:1px solid {_BORDER};">
                      {annual_str} / year</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;color:{_TEXT_MUTED};font-size:13px;
                               border-top:1px solid {_BORDER};">Billing currency</td>
                    <td style="padding:10px 0;color:{_TEXT};font-size:13px;font-weight:600;
                               text-align:right;border-top:1px solid {_BORDER};">{currency}</td>
                  </tr>
                </table>

                {features_section}

                <!-- CTA button -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr><td align="center" style="padding:28px 0 4px;">
                    <a href="#"
                       style="display:inline-block;background-color:{_BRAND};color:#ffffff;
                              text-decoration:none;font-size:14px;font-weight:600;
                              padding:12px 32px;border-radius:8px;">
                      Manage Subscription
                    </a>
                  </td></tr>
                </table>

              </td>
            </tr>"""
            + _footer_html(
                "You are receiving this because you have email notifications enabled on your account."
            )
        )

        html = _outer_table(rows)
        subject = f"{SENDER_NAME}: Your subscription has been updated to {plan_name}"
        msg = _build_msg(to_email, subject, plain, html)
        _send(msg, to_email)
        print(f"[email-sub] SUCCESS: Subscription email sent to {to_email} — {plan_name}")
    except Exception as e:
        print(f"[email-sub] FAILED: {e}")


# ── Broadcast ─────────────────────────────────────────────────────────────────

def send_broadcast_email(
    to_email: str,
    subject: str,
    body: str,
    message_type: str = "info",
) -> None:
    """
    Send an admin broadcast email with a message-type badge and coloured accent strip.

    This function is only called when the broadcast channel includes 'email'.
    Whether a user receives a broadcast email is still gated by their
    is_email_notifications_enabled preference.

    Parameters
    ----------
    message_type : str
        One of: info, warning, maintenance, announcement.
    """
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        print("[email-broadcast] SMTP is not configured, skipping broadcast email.")
        return

    try:
        color = _TYPE_COLOR.get(message_type, _BRAND)
        bg    = _TYPE_BG.get(message_type, "#EEF2FF")
        label = _TYPE_LABEL.get(message_type, "INFO")

        plain = (
            f"[{label}] {subject}\n\n"
            f"{body}\n\n"
            f"This message was sent to {SENDER_NAME} users by an administrator.\n"
            f"— The {SENDER_NAME} Team"
        )

        rows = (
            _header_html()
            # Coloured banner strip with message-type badge
            + f"""
            <tr>
              <td style="background-color:{bg};padding:10px 32px;
                         border-bottom:2px solid {color};">
                <span style="display:inline-block;background-color:{color};color:#ffffff;
                             font-size:11px;font-weight:700;letter-spacing:0.8px;
                             padding:3px 10px;border-radius:4px;">
                  {label}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 26px;">
                <h2 style="margin:0 0 14px;color:{_TEXT};font-size:18px;font-weight:700;">
                  {subject}
                </h2>
                <p style="margin:0;color:{_TEXT_MUTED};font-size:15px;line-height:1.7;">
                  {body}
                </p>
              </td>
            </tr>"""
            + _footer_html(
                f"This message was sent to {SENDER_NAME} users by an administrator. "
                "You are receiving this because you have email notifications enabled."
            )
        )

        html = _outer_table(rows)
        msg = _build_msg(to_email, f"[{SENDER_NAME}] {subject}", plain, html)
        _send(msg, to_email)
        print(f"[email-broadcast] SUCCESS: Broadcast email sent to {to_email} — {subject}")
    except Exception as e:
        print(f"[email-broadcast] FAILED: {e}")


# ── Group Invite ──────────────────────────────────────────────────────────────

def send_group_invite_email(
    to_email: str,
    inviter_name: str,
    group_name: str,
) -> None:
    """Send a group invitation email with clean branding."""
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        print("[email-invite] SMTP is not configured, skipping group invite email.")
        return

    try:
        plain = (
            f"You Have a Group Invitation\n\n"
            f"{inviter_name} has invited you to join the group \"{group_name}\".\n"
            f"Visit your Groups page in ReviewMate to accept or decline the invitation.\n\n"
            f"— The {SENDER_NAME} Team"
        )

        rows = (
            _header_html("Group Invitation")
            + f"""
            <tr>
              <td style="padding:36px 32px 28px;">
                <p style="margin:0 0 8px;color:{_TEXT};font-size:18px;font-weight:700;">
                  You've been invited!
                </p>
                <p style="margin:0 0 24px;color:{_TEXT_MUTED};font-size:15px;line-height:1.6;">
                  <strong style="color:{_TEXT};">{inviter_name}</strong> has invited you to join the group
                  <strong style="color:{_BRAND};">{group_name}</strong> on {SENDER_NAME}.
                </p>

                <!-- Details card -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                       style="background-color:{_FOOTER_BG};border:1px solid {_BORDER};
                              border-radius:8px;padding:16px 20px;margin-bottom:28px;">
                  <tr>
                    <td style="padding:4px 0;color:{_TEXT_MUTED};font-size:13px;width:100px;
                               vertical-align:top;">Invited by:</td>
                    <td style="padding:4px 0;color:{_TEXT};font-size:13px;font-weight:600;
                               vertical-align:top;">{inviter_name}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;color:{_TEXT_MUTED};font-size:13px;width:100px;
                               vertical-align:top;border-top:1px solid {_BORDER};padding-top:10px;margin-top:6px;">Group:</td>
                    <td style="padding:4px 0;color:{_TEXT};font-size:13px;font-weight:600;
                               vertical-align:top;border-top:1px solid {_BORDER};padding-top:10px;margin-top:6px;">{group_name}</td>
                  </tr>
                </table>

                <!-- Action button -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr><td align="center" style="padding:4px 0 24px;">
                    <a href="#"
                       style="display:inline-block;background-color:{_BRAND};color:#ffffff;
                              text-decoration:none;font-size:14px;font-weight:600;
                              padding:12px 32px;border-radius:8px;">
                      View Invitation
                    </a>
                  </td></tr>
                </table>

                <p style="margin:0;color:{_TEXT_MUTED};font-size:13px;text-align:center;">
                  You can accept or decline this invitation on your Groups page.
                </p>
              </td>
            </tr>"""
            + _footer_html(
                "You are receiving this because you have email notifications enabled on your account."
            )
        )

        html = _outer_table(rows)
        msg = _build_msg(to_email, f"{SENDER_NAME}: Invitation to join group {group_name}", plain, html)
        _send(msg, to_email)
        print(f"[email-invite] SUCCESS: Group invite email sent to {to_email} — group {group_name}")
    except Exception as e:
        print(f"[email-invite] FAILED: {e}")


# ── New Review Alert ──────────────────────────────────────────────────────────

def send_new_review_alert_email(
    to_email: str,
    reviewer_name: str,
    rating: int,
    platform_name: str,
    review_text: str,
) -> None:
    """Send a new review alert email with clean brand styling."""
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        print("[email-alert] SMTP is not configured, skipping new review alert email.")
        return

    try:
        stars = "★" * rating + "☆" * (5 - rating)
        plain = (
            f"New Review Alert\n\n"
            f"You received a new {rating}-star review on {platform_name} by {reviewer_name}:\n\n"
            f"\"{review_text}\"\n\n"
            f"Visit your dashboard to view and respond to this review.\n\n"
            f"— The {SENDER_NAME} Team"
        )

        rows = (
            _header_html("New Review Alert")
            + f"""
            <tr>
              <td style="padding:36px 32px 28px;">
                <p style="margin:0 0 8px;color:{_TEXT};font-size:18px;font-weight:700;">
                  New Review Received!
                </p>
                <p style="margin:0 0 20px;color:{_TEXT_MUTED};font-size:15px;line-height:1.6;">
                  You received a new review on <strong style="color:{_TEXT};">{platform_name}</strong>.
                </p>

                <!-- Review Details Box -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                       style="border:1px solid {_BORDER};border-radius:8px;padding:16px 20px;margin-bottom:28px;">
                  <tr>
                    <td style="padding-bottom:10px;border-bottom:1px solid {_BORDER};">
                      <span style="color:#D97706;font-size:20px;font-weight:bold;">{stars}</span>
                      <span style="color:{_TEXT_MUTED};font-size:13px;margin-left:8px;">by {reviewer_name}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:14px;color:{_TEXT};font-size:14px;line-height:1.6;font-style:italic;">
                      "{review_text}"
                    </td>
                  </tr>
                </table>

                <!-- Action button -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr><td align="center" style="padding:4px 0 24px;">
                    <a href="#"
                       style="display:inline-block;background-color:{_BRAND};color:#ffffff;
                              text-decoration:none;font-size:14px;font-weight:600;
                              padding:12px 32px;border-radius:8px;">
                      View & Respond
                    </a>
                  </td></tr>
                </table>
              </td>
            </tr>"""
            + _footer_html(
                "You are receiving this because you have email notifications enabled on your account."
            )
        )

        html = _outer_table(rows)
        msg = _build_msg(to_email, f"{SENDER_NAME}: New {rating}-star review on {platform_name}", plain, html)
        _send(msg, to_email)
        print(f"[email-alert] SUCCESS: New review alert email sent to {to_email}")
    except Exception as e:
        print(f"[email-alert] FAILED: {e}")


# ── Weekly Summary ───────────────────────────────────────────────────────────

def send_weekly_summary_email(
    to_email: str,
    total_reviews: int,
    avg_rating: float,
    sentiment_positive: int,
    sentiment_neutral: int,
    sentiment_negative: int,
) -> None:
    """Send a weekly performance digest email with clean brand styling."""
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        print("[email-summary] SMTP is not configured, skipping weekly summary email.")
        return

    try:
        plain = (
            f"Your Weekly Performance Summary\n\n"
            f"Here is your digest for this week:\n"
            f"- Total Reviews: {total_reviews}\n"
            f"- Average Rating: {avg_rating:.2f}/5.0\n"
            f"- Positive Sentiment: {sentiment_positive}%\n"
            f"- Neutral Sentiment: {sentiment_neutral}%\n"
            f"- Negative Sentiment: {sentiment_negative}%\n\n"
            f"Visit your dashboard to see more detailed insights.\n\n"
            f"— The {SENDER_NAME} Team"
        )

        rows = (
            _header_html("Weekly Summary")
            + f"""
            <tr>
              <td style="padding:36px 32px 28px;">
                <p style="margin:0 0 8px;color:{_TEXT};font-size:18px;font-weight:700;">
                  Your Weekly Performance Digest
                </p>
                <p style="margin:0 0 24px;color:{_TEXT_MUTED};font-size:15px;line-height:1.6;">
                  Here is a summary of how your property performed over the last 7 days.
                </p>

                <!-- High-level stats row -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                  <tr>
                    <td width="50%" style="background-color:{_FOOTER_BG};border:1px solid {_BORDER};border-radius:8px;padding:16px;text-align:center;">
                      <p style="margin:0 0 4px;color:{_TEXT_MUTED};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Reviews Received</p>
                      <p style="margin:0;color:{_BRAND};font-size:28px;font-weight:700;">{total_reviews}</p>
                    </td>
                    <td width="4%"></td>
                    <td width="46%" style="background-color:{_FOOTER_BG};border:1px solid {_BORDER};border-radius:8px;padding:16px;text-align:center;">
                      <p style="margin:0 0 4px;color:{_TEXT_MUTED};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Average Rating</p>
                      <p style="margin:0;color:{_BRAND};font-size:28px;font-weight:700;">{avg_rating:.2f}</p>
                    </td>
                  </tr>
                </table>

                <!-- Sentiment breakdown card -->
                <p style="margin:0 0 8px;color:{_TEXT};font-size:14px;font-weight:600;">Sentiment Breakdown</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                       style="border:1px solid {_BORDER};border-radius:8px;padding:16px 20px;margin-bottom:28px;">
                  <tr>
                    <td style="padding:6px 0;color:{_TEXT_MUTED};font-size:13px;">Positive</td>
                    <td style="padding:6px 0;color:{_TYPE_COLOR['success']};font-size:13px;font-weight:600;text-align:right;">{sentiment_positive}%</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:{_TEXT_MUTED};font-size:13px;border-top:1px solid {_BORDER};">Neutral</td>
                    <td style="padding:6px 0;color:{_TEXT};font-size:13px;font-weight:600;text-align:right;border-top:1px solid {_BORDER};">{sentiment_neutral}%</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:{_TEXT_MUTED};font-size:13px;border-top:1px solid {_BORDER};">Negative</td>
                    <td style="padding:6px 0;color:{_TYPE_COLOR['error']};font-size:13px;font-weight:600;text-align:right;border-top:1px solid {_BORDER};">{sentiment_negative}%</td>
                  </tr>
                </table>

                <!-- Action button -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr><td align="center" style="padding:4px 0 24px;">
                    <a href="#"
                       style="display:inline-block;background-color:{_BRAND};color:#ffffff;
                              text-decoration:none;font-size:14px;font-weight:600;
                              padding:12px 32px;border-radius:8px;">
                      View Dashboard Insights
                    </a>
                  </td></tr>
                </table>
              </td>
            </tr>"""
            + _footer_html(
                "You are receiving this because you have email notifications enabled on your account."
            )
        )

        html = _outer_table(rows)
        msg = _build_msg(to_email, f"{SENDER_NAME}: Your weekly performance summary", plain, html)
        _send(msg, to_email)
        print(f"[email-summary] SUCCESS: Weekly summary email sent to {to_email}")
    except Exception as e:
        print(f"[email-summary] FAILED: {e}")


# ── Signup Email Verification ─────────────────────────────────────────────────

def send_signup_otp_email(to_email: str, code: str) -> None:
    """Send a signup email verification code to the given address."""
    print(f"[signup-email] Attempting to send verification OTP to {to_email}")

    if not SMTP_EMAIL or not SMTP_PASSWORD:
        print("[signup-email] WARN: SMTP not configured. OTP code:", code)
        return

    plain = (
        f"Your {SENDER_NAME} signup verification code is: {code}\n\n"
        "This code expires in 10 minutes.\n"
        "Never share this code with anyone.\n"
        "If you did not request this code, you can safely ignore this email.\n\n"
        f"— The {SENDER_NAME} Team"
    )

    rows = (
        _header_html("Email Verification")
        + f"""
        <tr>
          <td style="padding:36px 32px 28px;">
            <p style="margin:0 0 8px;color:{_TEXT};font-size:18px;font-weight:700;">
              Verify Your Email Address
            </p>
            <p style="margin:0 0 24px;color:{_TEXT_MUTED};font-size:15px;line-height:1.6;">
              Use the code below to verify your email and complete your sign-up to
              <strong style="color:{_TEXT};">{SENDER_NAME}</strong>.
              This code is valid for
              <strong style="color:{_TEXT};">10 minutes</strong>.
            </p>

            <!-- OTP Code box -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding:4px 0 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background-color:#EEF2FF;border:2px solid {_BRAND};
                               border-radius:10px;padding:20px 48px;text-align:center;">
                      <span style="font-size:38px;font-weight:700;letter-spacing:10px;
                                   color:{_TEXT};font-family:'Courier New',monospace;">
                        {code}
                      </span>
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <!-- Security reminders box -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background-color:{_FOOTER_BG};border:1px solid {_BORDER};
                           border-radius:8px;padding:16px 18px;">
                  <p style="margin:0 0 8px;color:{_TEXT};font-size:13px;font-weight:600;">
                    Security reminders
                  </p>
                  <p style="margin:0;color:{_TEXT_MUTED};font-size:13px;line-height:1.75;">
                    &#8226;&nbsp; This code expires in
                      <strong style="color:{_TEXT};">10 minutes</strong><br>
                    &#8226;&nbsp; Never share this code with anyone<br>
                    &#8226;&nbsp; If you didn't request this code, you can safely ignore this email
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>"""
        + _footer_html("This is an automated verification message — please do not reply.")
    )

    html = _outer_table(rows)
    msg = _build_msg(
        to_email,
        f"Verify your {SENDER_NAME} email address",
        plain,
        html,
    )

    try:
        _send(msg, to_email)
        print(f"[signup-email] SUCCESS: OTP sent to {to_email}")
    except Exception as e:
        print(f"[signup-email] ERROR sending to {to_email}: {e}")
        raise RuntimeError(f"Email sending failed: {e}") from e


def send_welcome_email(to_email: str, user_name: str) -> None:
    """Send a welcome email to the newly registered user."""
    print(f"[welcome-email] Attempting to send welcome email to {to_email}")

    if not SMTP_EMAIL or not SMTP_PASSWORD:
        print("[welcome-email] WARN: SMTP not configured. Welcome mail skipped.")
        return

    plain = (
        f"Hi {user_name},\n\n"
        f"Welcome to {SENDER_NAME}! Your account has been created successfully.\n\n"
        "Here are your next steps to get started:\n"
        "1. Add your first organization\n"
        "2. Create your first group\n\n"
        "If you need any assistance, feel free to contact us at support@reviewmate.live.\n\n"
        f"— The {SENDER_NAME} Team"
    )

    rows = (
        _header_html("Welcome to ReviewMate")
        + f"""
        <tr>
          <td style="padding:36px 32px 28px;">
            <p style="margin:0 0 8px;color:{_TEXT};font-size:18px;font-weight:700;">
              Hi {user_name},
            </p>
            <p style="margin:0 0 24px;color:{_TEXT_MUTED};font-size:15px;line-height:1.6;">
              Welcome to <strong style="color:{_TEXT};">{SENDER_NAME}</strong>!
              We're thrilled to help you monitor and manage your online reputation.
              Your account has been created successfully.
            </p>

            <!-- Steps list -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="padding:0 0 12px;">
                  <strong style="color:{_TEXT};font-size:15px;">Next steps to get started:</strong>
                </td>
              </tr>
              <tr>
                <td style="padding:4px 0;">
                  <span style="display:inline-block;width:24px;color:{_BRAND};font-weight:bold;">1.</span>
                  <span style="color:{_TEXT};font-size:14px;">Add your first organization</span>
                </td>
              </tr>
              <tr>
                <td style="padding:4px 0;">
                  <span style="display:inline-block;width:24px;color:{_BRAND};font-weight:bold;">2.</span>
                  <span style="color:{_TEXT};font-size:14px;">Create your first group</span>
                </td>
              </tr>
            </table>

            <!-- Support reminder box -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background-color:{_FOOTER_BG};border:1px solid {_BORDER};
                           border-radius:8px;padding:16px 18px;">
                  <p style="margin:0 0 4px;color:{_TEXT};font-size:13px;font-weight:600;">
                    Need help?
                  </p>
                  <p style="margin:0;color:{_TEXT_MUTED};font-size:13px;line-height:1.6;">
                    Contact us if anything is needed at
                    <a href="mailto:support@reviewmate.live"
                       style="color:{_BRAND};text-decoration:none;font-weight:600;">support@reviewmate.live</a>.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>"""
        + _footer_html("Welcome to the platform!")
    )

    html = _outer_table(rows)
    msg = _build_msg(
        to_email,
        f"Welcome to {SENDER_NAME}!",
        plain,
        html,
    )

    try:
        _send(msg, to_email)
        print(f"[welcome-email] SUCCESS: Welcome email sent to {to_email}")
    except Exception as e:
        print(f"[welcome-email] ERROR sending to {to_email}: {e}")


