from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = Field(default="development", alias="APP_ENV")
    app_name: str = Field(default="FinPilot AI Backend", alias="APP_NAME")
    app_version: str = Field(default="0.1.0", alias="APP_VERSION")
    api_v1_prefix: str = Field(default="/api/v1", alias="API_V1_PREFIX")
    database_url: str = Field(default="sqlite:///./data/finpilot.db", alias="DATABASE_URL")
    gemini_api_key: str | None = Field(default=None, alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-2.5-flash", alias="GEMINI_MODEL")
    gemini_base_url: str = Field(
        default="https://generativelanguage.googleapis.com/v1beta/models",
        alias="GEMINI_BASE_URL",
    )
    cors_origins: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173,https://fin-pilot-vert.vercel.app",
        alias="CORS_ORIGINS",
    )
    firebase_project_id: str | None = Field(default=None, alias="FIREBASE_PROJECT_ID")
    firebase_service_account_path: str | None = Field(default=None, alias="FIREBASE_SERVICE_ACCOUNT_PATH")
    firebase_service_account_json: str | None = Field(default=None, alias="FIREBASE_SERVICE_ACCOUNT_JSON")
    ai_timeout_seconds: float = Field(default=20.0, alias="AI_TIMEOUT_SECONDS")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
