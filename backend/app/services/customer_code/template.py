"""Customer code service: build a downloadable import template workbook.

Contract: SPEC.md §2.5, ADDENDUM Area 5 (excel utils / template).

This module is the service-layer entry point for the ``GET /template``
controller action.  The heavy lifting (header definitions, styling, column
sizing) lives in ``utils.customer_code.excel`` — this service imports that
function and re-exports it so controllers depend on the service layer, not
the utils layer directly (``service-layer-standards``).

``openpyxl`` is imported lazily inside ``build_template_workbook`` so that
``import app.main`` succeeds even when the package is not installed in the
development environment.  The returned bytes are a valid ``.xlsx`` archive
(PK magic bytes at offset 0) ready for ``StreamingResponse``.
"""

from __future__ import annotations

from ...utils.customer_code.excel import build_template_workbook as _build


def build_template_workbook() -> bytes:
    """Return raw ``.xlsx`` bytes for the customer codes import template.

    The workbook contains one sheet (``"Customer Codes"``) with the canonical
    header row (same casing / ordering as the source SAP file) and one
    illustrative example row showing expected value formats for each column:

    .. code-block:: text

        Segment | code | Customer | Destination | CAM | MOB No. | Head | ROUTE | SHIP TO | SHIP TO CUSTOMER

    Headers are bold with a light-blue fill; columns are auto-sized to the
    widest of the header or example value.

    The function delegates to
    ``utils.customer_code.excel.build_template_workbook`` which owns the
    ``openpyxl`` dependency and ``TEMPLATE_HEADERS`` definition.  Keeping
    the canonical header list in the utils layer means the importer
    (``parse_workbook``) and the template always stay in sync through the
    shared ``HEADER_MAP`` / ``TEMPLATE_HEADERS`` constants.

    Returns:
        Raw bytes of a valid ``.xlsx`` file.  The first two bytes are always
        ``b'PK'`` (ZIP/OOXML magic).  Suitable for streaming directly from
        a ``StreamingResponse`` with content-type
        ``application/vnd.openxmlformats-officedocument.spreadsheetml.sheet``.

    Example (controller usage)::

        from .template import build_template_workbook

        data = build_template_workbook()
        return StreamingResponse(
            BytesIO(data),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": 'attachment; filename="customer_codes_template.xlsx"'},
        )
    """
    return _build()
