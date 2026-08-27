"""
Application configuration using Pydantic Settings.
All sensitive values are loaded from environment variables.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "AutoFlow AI"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql://flowforge:secret@db:5432/flowforge"

    # JWT
    JWT_SECRET_KEY: str = "change-me-in-production-use-a-strong-random-key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # AI / Gemini
    GEMINI_API_KEY: str = ""

    # Email / SendGrid
    SENDGRID_API_KEY: str = ""
    EMAIL_FROM_ADDRESS: str = ""          # e.g. noreply@yourcompany.com
    EMAIL_FROM_NAME: str = "FlowForge"    # Display name in From: header
    EMAIL_REPLY_TO: str = ""              # Optional reply-to address
    APP_URL: str = "http://localhost:5173"  # Used for CTA button links in emails


    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS
    CORS_ORIGINS: str | list[str] = ["*"]

    def get_cors_origins(self) -> list[str]:
        if isinstance(self.CORS_ORIGINS, str):
            if self.CORS_ORIGINS == "*":
                return ["*"]
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        return self.CORS_ORIGINS

    class Config:
        env_file = ".env.backend"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
