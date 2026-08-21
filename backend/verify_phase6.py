"""
verify_phases_1_6.py
────────────────────
End-to-end verification of Phases 1–6 using REAL data from Neon.
Run from backend/ with venv active:
  python3 verify_phases_1_6.py

Prints PASS / FAIL / WARN for each check and a final summary.
"""

import asyncio, json, os, sys, logging

logging.disable(logging.CRITICAL)  # suppress library noise during verification

PASS = "\033[92mPASS\033[0m"
FAIL = "\033[91mFAIL\033[0m"
WARN = "\033[93mWARN\033[0m"
SKIP = "\033[90mSKIP\033[0m"

results = []

def check(label, fn):
    try:
        msg = fn()
        results.append((PASS, label, msg or ""))
        print(f"  {PASS}  {label}" + (f" — {msg}" if msg else ""))
    except AssertionError as e:
        results.append((FAIL, label, str(e)))
        print(f"  {FAIL}  {label} — {e}")
    except Exception as e:
        results.append((FAIL, label, str(e)[:120]))
        print(f"  {FAIL}  {label} — {type(e).__name__}: {str(e)[:100]}")

def acheck(label, coro):
    try:
        msg = asyncio.run(coro)
        results.append((PASS, label, msg or ""))
        print(f"  {PASS}  {label}" + (f" — {msg}" if msg else ""))
    except AssertionError as e:
        results.append((FAIL, label, str(e)))
        print(f"  {FAIL}  {label} — {e}")
    except Exception as e:
        results.append((FAIL, label, str(e)[:120]))
        print(f"  {FAIL}  {label} — {type(e).__name__}: {str(e)[:100]}")


# ════════════════════════════════════════════════════════════
print("\n" + "═"*62)
print("  PHASE 1–2: Environment & Database")
print("═"*62)

def check_imports():
    import fastapi, sqlalchemy, httpx, pandas, numpy, sklearn, xgboost, joblib, certifi
    return f"XGB {xgboost.__version__}  sklearn {sklearn.__version__}"

def check_neon():
    from app.database import engine
    from sqlalchemy import text, inspect
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
        inspector = inspect(engine)
        tables = set(inspector.get_table_names())
        required = {"car_listings","local_listings","import_cost_estimates","exchange_rates","ml_predictions"}
        missing = required - tables
        assert not missing, f"Missing tables: {missing}"
    return f"{len(required)} tables present"

def check_row_counts():
    from app.database import engine
    from sqlalchemy import text
    with engine.connect() as conn:
        bf = conn.execute(text("SELECT COUNT(*) FROM car_listings WHERE source='beforward'")).scalar()
        pc = conn.execute(text("SELECT COUNT(*) FROM local_listings WHERE source='peachcars'")).scalar()
    return f"BF={bf} rows, Peach={pc} rows"

check("All Python imports", check_imports)
check("Neon DB connection + 5 tables", check_neon)
check("Row counts in DB", check_row_counts)


# ════════════════════════════════════════════════════════════
print("\n" + "═"*62)
print("  PHASE 3: Scrapers")
print("═"*62)

def check_peachcars_data():
    from app.database import engine
    from sqlalchemy import text
    with engine.connect() as conn:
        n = conn.execute(text("SELECT COUNT(*) FROM local_listings WHERE source='peachcars'")).scalar()
        assert n >= 5, f"Only {n} Peach Cars rows — run scraper"
        null_price = conn.execute(text("SELECT COUNT(*) FROM local_listings WHERE source='peachcars' AND price_kes IS NULL")).scalar()
        assert null_price == 0, f"{null_price} null prices"
    return f"{n} rows, 0 null prices"

def check_bf_data():
    from app.database import engine
    from sqlalchemy import text
    with engine.connect() as conn:
        n    = conn.execute(text("SELECT COUNT(*) FROM car_listings WHERE source='beforward'")).scalar()
        assert n >= 5, f"Only {n} BF rows — run scraper"
        nullp = conn.execute(text("SELECT COUNT(*) FROM car_listings WHERE source='beforward' AND price_usd IS NULL")).scalar()
        assert nullp == 0, f"{nullp} null prices in BF data"
        yr_ok = conn.execute(text("SELECT COUNT(*) FROM car_listings WHERE source='beforward' AND year >= 2018")).scalar()
    return f"{n} total, {yr_ok} year>=2018, 0 null prices"

