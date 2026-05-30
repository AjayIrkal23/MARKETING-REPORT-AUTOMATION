"""Async email delivery with SMTP + dev-log fallback.

Production: SMTP via ``smtplib`` executed in ``asyncio.to_thread`` (non-blocking).
Development: when ``settings.smtp_host`` is empty the email body (including OTP)
is logged at INFO level — no mail server required.

Transport failures are **always caught and logged**; they are never re-raised to
the caller (a failed email must not abort a user-facing request).

Contract: §3.5 of USER-MANAGEMENT-PLAN.md
  - send_email(to, subject, text, html=None) -> None   [async]
  - render_otp_email(otp, ttl_minutes, app_name) -> (subject, text, html)
  - render_invite_email(name, app_name, app_base_url) -> (subject, text, html)

OTP is NEVER returned in an API response; it appears only in email / dev-log.
"""

from __future__ import annotations

import asyncio
import logging
import smtplib
import textwrap
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import get_settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public async send function
# ---------------------------------------------------------------------------


async def send_email(
    to: str,
    subject: str,
    text: str,
    html: str | None = None,
) -> None:
    """Send an email to *to* with the given *subject* and body.

    Selects transport based on ``settings.smtp_host``:

    - **Non-empty**: delegates to :func:`_smtp_send` inside
      ``asyncio.to_thread`` (STARTTLS when ``settings.smtp_starttls`` is true).
    - **Empty (dev)**: logs subject + plain-text body at INFO level.

    Transport failures are caught, logged at ERROR level, and **not re-raised**
    so callers are never interrupted by email infrastructure issues.

    Args:
        to:      Recipient email address.
        subject: Email subject line.
        text:    Plain-text body (always required; used as fallback).
        html:    Optional HTML body; included as an ``alternative`` part when set.
    """
    settings = get_settings()

    if not settings.smtp_host:
        # Dev-log fallback: emit email content so developers can test the full
        # flow without a real mail server.
        logger.info(
            "[DEV EMAIL] To: %s | Subject: %s\n%s",
            to,
            subject,
            text,
        )
        return

    try:
        await asyncio.to_thread(_smtp_send, to, subject, text, html)
    except Exception:
        logger.exception(
            "Email delivery failed (To: %s | Subject: %s) — not raising to caller",
            to,
            subject,
        )


# ---------------------------------------------------------------------------
# Internal SMTP helper (runs in a thread — must be synchronous)
# ---------------------------------------------------------------------------


def _smtp_send(
    to: str,
    subject: str,
    text: str,
    html: str | None,
) -> None:
    """Build and transmit a MIME email via ``smtplib``.

    Called inside ``asyncio.to_thread``; must not use ``await``.

    Raises:
        Any exception from ``smtplib`` — caught by :func:`send_email`.
    """
    settings = get_settings()

    msg: MIMEMultipart
    if html:
        msg = MIMEMultipart("alternative")
        msg.attach(MIMEText(text, "plain", "utf-8"))
        msg.attach(MIMEText(html, "html", "utf-8"))
    else:
        msg = MIMEMultipart()
        msg.attach(MIMEText(text, "plain", "utf-8"))

    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as smtp:
        smtp.ehlo()
        if settings.smtp_starttls:
            smtp.starttls()
            smtp.ehlo()
        if settings.smtp_user and settings.smtp_password:
            smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.sendmail(settings.smtp_from, [to], msg.as_string())

    logger.info("Email sent (To: %s | Subject: %s)", to, subject)


# ---------------------------------------------------------------------------
# Email renderers
# ---------------------------------------------------------------------------


def render_otp_email(
    otp: str,
    ttl_minutes: int,
    app_name: str,
) -> tuple[str, str, str]:
    """Return ``(subject, text, html)`` for the OTP first-login setup email.

    The OTP appears in both the plain-text and HTML bodies. It is NOT returned
    in any API response — only delivered here via email / dev-log.

    Args:
        otp:         The raw numeric OTP (6 digits).
        ttl_minutes: Time-to-live in minutes (derived from ``otp_ttl_seconds``).
        app_name:    Human-readable application name (e.g. "JSW Marketing Reports").
    """
    subject = f"{app_name} — Your one-time verification code"

    text = textwrap.dedent(f"""\
        Welcome to {app_name}.

        Your one-time verification code is:

            {otp}

        This code is valid for {ttl_minutes} minute(s). Do not share it with anyone.

        If you did not request account access, you can safely ignore this message.
    """)

    html = textwrap.dedent(f"""\
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="utf-8"><title>{subject}</title></head>
        <body style="font-family:sans-serif;color:#1a1a2e;max-width:520px;margin:auto;padding:24px">
          <h2 style="color:#1a3a5c">Welcome to {app_name}</h2>
          <p>Your one-time verification code is:</p>
          <div style="font-size:2rem;font-weight:700;letter-spacing:.25rem;
                      background:#f0f4f8;border:1px solid #cbd5e1;border-radius:6px;
                      padding:12px 24px;display:inline-block;margin:8px 0">
            {otp}
          </div>
          <p style="color:#64748b;font-size:.875rem">
            This code is valid for <strong>{ttl_minutes} minute(s)</strong>.
            Do not share it with anyone.
          </p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
          <p style="color:#94a3b8;font-size:.75rem">
            If you did not request account access, you can safely ignore this message.
          </p>
        </body>
        </html>
    """)

    return subject, text, html


def render_invite_email(
    name: str,
    app_name: str,
    app_base_url: str,
) -> tuple[str, str, str]:
    """Return ``(subject, text, html)`` for the account invitation email.

    Sent when an admin creates a new user (status="invited"). Directs the
    user to the login page to trigger OTP setup. No OTP is included here —
    OTP is sent separately when the user submits their email on first login.

    Args:
        name:         The new user's display name.
        app_name:     Human-readable application name.
        app_base_url: Base URL of the frontend (e.g. "http://localhost:5173").
    """
    login_url = f"{app_base_url.rstrip('/')}/login"
    subject = f"You've been invited to {app_name}"

    text = textwrap.dedent(f"""\
        Hello {name},

        You have been invited to access {app_name}.

        To set up your account, visit the link below and enter your email address.
        You will receive a one-time code to complete the setup.

            {login_url}

        If you have any questions, contact your administrator.
    """)

    html = textwrap.dedent(f"""\
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="utf-8"><title>{subject}</title></head>
        <body style="font-family:sans-serif;color:#1a1a2e;max-width:520px;margin:auto;padding:24px">
          <h2 style="color:#1a3a5c">Welcome to {app_name}</h2>
          <p>Hello <strong>{name}</strong>,</p>
          <p>
            You have been invited to access <strong>{app_name}</strong>.
            Click the button below to set up your account.
          </p>
          <a href="{login_url}"
             style="display:inline-block;background:#1a3a5c;color:#fff;
                    text-decoration:none;border-radius:6px;padding:10px 20px;
                    font-weight:600;margin:12px 0">
            Set up my account
          </a>
          <p style="color:#64748b;font-size:.875rem">
            Or copy this link into your browser:<br>
            <span style="color:#1a3a5c">{login_url}</span>
          </p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
          <p style="color:#94a3b8;font-size:.75rem">
            If you did not expect this invitation, you can safely ignore this message.
          </p>
        </body>
        </html>
    """)

    return subject, text, html
