"""
beforward.py — BE FORWARD scraper (httpx primary with status tracking & sold/removed sync)
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
    "MITSUBISHI": 5, "SUBARU": 6, "SUZUKI": 7, "ISUZU": 8,
    "DAIHATSU": 9, "MERCEDES-BENZ": 14, "BMW": 15, "VOLKSWAGEN": 16,
    "AUDI": 17, "LAND ROVER": 29,
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
        # Table rows with veh-stock-no
        rows = [row for row in soup.find_all("tr") if row.select_one(".veh-stock-no")]
        if rows:
            logger.info("[beforward] found %d cards via tr:has(.veh-stock-no)", len(rows))
            return rows
        
        # Div rows
        divs = [div for div in soup.find_all("div") 
                if div.select_one(".veh-stock-no") and len(div.get_text(strip=True)) > 100]
        if divs:
            logger.info("[beforward] found %d cards via div:has(.veh-stock-no)", len(divs))
            return divs

        # Minimal HTML / test fixtures fallback
        items = soup.select(".stock-list-item, li[data-stock-id]")
        if items:
            logger.info("[beforward] found %d cards via fallback selectors", len(items))
            return items
        
        logger.warning("[beforward] 0 cards found")
        return []

    def _parse_card(self, card) -> dict | None:
        try:
            text = card.get_text(separator="\n", strip=True)
            lines = [l.strip() for l in text.split("\n") if l.strip()]

            # ── Check status (SOLD vs Active) ──
            is_sold = False
            if lines and lines[0] == "SOLD":
                is_sold = True
            elif "SOLD" in text.upper():
                is_sold = True

            # ── Stock ID (Ref No. or data attribute) ──
            sid = card.get("data-stock-id", "")
            if not sid:
                for i, line in enumerate(lines):
                    if line.startswith("Ref No."):
                        sid = line.replace("Ref No.", "").strip()
                        break
            if not sid:
                m = re.search(r"Ref No\.\s*([A-Z0-9]+)", text)
                sid = m.group(1) if m else ""
            if not sid:
                a_tag = card.select_one("a[href]")
                href = a_tag["href"] if a_tag else ""
                m = re.search(r"-([A-Z0-9]{4,})$", href) or re.search(r"/([A-Z0-9]{4,})/?$", href)
                sid = m.group(1) if m else ""
            if not sid:
                return None

            status = "sold" if is_sold else "active"

            # ── Price ──
            price = None
            price_el = card.select_one(".price, .usd-price, .vehicle-price")
            if price_el:
                m = re.search(r"[\d,]+", price_el.get_text())
                if m:
                    v = float(m.group().replace(",", ""))
                    if 300 < v < 500_000:
                        price = v

            if not price:
                m = re.search(r"USD\s*\n?\s*([\d,]+)", text)
                if m:
                    v = float(m.group(1).replace(",", ""))
                    if 300 < v < 500_000:
                        price = v
            if not price:
                m = re.search(r"\$\s*([\d,]+)", text)
                if m:
                    v = float(m.group(1).replace(",", ""))
                    if 300 < v < 500_000:
                        price = v
            if not price:
                m = re.search(r"([\d,]+)\s*USD", text, re.I)
                if m:
                    v = float(m.group(1).replace(",", ""))
                    if 300 < v < 500_000:
                        price = v
            
            if not price and not is_sold:
                logger.debug("[beforward] %s: no price found, skipping", sid)
                return None

            # ── Year ──
            year = None
            year_el = card.select_one(".year, .model-year")
            if year_el:
                m = re.search(r"(20\d{2})", year_el.get_text())
                if m:
                    year = int(m.group(1))

            if not year:
                for i, line in enumerate(lines):
                    if line == "Year" and i + 1 < len(lines):
                        m = re.search(r"(20\d{2})", lines[i + 1])
                        if m:
                            year = int(m.group(1))
                            break
            if not year:
                m = re.search(r"(20\d{2})", text)
                year = int(m.group(1)) if m else None

            if not year or year < 2018:
                return None

            # ── Make & Model ──
            make = card.select_one(".maker-name, .make")
            make = make.get_text(strip=True) if make else ""
            model = card.select_one(".model-name, .model")
            model = model.get_text(strip=True) if model else ""

            if not make or not model:
                m = re.search(r"(\d{4})\s+([A-Z]+)\s+(.+?)(?:\n|$)", text, re.I)
                if m:
                    make = make or m.group(2).title()
                    model = model or m.group(3).strip()
                else:
                    for line in lines:
                        m = re.search(r"(\d{4})\s+([A-Z]+)\s+(.+)", line, re.I)
                        if m:
                            make = make or m.group(2).title()
                            model = model or m.group(3).strip()
                            break

            # ── Mileage ──
            mileage = None
            mil_el = card.select_one(".mileage")
            if mil_el:
                m = re.search(r"([\d,]+)", mil_el.get_text())
                if m:
                    mileage = int(m.group(1).replace(",", ""))

            if not mileage:
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
            eng_el = card.select_one(".engine-size, .engine")
            if eng_el:
                m = re.search(r"([\d,]+)", eng_el.get_text())
                if m:
                    engine = int(m.group(1).replace(",", ""))

            if not engine:
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
            trans_el = card.select_one(".transmission, .trans")
            if trans_el:
                t = trans_el.get_text().strip().lower()
                trans = TRANS_MAP.get(t, "automatic")
            else:
                for i, line in enumerate(lines):
                    if line in ("Trans.", "Transmission") and i + 1 < len(lines):
                        t = lines[i + 1].lower()
                        trans = TRANS_MAP.get(t, "automatic")
                        break
                if trans == "automatic":
                    if " MT " in text or "\nMT\n" in text:
                        trans = "manual"
                    elif " CVT " in text or "\nCVT\n" in text:
                        trans = "cvt"

            # ── Fuel ──
            fuel_type = "petrol"
            fuel_el = card.select_one(".fuel-type, .fuel")
            if fuel_el:
                f = fuel_el.get_text().strip().lower()
                fuel_type = FUEL_MAP.get(f, "petrol")
            else:
                for i, line in enumerate(lines):
                    if line == "Fuel" and i + 1 < len(lines):
                        f = lines[i + 1].lower()
                        fuel_type = FUEL_MAP.get(f, "petrol")
                        break
                if fuel_type == "petrol":
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
            imgs = []
            for img in card.select("img"):
                src = img.get("src") or img.get("data-src") or img.get("data-original") or ""
                if not src or any(x in src.lower() for x in ["placeholder", "logo", "icon", "blank.gif"]):
                    continue
                if src.startswith("//"):
                    src = "https:" + src
                imgs.append(src)

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
                "status":       status,
                "images":       json.dumps(imgs[:5]),
                "raw_data":     str(card)[:2000],
            }
        except Exception as e:
            logger.debug("[beforward] card error: %s", e)
            return None

    def parse(self, html: str, page: int = 1) -> list[dict]:
        """Parse raw HTML string for testing or custom processing."""
        soup = BeautifulSoup(html, "html.parser")
        cards = self._find_cards(soup)
        return [c for c in map(self._parse_card, cards) if c]

    def _save_batch(self, listings: list) -> dict:
        if not listings: 
            return {"new": 0, "updated": 0, "sold": 0}
        db = SessionLocal()
        stats = {"new": 0, "updated": 0, "sold": 0}
        try:
            for item in listings:
                ex = db.query(CarListing).filter_by(source_id=item["source_id"]).first()
                if ex:
                    update_fields = [
                        "price_usd", "status", "url", "images", "make", "model",
                        "year", "mileage_km", "engine_cc", "fuel_type", "transmission", "body_type"
                    ]
                    for k in update_fields:
                        if item.get(k) is not None:
                            setattr(ex, k, item[k])
                    if item.get("status") == "sold":
                        stats["sold"] += 1
                    ex.updated_at = datetime.utcnow()
                    stats["updated"] += 1
                else:
                    valid = {k: v for k, v in item.items()
                             if k in CarListing.__table__.columns.keys()}
                    db.add(CarListing(source=self.SOURCE, scraped_at=datetime.utcnow(), **valid))
                    stats["new"] += 1
                    if item.get("status") == "sold":
                        stats["sold"] += 1
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error("[beforward] DB error: %s", e)
        finally:
            db.close()
        return stats

    def sync_removed(self, seen_active_ids: set) -> int:
        """Mark active listings in DB that were not found in current scrape pass as removed."""
        if not seen_active_ids:
            return 0
        db = SessionLocal()
        removed_count = 0
        try:
            active_db_listings = db.query(CarListing).filter_by(
                source=self.SOURCE, status="active"
            ).all()
            for listing in active_db_listings:
                if listing.source_id not in seen_active_ids:
                    listing.status = "removed"
                    listing.updated_at = datetime.utcnow()
                    removed_count += 1
            db.commit()
            if removed_count > 0:
                logger.info("[beforward] Sync: marked %d missing listings as removed", removed_count)
        except Exception as e:
            db.rollback()
            logger.error("[beforward] sync_removed DB error: %s", e)
        finally:
            db.close()
        return removed_count

    async def run(self, max_pages: int = 50) -> dict:
        total_new = 0
        total_updated = 0
        total_sold = 0
        seen_active_ids = set()

        for make in BF_MAKES:
            logger.info("[beforward] == %s ==", make)
            for page in range(1, max_pages + 1):
                url = self._url(make, page)
                try:
                    html = await self._fetch(url)
                    listings = self.parse(html, page)
                    if not listings:
                        logger.info("[beforward] %s p%d: no cards", make, page)
                        break

                    for item in listings:
                        if item.get("status") == "active":
                            seen_active_ids.add(item["source_id"])

                    saved_stats = self._save_batch(listings)
                    total_new += saved_stats["new"]
                    total_updated += saved_stats["updated"]
                    total_sold += saved_stats["sold"]
                    logger.info("[beforward] %s p%d: %d cards, new=%d, updated=%d (total_new=%d)", 
                               make, page, len(listings), saved_stats["new"], saved_stats["updated"], total_new)

                except Exception as e:
                    logger.error("[beforward] %s p%d: %s", make, page, e)
                    break
                await asyncio.sleep(self.DELAY)

        removed_count = self.sync_removed(seen_active_ids)
        return {
            "source": self.SOURCE,
            "new": total_new,
            "updated": total_updated,
            "sold": total_sold,
            "removed": removed_count,
        }