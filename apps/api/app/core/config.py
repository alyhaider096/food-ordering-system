from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Flavour Heaven API"
    api_v1_prefix: str = "/api/v1"
    database_url: str = Field(alias="API_DATABASE_URL")
    secret_key: str = Field(alias="API_SECRET_KEY")
    customer_data_key: str = Field(alias="CUSTOMER_DATA_KEY")
    frontend_origin: str = Field(default="http://127.0.0.1:3000", alias="FRONTEND_ORIGIN")
    public_app_url: str = Field(default="http://127.0.0.1:3000", alias="PUBLIC_APP_URL")
    business_slug: str = Field(default="flavour-heaven", alias="FLAVOUR_HEAVEN_BUSINESS_SLUG")
    outlet_slug: str = Field(default="e-11-markaz", alias="FLAVOUR_HEAVEN_OUTLET_SLUG")
    whatsapp_business_number: str = Field(default="923005055377", alias="WHATSAPP_BUSINESS_NUMBER")
    access_token_minutes: int = Field(default=30, alias="ACCESS_TOKEN_MINUTES")
    refresh_token_days: int = Field(default=7, alias="REFRESH_TOKEN_DAYS")

    @property
    def cors_origins(self) -> list[str]:
        origins = [self.frontend_origin, self.public_app_url]
        return list(dict.fromkeys(origin.rstrip("/") for origin in origins if origin))


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
