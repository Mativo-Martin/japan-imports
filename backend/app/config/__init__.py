"""Configuration module for data sources and app settings."""
from .settings import settings
from app.config.sources import IMPORT_SOURCES, LOCAL_SOURCES, ALL_SOURCES, IMPORT_SOURCES_SQL, LOCAL_SOURCES_SQL
__all__ = [
    "IMPORT_SOURCES",
    "LOCAL_SOURCES",
    "ALL_SOURCES",
    "IMPORT_SOURCES_SQL",
    "LOCAL_SOURCES_SQL",
]
