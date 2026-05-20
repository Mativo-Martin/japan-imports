import re, json, logging
import httpx
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from datetime import datetime
from app.database import SessionLocal
from app.models.car_listings import CarListing

logger = logging.getLogger(__name__)

FUEL_MAP  = {"gasoline":"petrol","petrol":"petrol","diesel":"diesel",
             "hybrid":"hybrid","electric":"electric","ev":"electric"}
TRANS_MAP = {"at":"automatic","auto":"automatic","automatic":"automatic",
             "mt":"manual","manual":"manual","cvt":"cvt"}

SBT_MAKES = [
    "TOYOTA", "NISSAN", "HONDA", "MAZDA",
    "SUBARU", "SUZUKI", "MITSUBISHI", "DAIHATSU",
]


class SBTScraper:
    SOURCE   = "sbt"
    BASE_URL = "https://www.sbtjapan.com/used-cars/search"
    HEADERS  = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept":          "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer":         "https://www.sbtjapan.com/",
    }
    DELAY = 2.5

    @retry(
        stop=stop_after_attempt(4),
        wait=wait_exponential(multiplier=1, min=3, max=30),
        retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.TimeoutException)),
        reraise=True,
    )
    async def _fetch(self, params: dict) -> str:
        import asyncio
        await asyncio.sleep(self.DELAY)
        async with httpx.AsyncClient(
            headers=self.HEADERS, timeout=30.0, follow_redirects=True
        ) as client:
            r = await client.get(self.BASE_URL, params=params)
            r.raise_for_status()
            logger.info("[sbt] GET %s → %d", r.url, r.status_code)
            return r.text

    def _find_cards(self, soup: BeautifulSoup) -> list:
        cards = soup.select(".card-product")
        if cards:
            logger.info("[sbt] selector '.card-product' → %d cards", len(cards))
            return cards
        return []

    def _parse_card(self, card, make: str) -> dict | None:
        try:
            text = card.get_text(separator="\n", strip=True)
            lines = [l.strip() for l in text.split("\n") if l.strip()]

            # ── Stock ID ──
            sid = ""
            for i, line in enumerate(lines):
                if "Stock Id:" in line or "Stock ID:" in line:
                    sid = lines[i + 1] if i + 1 < len(lines) else ""
                    break
            if not sid:
                # Fallback: any 2-letter + 4+ digit code like AJ1907
                m = re.search(r"\b([A-Z]{2}\d{4,})\b", text)
                sid = m.group(1) if m else ""
            if not sid:
                return None

            # ── Price: "Vehicle Price" section, first USD amount ──
            price = None
            in_vehicle_price = False
            for i, line in enumerate(lines):
                if "Vehicle Price" in line:
                    in_vehicle_price = True
                    continue
                if in_vehicle_price and line == "USD":
                    if i + 1 < len(lines):
                        raw = lines[i + 1].replace(",", "")
                        m = re.search(r"(\d+(?:,\d+)*)", raw)
                        if m:
                            v = float(m.group().replace(",", ""))
                            if 300 < v < 500_000:
                                price = v
                                break
                if in_vehicle_price and "Total Price" in line:
                    break  # Stop before total price section
            if not price:
                # Fallback: first USD amount after any "USD" line
                for i, line in enumerate(lines):
                    if line == "USD":
                        if i + 1 < len(lines):
                            raw = lines[i + 1].replace(",", "")
                            m = re.search(r"(\d+(?:,\d+)*)", raw)
                            if m:
                                v = float(m.group().replace(",", ""))
                                if 300 < v < 500_000:
                                    price = v
                                    break

            if not price:
                logger.debug("[sbt] card %s: no price", sid)
                return None

            # ── Year ──
            year = None
            # First line is usually "YYYY/M TOYOTA MODEL"
            m = re.search(r"^(20\d{2})/\d{1,2}", text)
            if m:
                year = int(m.group(1))
            if not year or year < 2018:
                logger.debug("[sbt] card %s: no valid year", sid)
                return None

            # ── Model ──
            model = ""
            # From first line: "2023/4 TOYOTA AQUA G" → "AQUA G"
            first_line = lines[0] if lines else ""
            m = re.search(rf"^{year}/\d{{1,2}}\s+{re.escape(make)}\s+(.+)$", first_line, re.I)
            if m:
                model = m.group(1).strip()

            # ── Mileage ──
            mileage = None
            m = re.search(r"([\d,]+)\s*km", text, re.I)
            if m:
                mileage = int(m.group(1).replace(",", ""))

            # ── Engine ──
            engine = None
            m = re.search(r"([\d,]+)\s*cc", text, re.I)
            if m:
                engine = int(m.group(1).replace(",", ""))

            # ── Transmission ──
            trans = "automatic"
            for line in lines:
                l = line.lower()
                if l == "mt" or l == "manual":
                    trans = "manual"
                    break
                elif l == "cvt":
                    trans = "cvt"
                    break
                elif l == "at" or l == "automatic":
                    trans = "automatic"
                    break

            # ── Fuel ──
            fuel_type = "petrol"
            for line in lines:
                l = line.lower()
                if "hybrid" in l:
                    fuel_type = "hybrid"
                    break
                elif "diesel" in l:
                    fuel_type = "diesel"
                    break
                elif "electric" in l or l == "ev":
                    fuel_type = "electric"
                    break

            # ── URL ──
            href = ""
            a = card.select_one("a[href]")
            if a:
                href = a.get("href", "")
            url = ("https://www.sbtjapan.com" + href) if href.startswith("/") else (href or None)

            # ── Images ──
            imgs = [img["src"] for img in card.select("img[src]") if "carphoto" in img.get("src", "")]

            return {
                "source_id":    f"sbt_{sid}",
                "url":          url,
                "make":         make.title(),
                "model":        model,
                "year":         year,
                "mileage_km":   mileage,
                "engine_cc":    engine,
                "fuel_type":    fuel_type,
                "transmission": trans,
                "body_type":    "",
                "price_usd":    price,
                "images":       json.dumps(imgs[:5]),
                "raw_data":     str(card)[:2000],
            }
        except Exception as e:
            logger.debug("[sbt] card parse error: %s", e)
            return None

    def _save_batch(self, listings: list) -> int:
        if not listings:
            return 0
        db = SessionLocal(); new = 0
        try:
            for item in listings:
                existing = db.query(CarListing).filter_by(source_id=item["source_id"]).first()
                if existing:
                    existing.price_usd = item["price_usd"]
                else:
                    valid = {k: v for k, v in item.items()
                             if k in CarListing.__table__.columns.keys()}
                    db.add(CarListing(source=self.SOURCE, scraped_at=datetime.utcnow(), **valid))
                    new += 1
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error("[sbt] DB error: %s", e)
        finally:
            db.close()
        return new

    async def run(self, max_pages: int = 50) -> int:
        import asyncio
        total = 0
        for make in SBT_MAKES:
            logger.info("[sbt] scraping make: %s", make)
            for page in range(1, max_pages + 1):
                params = {
                    "make[]":    make,
                    "year_from": "2018",
                    "currency":  "USD",
                    "p":         str(page),
                }
                try:
                    html  = await self._fetch(params)
                    soup  = BeautifulSoup(html, "html.parser")
                    cards = self._find_cards(soup)
                    if not cards:
                        logger.info("[sbt] %s p%d — no cards", make, page)
                        break

                    listings = [c for c in (self._parse_card(card, make) for card in cards) if c]
                    saved    = self._save_batch(listings)
                    total   += saved
                    logger.info("[sbt] %s p%d: %d cards, %d saved", make, page, len(cards), saved)

                    # Debug: if all failed, show why
                    if not listings and cards:
                        debug = cards[0].get_text(separator="\n", strip=True)[:400]
                        logger.warning("[sbt] all cards failed. sample:\n%s", debug)

                    # Pagination: look for next page link
                    has_next = False
                    for link in soup.select("a"):
                        href = link.get("href", "")
                        txt  = link.get_text(strip=True)
                        if f"p={page+1}" in href or txt == str(page+1):
                            has_next = True
                            break
                    if not has_next:
                        break
                except Exception as e:
                    logger.error("[sbt] %s p%d: %s", make, page, e)
                    break
                await asyncio.sleep(self.DELAY)
        return total