import httpx, logging
from datetime import datetime, timedelta
from app.database import SessionLocal
from app.models.exchange_rate import ExchangeRate
from app.config import settings

logger = logging.getLogger(__name__)
CACHE_TTL_HOURS = 6


async def get_usd_kes() -> float:
    """
    1. Check Neon DB for a rate fresher than 6 hours.
    2. If stale, fetch from open.er-api.com (free, no key needed).
    3. On failure, fall back to .env config value.
    """
    db = SessionLocal()
    try:
        cutoff = datetime.utcnow() - timedelta(hours=CACHE_TTL_HOURS)
        cached = (
            db.query(ExchangeRate)
            .filter(
                ExchangeRate.from_ccy == "USD",
                ExchangeRate.to_ccy   == "KES",
                ExchangeRate.fetched_at >= cutoff,
            )
            .order_by(ExchangeRate.fetched_at.desc())
            .first()
        )
        if cached:
            logger.debug("Exchange rate from cache: %.2f", cached.rate)
            return cached.rate
    finally:
        db.close()

    return await _fetch_and_store()


async def _fetch_and_store() -> float:
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get("https://open.er-api.com/v6/latest/USD")
            r.raise_for_status()
            rate = float(r.json()["rates"]["KES"])
    except Exception as e:
        logger.warning("Exchange rate fetch failed: %s — using fallback", e)
        return settings.usd_kes_fallback

    db = SessionLocal()
    try:
        db.add(ExchangeRate(
            from_ccy="USD", to_ccy="KES",
            rate=rate, source="open.er-api.com",
            fetched_at=datetime.utcnow(),
        ))
        db.commit()
        logger.info("Stored fresh exchange rate: 1 USD = %.2f KES", rate)
    except Exception:
        db.rollback()
    finally:
        db.close()

    return rate
