"""
beforward.py — BE FORWARD scraper (v11 — httpx primary, no Playwright)
"""

import re, json, logging, asyncio, certifi
import httpx
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from datetime import datetime
from app.database import SessionLocal
from app.models.car_listings import CarListing

logger = logging.getLogger(__name__)

FUEL_MAP = {
    "gasoline":"petrol","petrol":"petrol","gas":"petrol",
    "diesel":"diesel","hybrid":"hybrid",
    "electric":"electric","ev":"electric","phev":"hybrid",
}
TRANS_MAP = {
    "at":"automatic","auto":"automatic","automatic":"automatic",
    "mt":"manual","manual":"manual","cvt":"cvt",
}

MAKE_IDS = {
    "TOYOTA": 1, "HONDA": 2, "NISSAN": 3, "MAZDA": 4,
    "MITSUBISHI": 5, "SUBARU": 6, "SUZUKI": 7,
}
BF_MAKES = list(MAKE_IDS.keys())


class BeForwardScraper:
    SOURCE = "beforward"
    BASE   = "https://www.beforward.jp"

    HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.beforward.jp/",
    }
    DELAY = 2.5

    def _url(self, make: str, page: int) -> str:
        make_id = MAKE_IDS.get(make, 1)
        return (
            f"{self.BASE}/stocklist/"
            f"make={make_id}/minyear=2018/"
            f"sar=steering/steering=Right/tp_country_id=27/"
            f"p={page}/"
        )

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=3, max=20),
        retry=retry_if_exception_type(
            (httpx.HTTPStatusError, httpx.TimeoutException, httpx.ConnectError)
        ),
        reraise=True,
    )
    async def _fetch(self, url: str) -> str:
        await asyncio.sleep(self.DELAY)
        async with httpx.AsyncClient(
            headers=self.HEADERS, timeout=25.0,
            follow_redirects=True, verify=certifi.where(),
        ) as client:
            r = await client.get(url)
            r.raise_for_status()
            logger.info("[beforward] %s -> %d (%d B)", r.url, r.status_code, len(r.text))
            return r.text

    def _find_cards(self, soup: BeautifulSoup) -> list:
        # Primary: table rows with veh-stock-no
        rows = [row for row in soup.find_all("tr") if row.select_one(".veh-stock-no")]
        if rows:
            logger.info("[beforward] found %d cards via tr:has(.veh-stock-no)", len(rows))
            return rows
        
        # Fallback: div rows
        divs = [div for div in soup.find_all("div") 
                if div.select_one(".veh-stock-no") and len(div.get_text(strip=True)) > 100]
        if divs:
            logger.info("[beforward] found %d cards via div:has(.veh-stock-no)", len(divs))
            return divs
        
        logger.warning("[beforward] 0 cards found")
        return []

    def _parse_card(self, card) -> dict | None:
        try:
            text = card.get_text(separator="\n", strip=True)
            lines = [l.strip() for l in text.split("\n") if l.strip()]

            # Skip SOLD vehicles
            if lines and lines[0] == "SOLD":
                return None

            # ── Stock ID (Ref No.) ──
            sid = ""
            for i, line in enumerate(lines):
                if line.startswith("Ref No."):
                    sid = line.replace("Ref No.", "").strip()
                    break
            if not sid:
                # Fallback: regex
                m = re.search(r"Ref No\.\s*([A-Z]{2}\d+)", text)
                sid = m.group(1) if m else ""
            if not sid:
                return None

            # ── Price ──
            price = None
            # Look for "$X,XXX" or "USD X,XXX" patterns
            m = re.search(r"USD\s*\n?\s*([\d,]+)", text)
            if m:
                v = float(m.group(1).replace(",", ""))
                if 300 < v < 500_000:
                    price = v
            if not price:
                # Look for any dollar amount
                m = re.search(r"\$\s*([\d,]+)", text)
                if m:
                    v = float(m.group(1).replace(",", ""))
                    if 300 < v < 500_000:
                        price = v
            if not price:
                # Some BF pages show price in a specific format
                m = re.search(r"([\d,]+)\s*USD", text, re.I)
                if m:
                    v = float(m.group(1).replace(",", ""))
                    if 300 < v < 500_000:
                        price = v
            
            # Note: Some cards genuinely have no price (SOLD, or price hidden)
            # We still parse them but price will be None
            # Actually, let's skip no-price cards since we need price for training
            if not price:
                logger.debug("[beforward] %s: no price found, skipping", sid)
                return None

            # ── Year ──
            year = None
            # Look for "Year\nYYYY/M" pattern
            for i, line in enumerate(lines):
                if line == "Year" and i + 1 < len(lines):
                    m = re.search(r"(20\d{2})", lines[i + 1])
                    if m:
                        year = int(m.group(1))
                        break
            if not year:
                # Fallback: first "20\d{2}" in text
                m = re.search(r"(20\d{2})", text)
                year = int(m.group(1)) if m else None
            if not year or year < 2018:
                return None

            # ── Make & Model ──
            make = ""
            model = ""
            # Look for "2015 TOYOTA SIENTA" pattern
            m = re.search(r"(\d{4})\s+([A-Z]+)\s+(.+?)(?:\n|$)", text, re.I)
            if m:
                make = m.group(2).title()
                model = m.group(3).strip()
            else:
                # Fallback from lines
                for line in lines:
                    m = re.search(r"(\d{4})\s+([A-Z]+)\s+(.+)", line, re.I)
                    if m:
                        make = m.group(2).title()
                        model = m.group(3).strip()
                        break

            # ── Mileage ──
            mileage = None
            for i, line in enumerate(lines):
                if line == "Mileage" and i + 1 < len(lines):
                    m = re.search(r"([\d,]+)", lines[i + 1])
                    if m:
                        mileage = int(m.group(1).replace(",", ""))
                        break
            if not mileage:
                m = re.search(r"([\d,]+)\s*km", text, re.I)
                if m:
                    mileage = int(m.group(1).replace(",", ""))

            # ── Engine ──
            engine = None
            for i, line in enumerate(lines):
                if line == "Engine" and i + 1 < len(lines):
                    m = re.search(r"([\d,]+)", lines[i + 1])
                    if m:
                        v = float(m.group(1).replace(",", ""))
                        engine = int(v)
                        break
            if not engine:
                m = re.search(r"([\d,]+)\s*cc", text, re.I)
                if m:
                    engine = int(m.group(1).replace(",", ""))

            # ── Transmission ──
            trans = "automatic"
            for i, line in enumerate(lines):
                if line in ("Trans.", "Transmission") and i + 1 < len(lines):
                    t = lines[i + 1].lower()
                    if "manual" in t or t == "mt":
                        trans = "manual"
                    elif "cvt" in t:
                        trans = "cvt"
                    break
            if trans == "automatic":
                # Fallback
                if " MT " in text or "\nMT\n" in text:
                    trans = "manual"
                elif " CVT " in text or "\nCVT\n" in text:
                    trans = "cvt"

            # ── Fuel ──
            fuel_type = "petrol"
            for i, line in enumerate(lines):
                if line == "Fuel" and i + 1 < len(lines):
                    f = lines[i + 1].lower()
                    if "hybrid" in f:
                        fuel_type = "hybrid"
                    elif "diesel" in f:
                        fuel_type = "diesel"
                    elif "electric" in f:
                        fuel_type = "electric"
                    break
            if fuel_type == "petrol":
                # Fallback
                tlower = text.lower()
                if "hybrid" in tlower:
                    fuel_type = "hybrid"
                elif "diesel" in tlower:
                    fuel_type = "diesel"
                elif "electric" in tlower:
                    fuel_type = "electric"

            # ── URL ──
            a_tag = card.select_one("a[href]")
            href = a_tag["href"] if a_tag else ""
            url = (self.BASE + href) if href.startswith("/") else (href or None)

            # ── Images ──
            imgs = [img["src"] for img in card.select("img[src]") 
                    if not any(x in img.get("src", "") for x in ["placeholder", "logo", "icon"])]

            return {
                "source_id":    f"bf_{sid}",
                "url":          url,
                "make":         make,
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
            logger.debug("[beforward] card error: %s", e)
            return None

    def _save_batch(self, listings: list) -> int:
        if not listings: 
            return 0
        db = SessionLocal()
        new = 0
        try:
            for item in listings:
                ex = db.query(CarListing).filter_by(source_id=item["source_id"]).first()
                if ex:
                    ex.price_usd = item["price_usd"]
                    ex.updated_at = datetime.utcnow()
                else:
                    valid = {k: v for k, v in item.items()
                             if k in CarListing.__table__.columns.keys()}
                    db.add(CarListing(source=self.SOURCE, scraped_at=datetime.utcnow(), **valid))
                    new += 1
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error("[beforward] DB error: %s", e)
        finally:
            db.close()
        return new

    async def run(self, max_pages: int = 50) -> int:
        total = 0
        for make in BF_MAKES:
            logger.info("[beforward] == %s ==", make)
            for page in range(1, max_pages + 1):
                url = self._url(make, page)
                try:
                    html = await self._fetch(url)
                    soup = BeautifulSoup(html, "html.parser")
                    cards = self._find_cards(soup)
                    if not cards:
                        logger.info("[beforward] %s p%d: no cards", make, page)
                        break

                    listings = [c for c in map(self._parse_card, cards) if c]
                    saved = self._save_batch(listings)
                    total += saved
                    logger.info("[beforward] %s p%d: %d cards, %d saved (total=%d)", 
                               make, page, len(cards), saved, total)

                except Exception as e:
                    logger.error("[beforward] %s p%d: %s", make, page, e)
                    break
                await asyncio.sleep(self.DELAY)
        return total