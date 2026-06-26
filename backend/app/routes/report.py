"""Report JSW/JVML routes — non-admin pivot + credit report.

router: prefix /report — authenticated users (get_current_user)

A single read endpoint. No admin/config router (the report only reads existing
stock/credit/customer/coil data; it never schedules or mutates anything).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..controllers import report as ctrl
from ..core.auth_deps import get_current_user
from ..core.responses import SuccessEnvelope
from ..schemas.report import RakeDrilldownResponse, ReportResponse

router = APIRouter(
    prefix="/report",
    tags=["report"],
    dependencies=[Depends(get_current_user)],
)

# GET /generate — build the Coil Stock pivot + credit report for the inputs
router.add_api_route(
    "/generate",
    ctrl.generate_report_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[ReportResponse],
    summary="Generate the Report JSW/JVML pivot + credit report",
)

# GET /rake-drilldown — individual jsw + jvml stock rows for one RAKE
router.add_api_route(
    "/rake-drilldown",
    ctrl.rake_drilldown_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[RakeDrilldownResponse],
    summary="Drill down a RAKE total to its individual jsw + jvml stock rows",
)

# GET|POST /export-combined — download the chosen report sheets as one .xlsx.
# POST carries an optional body of browser-only RAKE drill-down exclusions.
router.add_api_route(
    "/export-combined",
    ctrl.export_combined_controller,
    methods=["GET", "POST"],
    summary="Export the selected report sheets as one combined .xlsx",
)
