"""Stale-folder cleanup service package.

Public surface:
- ``get_config`` / ``upsert_config`` — singleton policy get + save (config_service).
- ``run_cleanup`` — purge stale date folders for the configured base paths (runner).
"""

from __future__ import annotations

from .config_service import get_config, upsert_config
from .runner import run_cleanup

__all__ = ["get_config", "upsert_config", "run_cleanup"]