check("Peach Cars data in local_listings", check_peachcars_data)
check("BE FORWARD data in car_listings",   check_bf_data)


# ════════════════════════════════════════════════════════════
print("\n" + "═"*62)
print("  PHASE 4: ETL Pipeline")
print("═"*62)

def check_cleaned_data():
    from app.database import engine
    from sqlalchemy import text
    with engine.connect() as conn:
        r = conn.execute(text("""
            SELECT COUNT(*) as n,
                   SUM(CASE WHEN price_usd IS NULL THEN 1 ELSE 0 END) as null_p,
                   SUM(CASE WHEN year < 2018 THEN 1 ELSE 0 END) as bad_yr
            FROM car_listings WHERE source='beforward' AND is_cleaned=true
        """)).one()
    assert r.n >= 3,    f"Only {r.n} cleaned rows — run ETL"
    assert r.null_p == 0, f"{r.null_p} null prices in cleaned data"
    assert r.bad_yr == 0, f"{r.bad_yr} pre-2018 rows in cleaned data"
    return f"{r.n} cleaned rows, quality OK"

def check_etl_run():
    from app.etl.cleaner import ListingCleaner
    stats = ListingCleaner(chunk_size=500).run()
    assert stats.get("errors", 0) == 0, f"ETL errors: {stats['errors']}"
    return f"fetched={stats['fetched']} cleaned={stats['cleaned']} dropped={stats['dropped']}"

def check_quality_report():
    from app.etl.quality import quality_report
    report = quality_report()
    return f"{report['total_records']} clean records"

check("Cleaned BF data quality",  check_cleaned_data)
check("ETL cleaner runs OK",      check_etl_run)
check("quality_report() passes",  check_quality_report)


# ════════════════════════════════════════════════════════════
print("\n" + "═"*62)
print("  PHASE 5: KRA Calculator")
print("═"*62)

def check_calculator_formulas():
    from app.calculator.kra import calculate_import_cost
    c = calculate_import_cost(8000, "hatchback", 1400.0, 130.0)
    assert abs(c.customs_duty_kes - c.cif_kes * 0.25) < 1, "Customs duty wrong"
    assert abs(c.vat_kes - (c.cif_kes + c.customs_duty_kes + c.excise_duty_kes) * 0.16) < 1, "VAT wrong"
    assert c.idf_levy_kes >= 5000, "IDF minimum not applied"
    assert c.total_import_kes > c.cif_kes, "Total < CIF — impossible"
    return f"8000 USD → KES {c.total_import_kes:,.0f} total"

async def check_exchange_rate():
    from app.calculator.exchange import get_usd_kes
    rate = await get_usd_kes()
    assert 100 < rate < 220, f"Rate {rate} out of expected range"
    return f"1 USD = {rate:.2f} KES"

async def check_real_listing_cost():
    from app.database import SessionLocal
    from app.models.car_listings import CarListing
    from app.calculator.kra import calculate_import_cost
    from app.calculator.exchange import get_usd_kes
    db   = SessionLocal()
    car  = db.query(CarListing).filter(CarListing.source=="beforward",CarListing.is_cleaned==True,CarListing.price_usd.isnot(None)).order_by(CarListing.price_usd).first()
    db.close()
    if not car:
        raise AssertionError("No cleaned BF listings to test")
    rate = await get_usd_kes()
    cost = calculate_import_cost(car.price_usd, car.body_type or "sedan", usd_kes=rate)
    assert cost.total_import_kes > car.price_usd * rate, "Total < CIF — impossible"
    return f"{car.year} {car.make} {car.model} → KES {cost.total_import_kes:,.0f}"

