"""Shared pytest fixtures / test isolation for the backend suite."""

from __future__ import annotations

from collections.abc import Iterator

import pytest

from app.main import app


@pytest.fixture(autouse=True)
def _isolate_dependency_overrides() -> Iterator[None]:
    """Restore FastAPI dependency overrides to their pre-test state after each test.

    ``app.dependency_overrides`` lives on the shared module-global ``app``; a test
    that sets one and forgets to clean up poisons every later test in the session
    (this is exactly what made the admin-auth gating tests flip 401 → 403/400 when
    run in the full suite). Tests that need an override should set it inside their
    own fixture (which nests inside this one); this guard guarantees a clean slate.
    """
    saved = dict(app.dependency_overrides)
    yield
    app.dependency_overrides.clear()
    app.dependency_overrides.update(saved)
