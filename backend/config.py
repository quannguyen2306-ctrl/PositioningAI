"""
config.py
---------
Pydantic settings configuration with environment variable support.
"""

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    serper_api_key: str = Field(default="", alias="SERPER_API_KEY")
    google_api_key: str = Field(default="", alias="GOOGLE_API_KEY")
    anthropic_api_key: str = Field(default="", alias="ANTHROPIC_API_KEY")
    perplexity_api_key: str = Field(default="", alias="PERPLEXITY_API_KEY")

    class Config:
        env_file = ".env"
        case_sensitive = False


# Export singleton settings instance
settings = Settings()