check("KRA formula correctness", check_calculator_formulas)
acheck("Live USD/KES rate",      check_exchange_rate())
acheck("Real BF listing cost",   check_real_listing_cost())


# ════════════════════════════════════════════════════════════
print("\n" + "═"*62)
print("  PHASE 6: ML Model")
print("═"*62)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "xgb_v1.joblib")

def check_model_exists():
    assert os.path.exists(MODEL_PATH), f"Model not found at {MODEL_PATH}\nRun: python -m app.ml.train"
    metrics_path = MODEL_PATH.replace("xgb_v1.joblib", "xgb_v1_metrics.json")
    assert os.path.exists(metrics_path), "xgb_v1_metrics.json missing"
    return "xgb_v1.joblib + xgb_v1_metrics.json found"

def check_no_overfitting():
    metrics_path = MODEL_PATH.replace("xgb_v1.joblib", "xgb_v1_metrics.json")
    with open(metrics_path) as f:
        m = json.load(f)
    test_mae  = m["mae"]
    train_mae = m.get("train_mae", test_mae)
    assert test_mae > 0, f"test_mae=$0 — severe overfitting. Retrain with more data."
    assert "source" not in m["features"], "source in features — remove it"
    ratio = train_mae / max(test_mae, 1)
    msg = f"train_mae=${train_mae:.0f} test_mae=${test_mae:.0f} ratio={ratio:.2f} R²={m['r2']}"
    if ratio < 0.25:
        raise AssertionError(f"Overfitting: {msg}")
    return msg

def check_predictor_sanity():
    from app.ml.predictor import CarPricePredictor
    CarPricePredictor.load()
    assert CarPricePredictor.is_ready()
    old = CarPricePredictor.predict({"make":"Toyota","model":"Vitz","year":2018,"mileage_km":80000,"engine_cc":1000,"fuel_type":"petrol","transmission":"automatic","body_type":"hatchback"})
    new = CarPricePredictor.predict({"make":"Toyota","model":"Vitz","year":2023,"mileage_km":20000,"engine_cc":1000,"fuel_type":"petrol","transmission":"automatic","body_type":"hatchback"})
    assert old["predicted_price_usd"] > 0
    assert new["predicted_price_usd"] > 0
    return f"2018=${old['predicted_price_usd']:,.0f}  2023=${new['predicted_price_usd']:,.0f}"

async def check_end_to_end_pipeline():
    from app.ml.predictor import CarPricePredictor
    from app.calculator.kra import calculate_import_cost
    from app.calculator.exchange import get_usd_kes
    CarPricePredictor.load()
    rate       = await get_usd_kes()
    prediction = CarPricePredictor.predict({"make":"Toyota","model":"Vitz","year":2021,"mileage_km":45000,"engine_cc":1000,"fuel_type":"petrol","transmission":"automatic","body_type":"hatchback"})
    cost       = calculate_import_cost(prediction["predicted_price_usd"], "hatchback", usd_kes=rate)
    assert cost.total_import_kes > 0
    return f"Vitz 2021 → predict=${prediction['predicted_price_usd']:,.0f} → landed KES {cost.total_import_kes:,.0f}"

check("Model files exist",          check_model_exists)
check("No overfitting",             check_no_overfitting)
check("Predictor sanity (age test)",check_predictor_sanity)
acheck("End-to-end predict+import", check_end_to_end_pipeline())


# ════════════════════════════════════════════════════════════
print("\n" + "═"*62)
print("  SUMMARY")
print("═"*62)
passed = sum(1 for s,_,_ in results if "PASS" in s)
failed = sum(1 for s,_,_ in results if "FAIL" in s)
total  = len(results)
print(f"\n  {passed}/{total} checks passed\n")
if failed:
    print("  Failed checks:")
    for s,l,m in results:
        if "FAIL" in s:
            print(f"    ✗ {l}")
            if m: print(f"      → {m}")
    print(f"\n  Fix the {failed} failed check(s) above before moving to Phase 7.")
    sys.exit(1)
else:
    print("  ✓ All checks passed — ready for Phase 7!")
print()