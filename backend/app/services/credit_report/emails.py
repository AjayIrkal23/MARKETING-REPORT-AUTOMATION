"""Email rendering and delivery for the Credit Report Excel missing-file alert.

Mirrors the renderer pattern used in ``app/core/email.py`` (render_otp_email /
render_invite_email):  a pure ``render_*`` function returns ``(subject, text, html)``
and is tested independently of SMTP.  ``send_missing_alert`` loops ``config.notify_emails``
and delegates each single-recipient send to ``core.email.send_email`` (which never
raises — transport failures are caught and logged inside the core helper).

``send_missing_alert`` itself is also guaranteed never to raise: an unexpected
exception from any individual recipient is caught per-recipient, logged at ERROR,
and silently skipped so that a single bad address never aborts the whole loop or
marks the ingestion record incorrectly.

Audit action emitted: ``credit_report.missing_alert`` (category ``credit_report``).
"""

from __future__ import annotations

import logging
import textwrap

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Renderer (pure — no I/O, easily unit-tested)
# ---------------------------------------------------------------------------


def render_missing_email(
    report_date: str,
    file_name: str,
    base_path: str,
) -> tuple[str, str, str]:
    """Return ``(subject, plain_text, html)`` for the missing-file alert.

    Mirrors the style of ``render_otp_email`` / ``render_invite_email`` in
    ``app/core/email.py``.  No imports from the rest of the application are
    required — this function is intentionally dependency-free.

    Args:
        report_date: Folder date string, e.g. ``"31-05-2026"``.
        file_name:   Configured file stem (no ``.xlsx`` extension).
        base_path:   Configured base directory for the Excel drops.

    Returns:
        A 3-tuple of ``(subject, plain_text_body, html_body)``.
    """
    subject = f"⚠ CREDIT REPORT EXCEL not found — {report_date}"

    expected_path = f"{base_path}/{report_date}/{file_name}.xlsx"

    text = textwrap.dedent(f"""\
        The CREDIT REPORT EXCEL file was not found by the end of the monitoring window.

        Expected file : {expected_path}
        Report date   : {report_date}

        Please upload the file or check the source system.
        This alert is sent once per day when the file is still missing at the
        configured end_time.
    """)

    html = textwrap.dedent(f"""\
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="utf-8"><title>{subject}</title></head>
        <body style="font-family:sans-serif;color:#1a1a2e;max-width:520px;margin:auto;padding:24px">
          <h2 style="color:#b91c1c">&#9888; CREDIT REPORT EXCEL not found</h2>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr>
              <td style="padding:6px 0;color:#64748b;width:120px">Report date</td>
              <td style="padding:6px 0;font-weight:600">{report_date}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748b">Expected file</td>
              <td style="padding:6px 0">
                <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;
                             font-size:.875rem;word-break:break-all">{expected_path}</code>
              </td>
            </tr>
          </table>
          <p style="color:#334155">
            The file was not found by the end of the configured monitoring window.
            Please upload the file or investigate the source system.
          </p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
          <p style="color:#94a3b8;font-size:.75rem">
            This alert is sent once per day when the CREDIT REPORT EXCEL file is still
            missing at the configured <em>end_time</em>. To silence future alerts
            for today, upload the file or adjust the configuration in the admin panel.
          </p>
        </body>
        </html>
    """)

    return subject, text, html


# ---------------------------------------------------------------------------
# Async sender
# ---------------------------------------------------------------------------


async def send_missing_alert(config: object, report_date: str) -> None:
    """Send the missing-file alert email to every address in ``config.notify_emails``.

    Behaviour:

    * Loops ``config.notify_emails``, calling ``core.email.send_email`` once per
      address (the core helper is single-recipient only).
    * **Never raises.** Any exception from an individual recipient is caught,
      logged at ERROR, and skipped so a single bad address cannot abort the loop
      or cause the caller (``poller.run_poll``) to mark the ingestion as an error.
    * Emits ``credit_report.missing_alert`` audit event after the loop (success outcome
      regardless of individual delivery failures — the alert *attempt* is what is
      audited).
    * Logs at INFO when recipients exist; WARN when ``notify_emails`` is empty.

    Args:
        config:      The ``CreditReportConfig`` document (or any object exposing
                     ``.file_name``, ``.base_path``, ``.notify_emails``).
        report_date: Folder date string, e.g. ``"31-05-2026"``.
    """
    # Import here to avoid circular-import issues: this module may be imported
    # during scheduler boot before the full app graph is resolved.
    from ...core.email import send_email  # noqa: PLC0415
    from ..audit.events import audit_credit_report_event  # noqa: PLC0415

    subject, text, html = render_missing_email(
        report_date=report_date,
        file_name=config.file_name,  # type: ignore[attr-defined]
        base_path=config.base_path,  # type: ignore[attr-defined]
    )

    notify_emails: list[str] = getattr(config, "notify_emails", []) or []
    sent_count = 0

    for email in notify_emails:
        try:
            # send_email never raises (transport failures caught + logged inside).
            # We still wrap in try/except to guard against any unexpected issue
            # (e.g. an attribute error on a malformed config object).
            await send_email(to=email, subject=subject, text=text, html=html)
            sent_count += 1
        except Exception:  # noqa: BLE001
            logger.error(
                "send_missing_alert: unexpected error sending to %s for report_date=%s",
                email,
                report_date,
                exc_info=True,
            )

    if notify_emails:
        logger.info(
            "Missing-file alert dispatched to %d/%d recipient(s) for report_date=%s",
            sent_count,
            len(notify_emails),
            report_date,
        )
    else:
        logger.warning(
            "Missing-file alert: no notify_emails configured for report_date=%s — "
            "no emails sent.",
            report_date,
        )

    # Audit the alert attempt regardless of individual delivery outcomes.
    try:
        await audit_credit_report_event(
            "credit_report.missing_alert",
            f"Missing-file alert sent for report_date={report_date}",
            outcome="success",
            extra={
                "report_date": report_date,
                "recipient_count": len(notify_emails),
                "sent_count": sent_count,
            },
        )
    except Exception:  # noqa: BLE001
        logger.error(
            "send_missing_alert: failed to emit audit event for report_date=%s",
            report_date,
            exc_info=True,
        )
