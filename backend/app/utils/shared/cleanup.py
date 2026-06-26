"""Delete stale date-named ingestion folders to bound disk usage.

Ingestion pollers create one ``<base_path>/<dd-mm-yyyy>/`` folder per report
day (credit-report regions nest a ``CREDITREPORT/<zone>/`` subtree inside it).
This purges whole date folders older than the retention window — files only;
DB ingestion records are never touched.
"""

from __future__ import annotations

import logging
import os
import shutil
from datetime import date, datetime

logger = logging.getLogger(__name__)

# Folder-name convention shared by all three pollers (see */poller.py).
DATE_FMT = "%d-%m-%Y"


def _folder_date(name: str) -> date | None:
    """Return the date encoded in *name* (``dd-mm-yyyy``), or ``None``."""
    try:
        return datetime.strptime(name, DATE_FMT).date()
    except ValueError:
        return None


def purge_old_date_folders(
    base_path: str, *, today: date, retention_days: int = 5
) -> list[str]:
    """Delete ``<base_path>/<dd-mm-yyyy>`` folders older than *retention_days*.

    A direct child dir is removed only when its name parses as a ``dd-mm-yyyy``
    date and ``(today - that_date).days > retention_days``. Non-date dirs, loose
    files, and the base path itself are left untouched. Returns the deleted
    folder paths.

    Never raises: a missing ``base_path`` or an un-removable folder is logged
    and skipped so the caller (a cron job) always completes.
    """
    if not base_path or not os.path.isdir(base_path):
        return []

    deleted: list[str] = []
    for name in os.listdir(base_path):
        folder = os.path.join(base_path, name)
        if not os.path.isdir(folder):
            continue
        folder_date = _folder_date(name)
        if folder_date is None:
            continue
        if (today - folder_date).days <= retention_days:
            continue
        try:
            shutil.rmtree(folder)
            deleted.append(folder)
            logger.info("cleanup: removed stale ingestion folder %s.", folder)
        except OSError:
            logger.warning("cleanup: failed to remove %s.", folder, exc_info=True)
    return deleted
