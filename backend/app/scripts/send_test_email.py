"""CLI to verify SMTP (e.g. Mailjet) delivery end-to-end.

Run from ``backend/``:
    ./.venv/bin/python -m app.scripts.send_test_email you@example.com

With no recipient it falls back to ``SEED_ADMIN_EMAIL``. No database is
required. Unlike :func:`app.core.email.send_email` (which swallows transport
errors so a failed email never aborts a user request), this script lets SMTP
exceptions propagate so you can see *why* delivery failed — bad credentials,
an unvalidated ``SMTP_FROM`` sender, a blocked port, etc.
"""

from __future__ import annotations

import asyncio
import sys

from ..core.config import get_settings
from ..core.email import _smtp_send, send_email


def _mask(value: str) -> str:
    """Mask a credential for safe console printing."""
    if not value:
        return "(empty)"
    if len(value) <= 4:
        return "****"
    return f"{value[:4]}{'*' * (len(value) - 4)}"


async def _main(to: str) -> None:
    settings = get_settings()

    if settings.smtp_ssl:
        transport = "SSL (implicit TLS)"
    elif settings.smtp_starttls:
        transport = "STARTTLS"
    else:
        transport = "plain (no TLS)"

    print("SMTP transport configuration:")
    print(f"  host      : {settings.smtp_host or '(empty -> dev-log fallback)'}")
    print(f"  port      : {settings.smtp_port}")
    print(f"  transport : {transport}")
    print(f"  user      : {_mask(settings.smtp_user)}")
    print(f"  password  : {_mask(settings.smtp_password)}")
    print(f"  from      : {settings.smtp_from}")
    print(f"  to        : {to}")
    print()

    subject = f"{settings.app_name} — SMTP test"
    text = (
        f"This is a test email from {settings.app_name}.\n\n"
        "If you received it, your SMTP relay is configured correctly."
    )
    html = (
        f"<p>This is a test email from <strong>{settings.app_name}</strong>.</p>"
        "<p>If you received it, your SMTP relay is configured correctly.</p>"
    )

    if not settings.smtp_host:
        # Dev-log fallback path — nothing is actually sent.
        await send_email(to, subject, text, html)
        print("SMTP_HOST is empty: email was logged (dev fallback), not sent.")
        return

    # Surface transport errors (send_email would swallow them).
    await asyncio.to_thread(_smtp_send, to, subject, text, html)
    print(f"OK: test email sent to {to}.")


if __name__ == "__main__":
    _settings = get_settings()
    _to = sys.argv[1] if len(sys.argv) > 1 else _settings.seed_admin_email
    asyncio.run(_main(_to))
