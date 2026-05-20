"""
test_phase3_v3.py  — updated for beforward_v8 (Playwright + DOM-matched selectors)
─────────────────────────────────────────────────────────────────────────────────
Run from backend/ with venv active:
  python3 test_phase3_v3.py

Changes from v2:
  - TEST 2: Uses actual BeForwardScraper._playwright_page() instead of raw httpx
  - TEST 2: Tests numeric make IDs (TOYOTA=1) and minyear=2018 (no maxyear)
  - TEST 2: Validates DOM-matched selectors: .veh-stock-no, .vehicle-price, .make-model
  - TEST 2: Saves debug screenshot + HTML on failure for visual inspection
  - TEST 3: Unchanged (Peach Cars still works)
  - TEST 4: Writes real BF listings from Playwright, skips gracefully if 0
  - TEST 5/6: Unchanged
"""

import asyncio, json, logging, sys, re
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("test_phase3")

PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"
WARN = "\033[93m⚠\033[0m"
INFO = "\033[94mℹ\033[0m"

def check(label, condition, detail=""):
    icon = PASS if condition else FAIL
    print(f"  {icon}  {label}" + (f" — {detail}" if detail else ""))
    return condition


# ══════════════════════════════════════════════════════════
# TEST 1: SSL
# ══════════════════════════════════════════════════════════
async def test_ssl():
    print("\n\033[1m── TEST 1: SSL connectivity ──\033[0m")
    import httpx, certifi
    for label, kw in [
        ("certifi bundle", {"verify": certifi.where()}),
        ("system certs",   {"verify": True}),
        ("no verify",      {"verify": False}),
    ]:
        try:
            async with httpx.AsyncClient(timeout=10, follow_redirects=True, **kw) as c:
                r = await c.get("https://www.beforward.jp/")
            check(f"beforward.jp with {label}", r.status_code == 200, f"HTTP {r.status_code}")
            return label
        except Exception as e:
            check(f"beforward.jp with {label}", False, str(e)[:80])
    return None


# ══════════════════════════════════════════════════════════
# TEST 2: BE FORWARD — Playwright + DOM-matched selectors
# ══════════════════════════════════════════════════════════
async def test_beforward():
    print("\n\033[1m── TEST 2: BE FORWARD scraper (Playwright + DOM-matched) ──\033[0m")

    try:
        from app.scrapers.beforward import BeForwardScraper
    except ImportError as e:
        check("Import BeForwardScraper", False, str(e))
        return []

    scraper = BeForwardScraper()

    # ── A: Verify make ID mapping ─────────────────────────────────────────
    print(f"\n  {INFO}  Step A — verify numeric make IDs")
    check("TOYOTA -> make_id=1", scraper._html_url("TOYOTA", 1).startswith(
        "https://www.beforward.jp/stocklist/make=1/"))
    check("HONDA -> make_id=2", scraper._html_url("HONDA", 1).startswith(
        "https://www.beforward.jp/stocklist/make=2/"))
    check("No maxyear in URL", "maxyear" not in scraper._html_url("TOYOTA", 1))
    check("minyear=2018 present", "minyear=2018" in scraper._html_url("TOYOTA", 1))

    # ── B: Playwright scrape ──────────────────────────────────────────────
    print(f"\n  {INFO}  Step B — Playwright scrape (TOYOTA, page 1)")
    try:
        listings = await scraper._playwright_page("TOYOTA", 1)
    except Exception as e:
        check("Playwright scrape", False, str(e)[:100])
        import traceback; traceback.print_exc()
        return []

    check("Listings returned", len(listings) > 0, f"{len(listings)} listings")

    if not listings:
        print(f"\n  {WARN}  0 listings — check debug artifacts:")
        print(f"    /tmp/bf_debug.png (screenshot)")
        print(f"    /tmp/bf_selector_debug.html (full DOM)")
        return []

    # ── C: Validate parsed fields ─────────────────────────────────────────
    print(f"\n  {INFO}  Step C — validate parsed fields")
    required = ["source_id", "make", "model", "year", "price_usd"]
    first = listings[0]
    for field in required:
        check(f"Field '{field}' present", field in first and first[field], str(first.get(field))[:50])

    check("Year >= 2018", all(l["year"] >= 2018 for l in listings))
    check("Price > 0", all(l["price_usd"] > 0 for l in listings))
    check("Make is Toyota", all(l["make"].upper() == "TOYOTA" for l in listings))

    # ── D: Sample output ──────────────────────────────────────────────────
    print(f"\n  {INFO}  Step D — sample listings")
    for l in listings[:3]:
        print(f"    {l['source_id']:<18}  {l['make']:<10}  {l['model']:<18}"
              f"  {l['year']}  ${l['price_usd']:>8,.0f}  {l.get('mileage_km','?'):>7} km")

    return listings


