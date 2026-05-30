"""Password hashing helpers (bcrypt).

Passwords are NEVER stored in plain text. ``User.password`` holds the bcrypt
hash produced by :func:`hash_password`; :func:`verify_password` checks a
candidate against that hash at login time.
"""

from __future__ import annotations

import bcrypt


def hash_password(plain: str) -> str:
    """Return a salted bcrypt hash for the given plaintext password."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Return ``True`` if ``plain`` matches the stored bcrypt ``hashed`` value."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False
