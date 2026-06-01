"""MongoDB connection lifecycle (Beanie 2.x + pymongo async client).

Beanie 2.x talks to MongoDB through :class:`pymongo.AsyncMongoClient` (Motor was
retired). A single module-level client is opened on startup and closed on
shutdown. Document models are registered here as the app grows.
"""

from __future__ import annotations

import logging

from beanie import init_beanie
from pymongo import AsyncMongoClient

from .config import get_settings
from ..models import (
    AuditLog,
    CoilPrice,
    CreditReport,
    CreditReportConfig,
    CreditReportIngestion,
    CustomerCode,
    JswStock,
    JswStockConfig,
    JswStockIngestion,
    JvmlStock,
    JvmlStockConfig,
    JvmlStockIngestion,
    Region,
    User,
)

logger = logging.getLogger(__name__)

# All Beanie document models the app persists. Add new models here.
DOCUMENT_MODELS = [
    User,
    AuditLog,
    CustomerCode,
    Region,
    CoilPrice,
    JswStock,
    JswStockConfig,
    JswStockIngestion,
    JvmlStock,
    JvmlStockConfig,
    JvmlStockIngestion,
    CreditReport,
    CreditReportConfig,
    CreditReportIngestion,
]

_client: AsyncMongoClient | None = None


async def init_db() -> None:
    """Open the MongoDB client and initialise Beanie document models."""
    global _client
    settings = get_settings()
    # tz_aware=True so datetimes read back from MongoDB are timezone-aware (UTC),
    # matching how the app writes them (datetime.now(timezone.utc) everywhere).
    # Without this, PyMongo returns naive datetimes and comparisons against an
    # aware `now` raise "can't compare offset-naive and offset-aware datetimes"
    # (e.g. the OTP setup/throttle checks in services/auth/).
    _client = AsyncMongoClient(settings.mongodb_uri, tz_aware=True)
    await init_beanie(database=_client[settings.mongodb_db], document_models=DOCUMENT_MODELS)
    logger.info("Connected to MongoDB (uri=%s, db=%s)", settings.mongodb_uri, settings.mongodb_db)


async def close_db() -> None:
    """Close the MongoDB client if it is open."""
    global _client
    if _client is not None:
        await _client.close()
        _client = None