# ══════════════════════════════════════════════════════════
# TEST 3: Peach Cars
# ══════════════════════════════════════════════════════════
async def test_peachcars():
    print("\n\033[1m── TEST 3: Peach Cars scraper ──\033[0m")
    import httpx, certifi

    FUEL_MAP  = {"P":"petrol","D":"diesel","H":"hybrid","E":"electric"}
    TRANS_MAP = {"A":"automatic","M":"manual"}
    BODY_MAP  = {"SLN":"saloon","SNW":"station wagon","HBK":"hatchback",
                 "SUV":"suv","PCK":"pickup","VAN":"van","COU":"coupe"}

    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; research-bot/1.0)",
        "Accept": "application/json",
        "Referer": "https://peachcars.co.ke/",
    }

    all_items = []
    for page in range(1, 4):
        url = f"https://peachcars.co.ke/cars?page={page}"
        print(f"  Fetching page {page}: {url}")
        try:
            async with httpx.AsyncClient(
                headers=headers, timeout=20,
                follow_redirects=True, verify=certifi.where()
            ) as c:
                r = await c.get(url)
        except Exception:
            try:
                async with httpx.AsyncClient(
                    headers=headers, timeout=20,
                    follow_redirects=True, verify=False
                ) as c:
                    r = await c.get(url)
            except Exception as e:
                print(f"  {FAIL}  Page {page} failed: {e}")
                break

        check(f"Page {page} HTTP 200", r.status_code == 200, f"got {r.status_code}")
        if r.status_code != 200:
            break

        try:
            data = r.json()
        except Exception as e:
            check(f"Page {page} is JSON", False, str(e))
            break

        if isinstance(data, list):
            items = data
            print(f"    Response: array, {len(items)} items")
        elif isinstance(data, dict):
            items = data.get("results", data.get("data", data.get("cars", [])))
            total = data.get("count", data.get("total", "?"))
            print(f"    Response: dict, keys={list(data.keys())}, "
                  f"items={len(items)}, total={total}")
        else:
            items = []

        if not items:
            print(f"    {INFO}  No items on page {page} — pagination ends here")
            break

        all_items.extend(items)

    check("Items fetched across pages", len(all_items) > 0, f"{len(all_items)} total")
    if not all_items:
        return []

    first = all_items[0]
    print(f"\n  Key fields on first record:")
    for field in ["id","make","model","year_of_manufacture","engine_size",
                  "mileage","fuel","transmission","body_type",
                  "selling_price","deal_price","vehicle_used_status","slug"]:
        val = first.get(field, "MISSING")
        ok  = field in first
        print(f"    {'✓' if ok else '✗'}  {field:<25} = {str(val)[:60]}")

    transformed, skipped = [], 0
    for raw in all_items:
        try:
            yr  = str(raw.get("year_of_manufacture",""))
            year = int(yr) if yr.isdigit() else None
            price = raw.get("deal_price") or raw.get("selling_price")
            if not year or not price:
                skipped += 1; continue
            transformed.append({
                "source_id":    f"peach_{raw['id']}",
                "make":         raw.get("make","").title().strip(),
                "model":        raw.get("model","").strip(),
                "year":         year,
                "mileage_km":   raw.get("mileage"),
                "engine_cc":    raw.get("engine_size"),
                "fuel_type":    FUEL_MAP.get(raw.get("fuel","P"),"petrol"),
                "transmission": TRANS_MAP.get(raw.get("transmission","A"),"automatic"),
                "body_type":    BODY_MAP.get(raw.get("body_type",""),
                                             raw.get("body_type","").lower()),
                "price_kes":    float(price),
                "condition":    "local_used" if raw.get("vehicle_used_status")=="Locally"
                                else "imported_used",
                "listing_url":  f"https://peachcars.co.ke/cars/{raw.get('slug','')}",
            })
        except Exception:
            skipped += 1

    check("Records transform", len(transformed) > 0,
          f"{len(transformed)} ok, {skipped} skipped")
    if transformed:
        local_n = sum(1 for t in transformed if t["condition"]=="local_used")
        check("Years valid", all(2000 <= t["year"] <= 2026 for t in transformed))
        check("Prices positive KES", all(t["price_kes"] > 0 for t in transformed))
        print(f"\n  Condition split: local_used={local_n}, "
              f"imported_used={len(transformed)-local_n}")
        print("\n  Sample:")
        for t in transformed[:3]:
            print(f"    {t['source_id'][:38]:<40}  {t['make']:<10}  {t['model']:<15}"
                  f"  {t['year']}  KES {t['price_kes']:>12,.0f}  [{t['condition']}]")

    return transformed


