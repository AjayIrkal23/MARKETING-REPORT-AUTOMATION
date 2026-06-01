"""Customer-code lookup for JVML Stock ingest: batch-resolve normalized party codes."""

from __future__ import annotations

from ...models.customer_code import CustomerCode


async def build_customer_map(
    normalized_codes: set[str],
) -> dict[str, tuple[str | None, str | None]]:
    """Return ``{normalized_code: (customer_name, customer_code_id_hex)}``.

    Queries CustomerCode once with ``$in`` — O(1) DB round-trips regardless
    of row count (``backend-performance-standards``).
    First document found per code wins (code is NOT unique in customer_codes).
    Returns ``{}`` immediately when *normalized_codes* is empty.

    Args:
        normalized_codes: Set of party codes after ``lstrip("0")``.

    Returns:
        Dict mapping each code to ``(customer_name, str(doc.id))``; codes
        not found in customer_codes map to ``(None, None)``.
    """
    if not normalized_codes:
        return {}

    docs: list[CustomerCode] = await CustomerCode.find(
        {"code": {"$in": list(normalized_codes)}}
    ).to_list()

    result: dict[str, tuple[str | None, str | None]] = {}
    for doc in docs:
        # First match per code wins — do not overwrite.
        if doc.code not in result:
            result[doc.code] = (doc.customer, str(doc.id))

    return result
