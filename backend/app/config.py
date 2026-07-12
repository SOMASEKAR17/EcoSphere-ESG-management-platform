"""
Central application settings.

Every customizable / environment-specific value used anywhere in the app
is defined here as a field, sourced from environment variables (and the
.env file in local development via pydantic-settings). Nothing in the
rest of the codebase should hardcode a secret, URL, port, or tunable
constant — it should be added here and referenced via `settings.<FIELD>`.
"""
from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ---- App / server -----------------------------------------------------
    APP_NAME: str = "EcoSphere ESG Management Platform"
    APP_ENV: str = "development"  # development | production
    DEBUG: bool = True
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000

    # ---- Database -----------------------------------------------------------
    # Matches the docker-compose Postgres container (ecosphere-db), exposed
    # on host port 5433 to avoid clashing with a local Postgres/pgAdmin.
    DATABASE_URL: str = "postgresql://esg_admin:esg_secure_password@localhost:5433/ecosphere_operational"

    # ---- JWT / Auth -----------------------------------------------------------
    JWT_SECRET_KEY: str = "change-this-secret-in-your-.env-file"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 60

    # ---- OAuth: Google (primary provider) --------------------------------
    OAUTH_GOOGLE_CLIENT_ID: Optional[str] = None
    OAUTH_GOOGLE_CLIENT_SECRET: Optional[str] = None
    OAUTH_GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/callback/google"

    # ---- OAuth: Microsoft (optional — only activates if configured) ------
    OAUTH_MICROSOFT_CLIENT_ID: Optional[str] = None
    OAUTH_MICROSOFT_CLIENT_SECRET: Optional[str] = None
    OAUTH_MICROSOFT_TENANT: str = "common"
    OAUTH_MICROSOFT_REDIRECT_URI: str = "http://localhost:8000/auth/callback/microsoft"

    # Where the backend redirects the browser after a successful OAuth
    # callback, with ?token=<jwt> appended.
    FRONTEND_OAUTH_SUCCESS_REDIRECT: str = "http://localhost:3000/auth/success"

    # ---- File uploads (proof images/PDFs) ---------------------------------
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 5

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    # ---- CORS / Frontend ---------------------------------------------------
    FRONTEND_URL: str = "http://localhost:3000"
    CORS_ALLOW_ORIGINS: str = "http://localhost:3000"  # comma-separated list

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ALLOW_ORIGINS.split(",") if origin.strip()]

    # ---- Scoring engine defaults (all admin-configurable at runtime via
    # esg_config, these are only the fallback/seed values) ------------------
    DEFAULT_ENV_WEIGHT: float = 40.0
    DEFAULT_SOCIAL_WEIGHT: float = 30.0
    DEFAULT_GOVERNANCE_WEIGHT: float = 30.0
    # Neutral baseline score used when there isn't enough underlying data
    # yet to compute a real score (e.g. a department with no goals) —
    # keeps the API returning a sane number instead of crashing or null.
    DEFAULT_ENVIRONMENTAL_SCORE_BASELINE: float = 50.0


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
