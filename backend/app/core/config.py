"""Application settings: MongoDB connection + seed-admin credentials.

Values are read from environment variables and a local ``.env`` (via
pydantic-settings). Real secrets MUST come from the environment — there is no
hardcoded password fallback in the source tree (OWASP A02).
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, resolved once and cached.

    Field names map to env vars case-insensitively
    (``SEED_ADMIN_PASSWORD`` -> ``seed_admin_password``).
    """

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "marketing_report"
    seed_admin_email: str = "ajayirkal@docketrun.com"
    # No default secret: must come from the environment / .env. When empty,
    # seeding is skipped (a warning is logged) rather than provisioning a
    # known password.
    seed_admin_password: str = ""

    cors_origins: tuple[str, ...] = (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
    )

    # --- Session cookie auth (httpOnly) ---
    # HS256 signing secret for session JWTs. MUST be set in the environment;
    # when empty, login cannot mint a session (a warning is logged) — no
    # insecure default secret ships in source (OWASP A02).
    session_secret: str = ""
    session_cookie_name: str = "app_session"
    session_ttl_seconds: int = 86400  # 24h
    cookie_secure: bool = False  # True in production (HTTPS only)
    cookie_samesite: str = "lax"

    # --- Email / SMTP ---
    # Dev fallback: when smtp_host is empty, emails are logged to the server
    # console (including OTP) so the flow is testable without a mail server.
    # Production: set all SMTP_* env vars.  OTP is NEVER returned in an API
    # response (OWASP A02, user-enumeration prevention).
    #
    # Mailjet relay: SMTP_HOST=in-v3.mailjet.com, SMTP_USER=<API Key>,
    # SMTP_PASSWORD=<Secret Key>, SMTP_FROM=<validated sender>. Use port 587
    # with SMTP_STARTTLS=true (recommended) OR port 465 with SMTP_SSL=true.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "no-reply@jsw-marketing.local"
    smtp_starttls: bool = True
    # Implicit TLS (SMTPS). When true the connection opens with SSL from the
    # start (Mailjet port 465) and smtp_starttls is ignored. Leave false for
    # the STARTTLS path (Mailjet port 587).
    smtp_ssl: bool = False
    app_name: str = "JSW Marketing Reports"
    app_base_url: str = "http://localhost:5173"

    # --- OTP / password policy ---
    otp_length: int = 6
    otp_ttl_seconds: int = 600          # 10 minutes
    otp_max_attempts: int = 5
    otp_resend_interval_seconds: int = 60
    password_min_length: int = 8

    # --- Audit logging ---
    audit_enabled: bool = True
    audit_capture_request_body: bool = True
    audit_capture_response_body: bool = True
    audit_max_body_bytes: int = 16384
    audit_skip_paths: tuple[str, ...] = (
        "/health",
        "/ping",
        "/docs",
        "/openapi.json",
        "/redoc",
        "/favicon.ico",
        "/ws/ping",
        "/",
    )
    audit_skip_path_prefixes: tuple[str, ...] = ("/admin/audit-logs",)

    # --- Scheduler / cron ---
    cron_enabled: bool = True
    audit_heartbeat_minutes: int = 60


@lru_cache
def get_settings() -> Settings:
    """Return the cached singleton settings instance."""
    return Settings()
