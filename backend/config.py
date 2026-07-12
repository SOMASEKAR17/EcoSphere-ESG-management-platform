"""
Centralized application settings.

Every customizable/environment-dependent value lives here and is sourced
from the `.env` file (see `.env.example`). Nothing in the codebase should
hardcode secrets, hosts, ports, or business-tunable defaults — import
`settings` from this module instead.
"""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    DATABASE_URL: str

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 60

    # OAuth - Google
    OAUTH_GOOGLE_CLIENT_ID: str = ""
    OAUTH_GOOGLE_CLIENT_SECRET: str = ""
    OAUTH_GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/callback/google"

    # OAuth - Microsoft (optional)
    OAUTH_MICROSOFT_CLIENT_ID: str = ""
    OAUTH_MICROSOFT_CLIENT_SECRET: str = ""
    OAUTH_MICROSOFT_REDIRECT_URI: str = "http://localhost:8000/auth/callback/microsoft"
    OAUTH_MICROSOFT_TENANT: str = "common"

    # Uploads
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 5

    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"
    FRONTEND_OAUTH_SUCCESS_REDIRECT: str = "http://localhost:3000/auth/success"

    # App
    APP_NAME: str = "EcoSphere API"
    APP_ENV: str = "development"
    CORS_ORIGINS: str = "http://localhost:3000"
    API_V1_PREFIX: str = ""

    # Business defaults (seed-only — live source of truth is the esg_config table)
    DEFAULT_ENV_WEIGHT: float = 40
    DEFAULT_SOCIAL_WEIGHT: float = 30
    DEFAULT_GOVERNANCE_WEIGHT: float = 30
    DEFAULT_ENVIRONMENTAL_SCORE_BASELINE: float = 50

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()