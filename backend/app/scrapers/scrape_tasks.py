"""
Re-export task definitions from app.tasks.scrape_tasks for backward compatibility.
"""
from app.tasks.scrape_tasks import (
    celery_app,
    SCRAPERS,
    scrape_source,
    run_all_scrapers,
)

__all__ = [
    "celery_app",
    "SCRAPERS",
    "scrape_source",
    "run_all_scrapers",
]
