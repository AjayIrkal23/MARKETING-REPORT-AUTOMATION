"""Route-level binding test for ``GET|POST /report/export-combined``.

DB-free (TestClient without the lifespan; `get_current_user` overridden and the
`export_combined` service patched). Verifies the controller's optional-body
binding: a GET carries no body (``body is None``) while a POST parses the JSON
exclusions body — the one seam the service-level tests don't exercise.
"""

from __future__ import annotations

from collections.abc import Iterator
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.auth_deps import get_current_user
from app.main import app
from app.schemas.auth import AuthUser
from app.schemas.report import CombinedExportBody

client = TestClient(app, raise_server_exceptions=False)


@pytest.fixture(autouse=True)
def _override_auth() -> Iterator[None]:
    """Authenticate this module's requests, then REMOVE the override after each
    test so it cannot leak into other modules. (Set at module scope it persisted
    for the whole session, making the admin-auth gating tests see this fake
    non-admin user and return 403/400 instead of 401.)"""
    app.dependency_overrides[get_current_user] = lambda: AuthUser(
        emailid="tester@example.com", isAdmin=False
    )
    yield
    app.dependency_overrides.pop(get_current_user, None)

_URL = "/report/export-combined?date=23-06-2026&report_type=jsw&days=include&sheets=rake_totals"


def test_get_export_binds_no_body() -> None:
    """A GET (no body) reaches the service with ``body=None`` and streams bytes."""
    svc = AsyncMock(return_value=b"PKxlsxbytes")
    with patch("app.controllers.report.export_combined", new=svc):
        r = client.get(_URL)
    assert r.status_code == 200
    assert r.content == b"PKxlsxbytes"
    assert svc.call_args.args[1] is None  # second positional arg = body


def test_post_export_parses_exclusions_body() -> None:
    """A POST parses the JSON body into a ``CombinedExportBody`` with exclusions."""
    svc = AsyncMock(return_value=b"PKxlsxbytes")
    body = {
        "exclusions": {"KKU": {"keys": ["k1", "k2"], "subtract": 12.5}},
        "transport_subtract": {"ROAD": 12.5},
    }
    with patch("app.controllers.report.export_combined", new=svc):
        r = client.post(_URL, json=body)
    assert r.status_code == 200
    passed = svc.call_args.args[1]
    assert isinstance(passed, CombinedExportBody)
    assert passed.exclusions["KKU"].subtract == 12.5
    assert passed.exclusions["KKU"].keys == ["k1", "k2"]
    assert passed.transport_subtract == {"ROAD": 12.5}
