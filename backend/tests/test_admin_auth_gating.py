"""Admin route auth-gating tests via TestClient.

Verifies that ``GET /admin/users`` (and the collection-level admin routes) are
protected by the ``get_current_admin`` dependency before any DB access occurs.
TestClient is NOT used as a context manager so the Mongo lifespan (init_db +
seed_admin) never runs — these tests are fully DB-free.

Expected behaviour (contract §3.6 / §3.8):
- No session cookie  → 401 UNAUTHORIZED  (get_current_user raises first)
- Malformed/invalid token in cookie → 401 UNAUTHORIZED
- Valid token but non-admin → 403 FORBIDDEN   (get_current_admin raises)

Because the dependency chain is ``get_current_admin → get_current_user``, both
401 and 403 are asserted via the standard error envelope shape.
Contract: §3.11 of USER-MANAGEMENT-PLAN.md.
Mirrors the TestClient style of ``test_meta_api.py``.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app

# Module-level client — no context manager, lifespan does not run.
client = TestClient(app, raise_server_exceptions=False)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_ADMIN_USERS_URL = "/admin/users"


def _assert_error_envelope(body: dict, expected_code: str) -> None:
    """Assert the standard error envelope shape and error code."""
    assert body.get("success") is False, f"Expected success=false, got: {body}"
    error = body.get("error", {})
    assert "code" in error, f"'code' key missing from error envelope: {body}"
    assert "message" in error, f"'message' key missing from error envelope: {body}"
    assert error["code"] == expected_code, (
        f"Expected code={expected_code!r}, got {error['code']!r}"
    )


# ---------------------------------------------------------------------------
# No credentials at all → 401
# ---------------------------------------------------------------------------


def test_no_cookie_returns_401() -> None:
    """Unauthenticated request (no cookie) must be rejected with 401 UNAUTHORIZED."""
    r = client.get(_ADMIN_USERS_URL)
    assert r.status_code == 401
    _assert_error_envelope(r.json(), "UNAUTHORIZED")


def test_no_cookie_does_not_return_422() -> None:
    """The guard must fire before query-param validation — never a 422 on missing auth."""
    r = client.get(_ADMIN_USERS_URL)
    assert r.status_code != 422


# ---------------------------------------------------------------------------
# Malformed / invalid token in cookie → 401
# ---------------------------------------------------------------------------


def test_garbage_token_returns_401() -> None:
    """A syntactically invalid session cookie must be rejected with 401."""
    r = client.get(_ADMIN_USERS_URL, cookies={"session": "not-a-valid-jwt"})
    assert r.status_code == 401
    _assert_error_envelope(r.json(), "UNAUTHORIZED")


def test_empty_token_returns_401() -> None:
    """An empty string cookie value must be rejected with 401."""
    r = client.get(_ADMIN_USERS_URL, cookies={"session": ""})
    assert r.status_code == 401
    _assert_error_envelope(r.json(), "UNAUTHORIZED")


def test_tampered_token_returns_401() -> None:
    """A base64-looking but unsigned blob must fail token decoding → 401."""
    # Looks like a JWT structure but the signature is invalid.
    fake = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJoYWNrZXJAZXZpbC5jb20ifQ.INVALIDSIG"
    r = client.get(_ADMIN_USERS_URL, cookies={"session": fake})
    assert r.status_code == 401
    _assert_error_envelope(r.json(), "UNAUTHORIZED")


# ---------------------------------------------------------------------------
# Error envelope structure
# ---------------------------------------------------------------------------


def test_401_envelope_has_required_keys() -> None:
    """The 401 response must carry the standard error envelope (success/error/code/message)."""
    r = client.get(_ADMIN_USERS_URL)
    body = r.json()
    assert "success" in body
    assert "error" in body
    assert "code" in body["error"]
    assert "message" in body["error"]


def test_401_envelope_success_is_false() -> None:
    r = client.get(_ADMIN_USERS_URL)
    assert r.json()["success"] is False


# ---------------------------------------------------------------------------
# Other admin endpoints also gated (no cookie → 401)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "method, path",
    [
        ("GET", "/admin/users"),
        ("GET", "/admin/users/options"),
        ("GET", "/admin/users/000000000000000000000001"),
        ("PATCH", "/admin/users/000000000000000000000001"),
        ("DELETE", "/admin/users/000000000000000000000001"),
        ("POST", "/admin/users/000000000000000000000001/disable"),
        ("POST", "/admin/users/000000000000000000000001/enable"),
        ("POST", "/admin/users/000000000000000000000001/reset-password"),
    ],
)
def test_all_admin_routes_gated_without_cookie(method: str, path: str) -> None:
    """Every admin endpoint must reject unauthenticated requests with 401."""
    r = client.request(method, path)
    # Guard fires before DB; no mongo needed.
    assert r.status_code == 401, (
        f"{method} {path} returned {r.status_code}, expected 401"
    )
    _assert_error_envelope(r.json(), "UNAUTHORIZED")


def test_post_create_user_gated_without_cookie() -> None:
    """POST /admin/users (create) must also be gated — body not required for the auth check."""
    r = client.post(_ADMIN_USERS_URL, json={"name": "Test", "emailid": "t@t.com", "isAdmin": False})
    assert r.status_code == 401
    _assert_error_envelope(r.json(), "UNAUTHORIZED")
