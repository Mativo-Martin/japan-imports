from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    redis_url: str = "redis://localhost:6379"
    app_env: str = "development"
    usd_kes_fallback: float=130.0
    scrape_delay_seconds: float = 2.0

    class Config:
        env_file = "../.env"

settings = Settings()
