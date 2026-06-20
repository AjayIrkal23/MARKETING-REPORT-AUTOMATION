"""Shared post-ingest duplicate cleanup for report collections.

Computes a deterministic hash of a coerced source row and removes older
duplicates within the same ``report_date``, keeping only the most recently
inserted document per identical row.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any

from beanie import Document


def _serialize_value(value: Any) -> str:
    """Stringify a value for stable hashing.

    Datetimes are converted to ISO format with an explicit UTC suffix so
    timezone-naive and timezone-aware values hash consistently. Everything
    else uses ``str()``.
    """
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat()
    return str(value)


def _row_hash(coerced: dict[str, Any], exclude: set[str] | None = None) -> str:
    """Return a deterministic SHA-256 hash of a coerced source row.

    Args:
        coerced: The row dict (e.g. the output of ``coerce_value`` for every
            mapped column).
        exclude: Keys to ignore — typically meta fields such as ``report_date``,
            ``source_file``, ``created_at``, ``updated_at``, ``row_hash``, and
            any internal identifiers.

    Returns:
        A 64-character hex digest.
    """
    exclude = exclude or set()
    canonical = {
        k: _serialize_value(v)
        for k, v in sorted(coerced.items())
        if k not in exclude and v is not None
    }
    payload = json.dumps(canonical, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


async def cleanup_duplicates(
    model: type[Document],
    report_date: str,
) -> int:
    """Delete older duplicate documents for *report_date*, keep the newest.

    Duplicates are identified by ``row_hash``. Documents that do not yet have a
    stored ``row_hash`` have one computed on the fly from their source fields.
    For each group the document with the newest ``created_at`` is kept
    (``_id`` desc is used as a tie-breaker).

    Args:
        model: Beanie document class (``JswStock``, ``JvmlStock``,
            ``CreditReport``).
        report_date: Date string in ``"dd-mm-yyyy"`` format.

    Returns:
        Number of duplicate documents deleted.
    """
    docs = await model.find({"report_date": report_date}).to_list()
    if len(docs) <= 1:
        return 0

    meta_exclude = {
        "id",
        "_id",
        "report_date",
        "source_file",
        "created_at",
        "updated_at",
        "row_hash",
    }

    groups: dict[str, list[Any]] = {}
    for doc in docs:
        h = getattr(doc, "row_hash", None)
        if not h:
            h = _row_hash(doc.model_dump(), exclude=meta_exclude)
        groups.setdefault(h, []).append(doc)

    delete_ids: list[Any] = []
    for group in groups.values():
        if len(group) <= 1:
            continue
        # Newest first; _id desc breaks ties deterministically.
        sorted_docs = sorted(
            group,
            key=lambda d: (d.created_at or datetime.min, d.id),
            reverse=True,
        )
        delete_ids.extend(doc.id for doc in sorted_docs[1:])

    if delete_ids:
        await model.find({"_id": {"$in": delete_ids}}).delete()

    return len(delete_ids)
