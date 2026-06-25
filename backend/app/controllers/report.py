"""Report JSW/JVML controller (pivot + credit report, authenticated users only).

Thin controller — validates query via the ``ReportQuery`` Depends model, rejects
unknown query params (4-key whitelist), calls the service, wraps in the success
envelope. No business logic here.
"""

from __future__ import annotations

from io import BytesIO

from fastapi import Depends, Request
from starlette.responses import StreamingResponse

from ..core.auth_deps import get_current_user
from ..core.errors import ValidationError
from ..core.responses import SuccessEnvelope, success
from ..schemas.auth import AuthUser
from ..schemas.report import ReportQuery, ReportResponse
from ..services.report.export import export_report
from ..services.report.export_totals import export_rake_totals
from ..services.report.generate import generate_report

# Unknown-key rejection (backend-api-standards, OWASP A04).
_ALLOWED_GENERATE_KEYS = frozenset({"date", "report_type", "region_id", "days"})
# /export accepts the same params plus the optional `columns` filter.
_ALLOWED_EXPORT_KEYS = frozenset({"date", "report_type", "region_id", "days", "columns"})
# /export-rake-totals: same base params, no `columns`.
_ALLOWED_TOTALS_KEYS = frozenset({"date", "report_type", "region_id", "days"})


async def generate_report_controller(
    request: Request,
    query: ReportQuery = Depends(),
    _user: AuthUser = Depends(get_current_user),
) -> SuccessEnvelope[ReportResponse]:
    """``GET /report/generate`` — the Report JSW/JVML pivot + credit payload.

    Available to all authenticated users (not admin-only). Unknown query
    parameters raise a 400 ValidationError immediately.
    """
    unknown = set(request.query_params.keys()) - _ALLOWED_GENERATE_KEYS
    if unknown:
        raise ValidationError(
            f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
        )
    report = await generate_report(query)
    return success(report)


async def export_report_controller(
    request: Request,
    query: ReportQuery = Depends(),
    _user: AuthUser = Depends(get_current_user),
) -> StreamingResponse:
    """``GET /report/export`` — export the generated report as .xlsx.

    Accepts the same query parameters as ``/report/generate`` plus an optional
    ``columns`` CSV of visible optional-column keys.
    """
    unknown = set(request.query_params.keys()) - _ALLOWED_EXPORT_KEYS
    if unknown:
        raise ValidationError(
            f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
        )

    data: bytes = await export_report(query)
    filename = f"report_{query.report_type}_{query.date}.xlsx"
    return StreamingResponse(
        BytesIO(data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


async def export_rake_totals_controller(
    request: Request,
    query: ReportQuery = Depends(),
    _user: AuthUser = Depends(get_current_user),
) -> StreamingResponse:
    """``GET /report/export-rake-totals`` — export RAKE + transport-mode totals as .xlsx."""
    unknown = set(request.query_params.keys()) - _ALLOWED_TOTALS_KEYS
    if unknown:
        raise ValidationError(
            f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
        )

    data: bytes = await export_rake_totals(query)
    filename = f"rake_totals_{query.report_type}_{query.date}.xlsx"
    return StreamingResponse(
        BytesIO(data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
