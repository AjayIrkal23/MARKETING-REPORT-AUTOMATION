"""Meta endpoints + cross-cutting contract behavior via TestClient.

These tests do not require MongoDB: the meta endpoints are DB-free and the
unknown-param guard runs before any DB access. (TestClient is not used as a
context manager, so the Mongo lifespan does not run.)
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_envelope() -> None:
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    assert body["data"]["status"] == "ok"
    assert "uptime_seconds" in body["data"]


def test_ping_envelope() -> None:
    r = client.get("/ping")
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    assert body["data"]["message"] == "pong"


def test_security_headers_present() -> None:
    r = client.get("/health")
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"


def test_unknown_user_query_param_rejected() -> None:
    # Controller guard rejects unrecognised keys before touching the DB.
    r = client.get("/users", params={"bogus": "1"})
    assert r.status_code == 400
    body = r.json()
    assert body["success"] is False
    assert body["error"]["code"] == "VALIDATION_ERROR"