# ══════════════════════════════════════════════════════════
# TEST 4: DB write
# ══════════════════════════════════════════════════════════
def test_db_write(bf_sample, peach_sample):
    print("\n\033[1m── TEST 4: Database write ──\033[0m")
    try:
        from app.database import SessionLocal, engine
        from app.models.car_listings   import CarListing
        from app.models.local_listings import LocalListing
        from sqlalchemy import text
    except ImportError as e:
        check("Import app modules", False, str(e)); return False

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        check("Neon DB connection", True)
    except Exception as e:
        check("Neon DB connection", False, str(e)[:100]); return False

    # BF write
    db = SessionLocal(); bf_new = 0
    try:
        for item in bf_sample[:5]:
            if not db.query(CarListing).filter_by(source_id=item["source_id"]).first():
                db.add(CarListing(
                    source="beforward", scraped_at=datetime.utcnow(),
                    source_id=item["source_id"], make=item["make"],
                    model=item["model"], year=item["year"],
                    price_usd=item["price_usd"], is_cleaned=False,
                ))
                bf_new += 1
        db.commit()
        check("BE FORWARD rows saved", bf_new > 0, f"{bf_new} new rows")
    except Exception as e:
        db.rollback()
        check("BE FORWARD rows saved", False, str(e)[:100])
    finally:
        db.close()

    if not bf_sample:
        print(f"  {WARN}  No BF listings parsed — check Playwright/debug artifacts")

    # Peach Cars write
    db = SessionLocal(); pc_new = 0
    try:
        for item in peach_sample:
            if not db.query(LocalListing).filter_by(source_id=item["source_id"]).first():
                db.add(LocalListing(
                    source="peachcars", scraped_at=datetime.utcnow(),
                    source_id=item["source_id"], make=item["make"],
                    model=item["model"], year=item["year"],
                    mileage_km=item.get("mileage_km"),
                    engine_cc=item.get("engine_cc"),
                    fuel_type=item.get("fuel_type"),
                    transmission=item.get("transmission"),
                    body_type=item.get("body_type"),
                    price_kes=item["price_kes"],
                    condition=item["condition"],
                    listing_url=item.get("listing_url"),
                ))
                pc_new += 1
        db.commit()
        check("Peach Cars rows saved", pc_new > 0, f"{pc_new} new rows")
    except Exception as e:
        db.rollback()
        check("Peach Cars rows saved", False, str(e)[:100])
    finally:
        db.close()

    return True


