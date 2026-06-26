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
from ..schemas.report import (
    CombinedExportBody,
    CombinedExportQuery,
    RakeDrilldownQuery,
    RakeDrilldownResponse,
    ReportQuery,
    ReportResponse,
)
from ..services.report.export_combined import export_combined
from ..services.report.generate import generate_report
from ..services.report.rake_drilldown import rake_drilldown

# Unknown-key rejection (backend-api-standards, OWASP A04).
_ALLOWED_GENERATE_KEYS = frozenset({"date", "report_type", "region_id", "days"})
# /export-combined: the report params + the optional `columns` filter + `sheets`.
_ALLOWED_COMBINED_KEYS = frozenset(
    {"date", "report_type", "region_id", "days", "columns", "sheets"}
)
# /rake-drilldown: a single RAKE + date + region + aging filter (no report_type).
_ALLOWED_DRILLDOWN_KEYS = frozenset({"rake", "date", "region_id", "days"})


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


async def rake_drilldown_controller(
    request: Request,
    query: RakeDrilldownQuery = Depends(),
    _user: AuthUser = Depends(get_current_user),
) -> SuccessEnvelope[RakeDrilldownResponse]:
    """``GET /report/rake-drilldown`` — individual jsw + jvml rows for one RAKE.

    Available to all authenticated users. Unknown query parameters raise a 400.
    """
    unknown = set(request.query_params.keys()) - _ALLOWED_DRILLDOWN_KEYS
    if unknown:
        raise ValidationError(
            f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
        )
    result = await rake_drilldown(query)
    return success(result)


async def export_combined_controller(
    request: Request,
    query: CombinedExportQuery = Depends(),
    body: CombinedExportBody | None = None,
    _user: AuthUser = Depends(get_current_user),
) -> StreamingResponse:
    """``GET|POST /report/export-combined`` — export the chosen sheets as one .xlsx.

    Accepts the report export params plus a ``sheets`` CSV (which sheets to
    include) as query params. POST may also carry an optional JSON ``body`` with
    browser-only RAKE drill-down exclusions; GET (no body) exports the full file.
    Powers the /report page sheet-picker dialog.
    """
    unknown = set(request.query_params.keys()) - _ALLOWED_COMBINED_KEYS
    if unknown:
        raise ValidationError(
            f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
        )

    data: bytes = await export_combined(query, body)
    filename = f"report_combined_{query.report_type}_{query.date}.xlsx"
    return StreamingResponse(
        BytesIO(data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
