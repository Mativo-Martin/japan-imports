import pytest, json, asyncio
from unittest.mock import AsyncMock, patch, MagicMock


# ── Peach Cars tests (mock the HTTP call) ────────────────────────────────────

FAKE_PEACH_RESPONSE = [
    {
        "id": "abc-123", "legacy_id": 9001,
        "make": "TOYOTA", "model": "Vitz",
        "year_of_manufacture": "2020",
        "engine_size": 1000, "mileage": 45000,
        "body_type": "HBK", "fuel": "P",
        "transmission": "A", "drive": "2",
        "selling_price": 950000.0, "deal_price": None,
        "vehicle_used_status": "Locally",
        "color": "WT", "images": [], "slug": "test-vitz",
    },
    {
        "id": "def-456", "legacy_id": 9002,
        "make": "HONDA", "model": "Fit",
        "year_of_manufacture": "2019",
        "engine_size": 1300, "mileage": 62000,
        "body_type": "SNW", "fuel": "H",
        "transmission": "A", "drive": "A",
        "selling_price": 1200000.0, "deal_price": 1150000.0,
        "vehicle_used_status": "Foreign",
        "color": "SV", "images": [], "slug": "test-fit",
    },
]

def test_peach_transform_fuel_mapping():
    from app.scrapers.peachcars import PeachCarsScraper, FUEL_MAP
    assert FUEL_MAP["P"] == "petrol"
    assert FUEL_MAP["H"] == "hybrid"
    assert FUEL_MAP["D"] == "diesel"
    assert FUEL_MAP["E"] == "electric"

def test_peach_transform_local_condition():
    from app.scrapers.peachcars import PeachCarsScraper
    sc  = PeachCarsScraper()
    rec = sc._transform(FAKE_PEACH_RESPONSE[0])
    assert rec is not None
    assert rec["make"]        == "Toyota"          # title-cased
    assert rec["fuel_type"]   == "petrol"
    assert rec["transmission"]== "automatic"
    assert rec["body_type"]   == "hatchback"       # HBK decoded
    assert rec["condition"]   == "local_used"
    assert rec["price_kes"]   == 950000.0
    assert rec["year"]        == 2020
    assert rec["source_id"]   == "peach_abc-123"
    assert rec["status"]      == "active"

def test_peach_deal_price_takes_priority():
    from app.scrapers.peachcars import PeachCarsScraper
    sc  = PeachCarsScraper()
    rec = sc._transform(FAKE_PEACH_RESPONSE[1])
    assert rec["price_kes"]   == 1150000.0         # deal_price used
    assert rec["condition"]   == "imported_used"

def test_peach_skips_missing_price():
    from app.scrapers.peachcars import PeachCarsScraper
    sc  = PeachCarsScraper()
    bad = {**FAKE_PEACH_RESPONSE[0], "selling_price": None, "deal_price": None}
    assert sc._transform(bad) is None

def test_peach_skips_missing_year():
    from app.scrapers.peachcars import PeachCarsScraper
    sc  = PeachCarsScraper()
    bad = {**FAKE_PEACH_RESPONSE[0], "year_of_manufacture": ""}
    assert sc._transform(bad) is None

def test_peach_sold_status_detection():
    from app.scrapers.peachcars import PeachCarsScraper
    sc = PeachCarsScraper()
    raw_sold = {**FAKE_PEACH_RESPONSE[0], "is_sold": True}
    rec = sc._transform(raw_sold)
    assert rec is not None
    assert rec["status"] == "sold"


# ── BE FORWARD tests (use saved HTML fixture) ─────────────────────────────────
MINIMAL_BF_HTML = """
<html><body>
<li class="stock-list-item" data-stock-id="BF9999">
  <a href="/car/toyota-vitz-9999"></a>
  <span class="maker-name">Toyota</span>
  <span class="model-name">Vitz</span>
  <span class="year">2021</span>
  <span class="mileage">38,000km</span>
  <span class="engine-size">1000cc</span>
  <span class="fuel-type">Gasoline</span>
  <span class="transmission">AT</span>
  <span class="price">$5,200</span>
</li>
</body></html>
"""

MINIMAL_BF_SOLD_HTML = """
<html><body>
<li class="stock-list-item" data-stock-id="BF8888">
  <span>SOLD</span>
  <a href="/car/honda-fit-8888"></a>
  <span class="maker-name">Honda</span>
  <span class="model-name">Fit</span>
  <span class="year">2020</span>
  <span class="price">$4,500</span>
</li>
</body></html>
"""

def test_beforward_parses_fixture():
    from app.scrapers.beforward import BeForwardScraper
    sc      = BeForwardScraper()
    results = sc.parse(MINIMAL_BF_HTML, page=1)
    assert len(results) == 1
    r = results[0]
    assert r["make"]       == "Toyota"
    assert r["year"]       == 2021
    assert r["price_usd"]  == 5200.0
    assert r["mileage_km"] == 38000
    assert r["engine_cc"]  == 1000
    assert r["fuel_type"]  == "petrol"     # "Gasoline" → mapped
    assert r["source_id"]  == "bf_BF9999"
    assert r["status"]     == "active"

def test_beforward_skips_pre_2018():
    from app.scrapers.beforward import BeForwardScraper
    html = MINIMAL_BF_HTML.replace("2021", "2015")
    sc   = BeForwardScraper()
    assert sc.parse(html, 1) == []

def test_beforward_sold_status_detection():
    from app.scrapers.beforward import BeForwardScraper
    sc = BeForwardScraper()
    results = sc.parse(MINIMAL_BF_SOLD_HTML, page=1)
    assert len(results) == 1
    assert results[0]["status"] == "sold"
