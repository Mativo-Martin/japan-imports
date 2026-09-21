import httpx, json, logging
from datetime import datetime
from tenacity import retry, stop_after_attempt, wait_exponential
from app.database import SessionLocal
from app.models.local_listings import LocalListing

logger = logging.getLogger(__name__)

FUEL_MAP = {
    "P": "petrol", "D": "diesel",
    "H": "hybrid", "E": "electric",
}
TRANS_MAP = {"A": "automatic", "M": "manual"}
BODY_MAP  = {
    "SLN": "saloon",    "SNW": "station wagon",
    "HBK": "hatchback", "SUV": "suv",
    "PCK": "pickup",    "VAN": "van",
    "COU": "coupe",     "CNV": "convertible",
    "MPV": "minivan",   "TRK": "truck",
}
DRIVE_MAP = {"2": "2WD", "4": "4WD", "A": "AWD"}


class PeachCarsScraper:
    BASE_URL  = "https://peachcars.co.ke/cars"
    SOURCE    = "peachcars"
    HEADERS   = {
        "User-Agent": "Mozilla/5.0 (compatible; research-bot/1.0)",
        "Accept":     "application/json",
    }

    @retry(
        stop=stop_after_attempt(4),
        wait=wait_exponential(multiplier=1, min=3, max=20),
        reraise=True,
    )
    async def _fetch_page(self, client: httpx.AsyncClient, page: int) -> tuple:
        """Returns (items_list, total_count)."""
        resp = await client.get(self.BASE_URL, params={"page": page}, timeout=20.0)
        resp.raise_for_status()
        data = resp.json()
        
        items = []
        total = 0
        
        if isinstance(data, dict):
            total = data.get("count", 0)
            items = data.get("cars", data.get("results", data.get("data", [])))
        elif isinstance(data, list):
            items = data
            
        return items, total

    async def run(self, max_pages: int = 200) -> dict:
        """
        Fetch pages up to max_pages or until empty / total count reached.
        """
        all_items = []
        seen_ids = set()
        total_expected = None
        
        async with httpx.AsyncClient(headers=self.HEADERS) as client:
            page = 1
            while page <= max_pages:
                items, total = await self._fetch_page(client, page)
                
                if total_expected is None:
                    total_expected = total
                    logger.info("[peachcars] API reports %d total listings", total_expected)
                
                if not items:
                    logger.info("[peachcars] page %d empty — done", page)
                    break
                
                new_count = 0
                for item in items:
                    iid = item.get("id")
                    if iid not in seen_ids:
                        seen_ids.add(iid)
                        all_items.append(item)
                        new_count += 1
                
                logger.info("[peachcars] page %d — %d items (%d new, %d duplicates)", 
                           page, len(items), new_count, len(items) - new_count)
                
                # Stop if we've fetched all expected items
                if total_expected and len(all_items) >= total_expected:
                    logger.info("[peachcars] fetched all %d expected items", total_expected)
                    break
                
                page += 1

        stats = self._save(all_items)
        seen_source_ids = {f"peach_{item['id']}" for item in all_items if item.get("id")}
        removed_count = self.sync_removed(seen_source_ids)
        stats["removed"] = removed_count
        stats["source"] = self.SOURCE
        return stats

    def _transform(self, raw: dict) -> dict | None:
        try:
            year_str = raw.get("year_of_manufacture", "")
            year = int(year_str) if str(year_str).isdigit() else None

            price_kes = raw.get("deal_price") or raw.get("selling_price")
            if not price_kes or not year:
                return None

            fuel_code  = raw.get("fuel", "P")
            trans_code = raw.get("transmission", "A")
            body_code  = raw.get("body_type", "")
            veh_status = raw.get("vehicle_used_status", "")
            is_sold = raw.get("is_sold", False) or raw.get("status") == "sold"

            raw_imgs = raw.get("images", [])
            imgs = []
            for im in raw_imgs:
                if isinstance(im, str) and im.strip():
                    url_str = im.strip()
                    if url_str.startswith("//"):
                        url_str = "https:" + url_str
                    imgs.append(url_str)
                elif isinstance(im, dict) and im.get("url"):
                    url_str = im["url"].strip()
                    if url_str.startswith("//"):
                        url_str = "https:" + url_str
                    imgs.append(url_str)

            return {
                "source_id":    f"peach_{raw['id']}",
                "source":       self.SOURCE,
                "make":         raw.get("make", "").title().strip(),
                "model":        raw.get("model", "").strip(),
                "year":         year,
                "mileage_km":   raw.get("mileage"),
                "engine_cc":    raw.get("engine_size"),
                "fuel_type":    FUEL_MAP.get(fuel_code, "petrol"),
                "transmission": TRANS_MAP.get(trans_code, "automatic"),
                "body_type":    BODY_MAP.get(body_code, body_code.lower()),
                "drive_type":   DRIVE_MAP.get(raw.get("drive", "2"), "2WD"),
                "color":        raw.get("color"),
                "price_kes":    float(price_kes),
                "condition":    "local_used" if veh_status == "Locally" else "imported_used",
                "location":     "Nairobi",
                "listing_url":  f"https://peachcars.co.ke/cars/{raw.get('slug', '')}",
                "images_json":  json.dumps(imgs[:5]),
                "status":       "sold" if is_sold else "active",
                "scraped_at":   datetime.utcnow(),
            }
        except Exception as e:
            logger.warning("[peachcars] transform error: %s | raw id=%s", e, raw.get("id"))
            return None

    def _save(self, raw_items: list) -> dict:
        db = SessionLocal()
        stats = {"total_api": len(raw_items), "new": 0, "updated": 0, "sold": 0, "skipped": 0}
        try:
            for raw in raw_items:
                rec = self._transform(raw)
                if not rec:
                    stats["skipped"] += 1
                    continue

                existing = db.query(LocalListing).filter_by(
                    source_id=rec["source_id"]).first()

                if existing:
                    update_fields = [
                        "price_kes", "mileage_km", "status", "scraped_at", "images_json",
                        "listing_url", "make", "model", "year", "engine_cc", "fuel_type",
                        "transmission", "body_type", "drive_type", "color", "condition", "location"
                    ]
                    for k in update_fields:
                        if rec.get(k) is not None:
                            setattr(existing, k, rec[k])
                    if rec["status"] == "sold":
                        stats["sold"] += 1
                    stats["updated"] += 1
                else:
                    db.add(LocalListing(**{
                        k: v for k, v in rec.items()
                        if k in LocalListing.__table__.columns.keys()
                    }))
                    stats["new"] += 1
                    if rec["status"] == "sold":
                        stats["sold"] += 1

            db.commit()
            logger.info("[peachcars] done: %s", stats)
        except Exception as e:
            db.rollback()
            logger.error("[peachcars] DB error: %s", e)
        finally:
            db.close()
        return stats

    def sync_removed(self, seen_active_ids: set) -> int:
        """Mark active listings in local_listings for peachcars not found in current scrape as removed."""
        if not seen_active_ids:
            return 0
        db = SessionLocal()
        removed_count = 0
        try:
            active_db_listings = db.query(LocalListing).filter_by(
                source=self.SOURCE, status="active"
            ).all()
            for listing in active_db_listings:
                if listing.source_id not in seen_active_ids:
                    listing.status = "removed"
                    removed_count += 1
            db.commit()
            if removed_count > 0:
                logger.info("[peachcars] Sync: marked %d missing listings as removed", removed_count)
        except Exception as e:
            db.rollback()
            logger.error("[peachcars] sync_removed DB error: %s", e)
        finally:
            db.close()
        return removed_count