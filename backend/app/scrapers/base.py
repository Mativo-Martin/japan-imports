import asyncio, httpx, json, logging
from abc import ABC, abstractmethod
from datetime import datetime
from typing import AsyncIterator
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from app.database import SessionLocal
from app.models.car_listings import CarListing

logger = logging.getLogger(__name__)

class RateLimiter:
    """Token-bucket rate limiter — polite to target servers."""
    def __init__(self, calls_per_second: float = 0.5):
        self._delay = 1.0 / calls_per_second
        self._last = 0.0

    async def wait(self):
        now = asyncio.get_event_loop().time()
        elapsed = now - self._last
        if elapsed < self._delay:
            await asyncio.sleep(self._delay - elapsed)
        self._last = asyncio.get_event_loop().time()


class BaseScraper(ABC):
    SOURCE   = ""
    BASE_URL = ""
    HEADERS  = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
    }

    def __init__(self, calls_per_second: float = 0.4):
        self._limiter = RateLimiter(calls_per_second)

    @retry(
        stop=stop_after_attempt(4),
        wait=wait_exponential(multiplier=1, min=3, max=30),
        retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.TimeoutException)),
        reraise=True,
    )
    async def fetch(self, url: str, params: dict = None) -> str:
        await self._limiter.wait()
        async with httpx.AsyncClient(
            headers=self.HEADERS,
            timeout=httpx.Timeout(30.0),
            follow_redirects=True,
        ) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            logger.info("[%s] GET %s → %d", self.SOURCE, url, resp.status_code)
            return resp.text

    @abstractmethod
    def parse(self, html: str, page: int) -> list[dict]:
        """Return list of raw listing dicts from one page of HTML."""

    def save_batch(self, listings: list[dict]) -> int:
        """Upsert listings into Neon; return count of new records."""
        if not listings:
            return 0
        db = SessionLocal()
        new = 0
        try:
            for item in listings:
                sid = item.get("source_id", "")
                if not sid:
                    continue
                existing = db.query(CarListing).filter_by(source_id=sid).first()
                if existing:
                    existing.price_usd  = item.get("price_usd", existing.price_usd)
                    existing.updated_at = datetime.utcnow()
                else:
                    db.add(CarListing(
                        source=self.SOURCE,
                        scraped_at=datetime.utcnow(),
                        **{k: v for k, v in item.items()
                           if k in CarListing.__table__.columns.keys()}
                    ))
                    new += 1
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error("[%s] DB error: %s", self.SOURCE, e)
        finally:
            db.close()
        return new

    async def run(self, max_pages: int = 100) -> int:
        total = 0
        for page in range(1, max_pages + 1):
            try:
                html     = await self.fetch(self.BASE_URL, self.page_params(page))
                listings = self.parse(html, page)
                if not listings:
                    logger.info("[%s] No listings on page %d — stopping", self.SOURCE, page)
                    break
                saved = self.save_batch(listings)
                total += saved
                logger.info("[%s] Page %d: %d parsed, %d new (total %d)",
                            self.SOURCE, page, len(listings), saved, total)
            except Exception as e:
                logger.error("[%s] Page %d failed: %s", self.SOURCE, page, e)
                break
        return total

    def page_params(self, page: int) -> dict:
        """Override per scraper — default offset pagination."""
        return {"page": page}
