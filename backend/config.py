"""
config.py
---------
Pydantic settings configuration with environment variable support.
"""

from pydantic_settings import BaseSettings
from pydantic import Field, field_validator


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    serper_api_key: str = Field(default="", alias="SERPER_API_KEY")

    # Env example: ALLOWED_ORIGINS=http://localhost:5173,https://app.example.com
    allowed_origins: list[str] = Field(
        default=["http://localhost:5173"],
        alias="ALLOWED_ORIGINS",
    )

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def _split_origins(cls, v: object) -> list[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v  # type: ignore[return-value]

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


# Export singleton settings instance
settings = Settings()
