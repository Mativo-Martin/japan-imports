import asyncio, logging
from celery import Celery, group
from celery.schedules import crontab
from app.scrapers.beforward    import BeForwardScraper
from app.scrapers.sbt import SBTScraper
from app.scrapers.peachcars import PeachCarsScraper
from app.config import settings

logger = logging.getLogger(__name__)

celery_app = Celery(
    "japan_car",
    broker=settings.redis_url,
    backend=settings.redis_url,
)
celery_app.conf.update(
    task_serializer="json",
    result_expires=3600,
    worker_prefetch_multiplier=1,
    task_acks_late=True,          # re-queue if worker crashes mid-task
    beat_schedule={
        "daily-scrape": {
            "task": "app.tasks.scrape_tasks.run_all_scrapers",
            "schedule": crontab(hour=1, minute=0),   # 1 AM daily
        },
    },
)

SCRAPERS = {
    "beforward":    BeForwardScraper,
    "peachcars": PeachCarsScraper,
    "sbt": SBTScraper,
}

@celery_app.task(bind=True, max_retries=2, default_retry_delay=60)
def scrape_source(self, source_name: str, max_pages: int = 100):
    cls = SCRAPERS.get(source_name)
    if not cls:
        raise ValueError(f"Unknown source: {source_name}")
    scraper = cls()
    try:
        total = asyncio.run(scraper.run(max_pages=max_pages))
        logger.info("[task] %s done — %d new listings", source_name, total)
        return {"source": source_name, "new": total}
    except Exception as exc:
        logger.error("[task] %s failed: %s", source_name, exc)
        raise self.retry(exc=exc)

@celery_app.task
def run_all_scrapers():
    """Fan out all scrapers in parallel, then trigger ETL."""
    job = group(scrape_source.s(name) for name in SCRAPERS)
    result = job.apply_async()
    return result.id
