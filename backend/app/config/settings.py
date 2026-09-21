from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import socket

class Settings(BaseSettings):
    database_url: str = "postgresql://japan_user:japan_dev_pass@db:5432/japan_imports_dev"
    remote_database_url: Optional[str] = None
    redis_url: str = "redis://localhost:6379"
    app_env: str = "development"
    usd_kes_fallback: float = 130.0
    scrape_delay_seconds: float = 2.0

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def resolved_database_url(self) -> str:
        url = self.database_url
        if "@db:" in url or "@db/" in url:
            try:
                socket.gethostbyname("db")
            except socket.gaierror:
                return url.replace("@db:", "@localhost:").replace("@db/", "@localhost/")
        return url

settings = Settings()
