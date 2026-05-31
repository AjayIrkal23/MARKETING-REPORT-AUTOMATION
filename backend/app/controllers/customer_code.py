"""Customer-code domain controllers (thin: call service, wrap in envelope).

One controller per endpoint; each:
- Receives validated inputs via FastAPI Depends.
- Calls the appropriate service function (all DB/business logic lives there).
- Wraps the result in a ``success()`` envelope.

Unknown query-param rejection on list and options endpoints mirrors the
pattern in ``controllers/region.py`` (allowed keys defined via
``_ALLOWED_*`` frozensets; anything extra raises ``ValidationError`` 400).

Exceptions to the envelope contract:
- ``GET /template`` returns a raw binary ``StreamingResponse`` (no envelope).
- ``POST /import`` accepts multipart ``UploadFile`` + ``Form`` fields and
  returns a normal ``SuccessEnvelope[CustomerCodeImportResult]``.

Contract: .planning/customer-codes/SPEC.md §2.6 + ADDENDUM.md §Area 3.
"""

from __future__ import annotations

from io import BytesIO

from fastapi import Depends, File, Form, Request, UploadFile
from starlette.responses import StreamingResponse

from ..core.auth_deps import get_current_admin
from ..core.errors import ValidationError
from ..core.responses import SuccessEnvelope, success
from ..schemas.auth import AuthUser
from ..schemas.customer_code import (
    CustomerCodeCreate,
    CustomerCodeImportResult,
    CustomerCodeListQuery,
    CustomerCodeOption,
    CustomerCodeOptionsQuery,
    CustomerCodePublic,
    CustomerCodeUpdate,
)
from ..services.customer_code.create import create_customer_code
from ..services.customer_code.delete import delete_customer_code
from ..services.customer_code.get import get_customer_code
from ..services.customer_code.import_rows import import_customer_codes
from ..services.customer_code.list import list_customer_codes
from ..services.customer_code.options import search_field_options
from ..services.customer_code.template import build_template_workbook
from ..services.customer_code.update import update_customer_code

# ---------------------------------------------------------------------------
# Whitelists for unknown-key rejection (backend-api-standards, OWASP A04).
# Any query param not in these sets returns 400 immediately.
# ---------------------------------------------------------------------------

_ALLOWED_LIST_KEYS = frozenset({
    "page", "limit", "sortBy", "sortOrder", "q",
    "segment", "code", "customer", "destination",
    "cam", "mob",
    "region",
})

_ALLOWED_OPTION_KEYS = frozenset({"field", "q", "limit"})

# Maximum accepted upload size for the Excel import endpoint (DoS guard).
_MAX_UPLOAD_BYTES: int = 10 * 1024 * 1024  # 10 MB


# ---------------------------------------------------------------------------
# Read controllers
# ---------------------------------------------------------------------------


async def list_customer_codes_controller(
    request: Request,
    query: CustomerCodeListQuery = Depends(),
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[list[CustomerCodePublic]]:
    """``GET /admin/customer-codes`` — paginated, sorted, filtered customer-code list."""
    unknown = set(request.query_params.keys()) - _ALLOWED_LIST_KEYS
    if unknown:
        raise ValidationError(
            f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
        )
    items, meta = await list_customer_codes(query)
    return success(items, meta=meta)


async def field_options_controller(
    request: Request,
    query: CustomerCodeOptionsQuery = Depends(),
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[list[CustomerCodeOption]]:
    """``GET /admin/customer-codes/options`` — async-combobox field options (≤50)."""
    unknown = set(request.query_params.keys()) - _ALLOWED_OPTION_KEYS
    if unknown:
        raise ValidationError(
            f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
        )
    options = await search_field_options(query)
    return success(options)


async def get_customer_code_controller(
    code_id: str,
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[CustomerCodePublic]:
    """``GET /admin/customer-codes/{code_id}`` — fetch a single customer code by ObjectId."""
    return success(await get_customer_code(code_id))


# ---------------------------------------------------------------------------
# Mutation controllers
# ---------------------------------------------------------------------------


async def create_customer_code_controller(
    body: CustomerCodeCreate,
    admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[CustomerCodePublic]:
    """``POST /admin/customer-codes`` — create a new customer code entry."""
    item = await create_customer_code(body, actor_email=admin.emailid)
    return success(item, message="Customer code created")


async def update_customer_code_controller(
    code_id: str,
    body: CustomerCodeUpdate,
    admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[CustomerCodePublic]:
    """``PATCH /admin/customer-codes/{code_id}`` — partial update of a customer code."""
    item = await update_customer_code(code_id, body, actor_email=admin.emailid)
    return success(item, message="Customer code updated")


async def delete_customer_code_controller(
    code_id: str,
    admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[None]:
    """``DELETE /admin/customer-codes/{code_id}`` — hard-delete a customer code."""
    await delete_customer_code(code_id, actor_email=admin.emailid)
    return success(None, message="Customer code deleted")


# ---------------------------------------------------------------------------
# Import controller (multipart — NOT an envelope input; IS an envelope output)
# ---------------------------------------------------------------------------


async def import_customer_codes_controller(
    file: UploadFile = File(...),
    region_id: str = Form(...),
    admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[CustomerCodeImportResult]:
    """``POST /admin/customer-codes/import`` — bulk import from an Excel (.xlsx) file.

    Validates file extension and content-type, enforces a 10 MB size cap
    (DoS guard), then delegates to the import service.  Returns a structured
    ``CustomerCodeImportResult`` summarising inserted/skipped/error rows.

    The content-type of the *outer response* is ``application/json`` (normal
    envelope); only the *uploaded file* is binary.
    """
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise ValidationError(
            "Only .xlsx files are accepted.", details={"field": "file"}
        )

    raw: bytes = await file.read()
    if len(raw) > _MAX_UPLOAD_BYTES:
        raise ValidationError(
            f"File exceeds 10 MB limit ({len(raw):,} bytes).",
            details={"field": "file"},
        )

    result = await import_customer_codes(raw, region_id, actor_email=admin.emailid)
    return success(result, message="Import complete")


# ---------------------------------------------------------------------------
# Template download controller (binary StreamingResponse — NOT an envelope)
# ---------------------------------------------------------------------------


async def download_template_controller(
    _admin: AuthUser = Depends(get_current_admin),
) -> StreamingResponse:
    """``GET /admin/customer-codes/template`` — download blank import template (.xlsx).

    Returns a raw binary ``StreamingResponse``; no JSON envelope is emitted.
    The route registration MUST omit ``response_model`` to prevent FastAPI
    from attempting Pydantic serialisation on a streaming body (ADDENDUM §Area 3 BLOCKER-4).
    """
    data: bytes = build_template_workbook()
    return StreamingResponse(
        BytesIO(data),
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": 'attachment; filename="customer_codes_template.xlsx"'
        },
    )