# ══════════════════════════════════════════════════════════
# TEST 5: ETL
# ══════════════════════════════════════════════════════════
def test_etl():
    print("\n\033[1m── TEST 5: ETL pipeline ──\033[0m")
    try:
        from app.etl.cleaner import ListingCleaner
    except ImportError as e:
        check("Import ETL", False, str(e)); return

    try:
        stats = ListingCleaner(chunk_size=500).run()
        check("ETL ran without errors", True)
        check("Records fetched",  stats.get("fetched",0) >= 0, str(stats.get("fetched")))
        check("Records cleaned",  stats.get("cleaned",0) >= 0, str(stats.get("cleaned")))
        check("Records dropped",  stats.get("dropped",0) >= 0, str(stats.get("dropped")))
        print(f"\n  ETL stats: {stats}")
    except Exception as e:
        check("ETL ran", False, str(e)[:120])
        import traceback; traceback.print_exc()


# ══════════════════════════════════════════════════════════
# TEST 6: Quality report
# ══════════════════════════════════════════════════════════
def test_quality():
    print("\n\033[1m── TEST 6: Data quality report ──\033[0m")
    try:
        from app.database import engine
        from sqlalchemy import text

        with engine.connect() as conn:
            car_rows = conn.execute(text("""
                SELECT source, COUNT(*) as n,
                       ROUND(AVG(price_usd)::numeric,0) as avg_usd,
                       MIN(year) as mn, MAX(year) as mx,
                       SUM(CASE WHEN is_cleaned THEN 1 ELSE 0 END) as cleaned
                FROM car_listings GROUP BY source ORDER BY n DESC
            """)).fetchall()

            loc_rows = conn.execute(text("""
                SELECT condition, COUNT(*) as n,
                       ROUND(AVG(price_kes)::numeric,0) as avg_kes
                FROM local_listings GROUP BY condition
            """)).fetchall()

        print("\n  car_listings:")
        print(f"  {'Source':<20} {'N':>6} {'Avg USD':>10} {'Years':>10} {'Cleaned':>9}")
        print("  " + "─" * 60)
        for r in car_rows:
            print(f"  {r.source:<20} {r.n:>6} {int(r.avg_usd or 0):>10,}"
                  f"  {r.mn or '?'}-{r.mx or '?':>4}  {r.cleaned:>6}/{r.n}")

        print("\n  local_listings (Peach Cars):")
        print(f"  {'Condition':<20} {'N':>6} {'Avg KES':>14}")
        print("  " + "─" * 44)
        for r in loc_rows:
            print(f"  {r.condition:<20} {r.n:>6} {int(r.avg_kes or 0):>14,}")

        total_j = sum(r.n for r in car_rows if r.source == "beforward")
        total_p = sum(r.n for r in loc_rows)
        check("beforward rows > 0", total_j > 0, f"{total_j} rows")
        check("peachcars rows > 0", total_p > 0, f"{total_p} rows")

    except Exception as e:
        check("Quality report", False, str(e)[:120])
        import traceback; traceback.print_exc()


# ══════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════
async def main():
    print("\n" + "═"*62)
    print("  PHASE 3 — END-TO-END SCRAPER + ETL TEST  (v3)")
    print("═"*62)

    ssl = await test_ssl()
    if not ssl:
        print("Cannot reach beforward.jp — check network"); sys.exit(1)

    bf_sample    = await test_beforward()
    peach_sample = await test_peachcars()
    db_ok        = test_db_write(bf_sample, peach_sample)
    if db_ok:
        test_etl()
    test_quality()

    print("\n" + "═"*62)
    print("  DONE")
    print("═"*62 + "\n")


if __name__ == "__main__":
    asyncio.run(main())