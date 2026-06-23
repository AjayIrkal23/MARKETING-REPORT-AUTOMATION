"""One-time cleanup: remove deprecated ship_to_2 / ship_to_customer_2 fields.

Run after deploying the customer-code schema change that removes the second
ship-to pair from the model, schemas, and UI.

Usage (from repo root, with backend venv active):

    cd backend
    source .venv/bin/activate
    python -m app.scripts.cleanup_ship_to_2

The script uses Motor directly so it does not depend on Beanie document shape.
"""

from __future__ import annotations

import asyncio
import os

from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGODB_DB", "marketing_report_automation")
COLLECTION = "customer_codes"

FIELDS = ["ship_to_2", "ship_to_customer_2"]


async def main() -> None:
    client: AsyncIOMotorClient = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]
    coll = db[COLLECTION]

    result = await coll.update_many(
        {"$or": [{field: {"$exists": True}} for field in FIELDS]},
        {"$unset": {field: "" for field in FIELDS}},
    )

    print(f"Matched documents: {result.matched_count}")
    print(f"Modified documents: {result.modified_count}")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
