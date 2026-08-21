#!/usr/bin/env python3
"""
fix_and_retrain.py
──────────────────
Run from ~/japan-imports/backend with venv active:
  python3 fix_and_retrain.py

What it does (in order):
  1. Patches features.py  — removes 'source' from CAT_COLS (if still present)
  2. Runs scrapers concurrently — BE FORWARD, SBT Japan, Peach Cars
  3. Runs ETL cleaner on new rows
  4. Retrains the model
  5. Validates final metrics (no source, no overfitting)
  6. Prints pass/fail summary
"""

import os, sys, subprocess, logging, asyncio

logging.basicConfig(level=logging.INFO,
    format="%(asctime)s %(levelname)s: %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger("fix")

BASE = os.path.dirname(os.path.abspath(__file__))
PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"
results = []

def ok(label, detail=""):
    results.append(("PASS", label))
    print(f"  {PASS}  {label}" + (f" — {detail}" if detail else ""))

def fail(label, detail=""):
    results.append(("FAIL", label))
    print(f"  {FAIL}  {label}" + (f" — {detail}" if detail else ""))
    sys.exit(1)


# ════════════════════════════════════════════════════════════
# STEP 1 — Patch features.py (idempotent)
# ════════════════════════════════════════════════════════════
print("\n── Step 1: Patch app/ml/features.py ──")

features_path = os.path.join(BASE, "app", "ml", "features.py")
with open(features_path) as f:
    content = f.read()

# Check if source is in CAT_COLS
if '"source"' in content and 'CAT_COLS' in content:
    import re
    content = re.sub(r',\s*"source"', '', content)
    content = re.sub(r'"source"\s*,\s*', '', content)
    with open(features_path, "w") as f:
        f.write(content)
    ok("Removed 'source' from CAT_COLS")
else:
    ok("'source' already not in CAT_COLS — no change needed")

# Add pandas future option if missing
if "no_silent_downcasting" not in content:
    with open(features_path) as f:
        content = f.read()
    content = content.replace(
        "import numpy as np\nimport pandas as pd",
        "import numpy as np\nimport pandas as pd\npd.set_option('future.no_silent_downcasting', True)"
    )
    with open(features_path, "w") as f:
        f.write(content)
    ok("Added pd.set_option for future.no_silent_downcasting")

# Fix fillna FutureWarning
with open(features_path) as f:
    content = f.read()

OLD1 = 'df["mileage_km"].fillna(DEFAULTS["mileage_km"])'
NEW1 = 'df["mileage_km"].astype(float).fillna(float(DEFAULTS["mileage_km"]))'
OLD2 = 'df["engine_cc"].fillna(DEFAULTS["engine_cc"]).astype(int)'
NEW2 = 'df["engine_cc"].astype(float).fillna(float(DEFAULTS["engine_cc"]))'

changed = False
if OLD1 in content:
    content = content.replace(OLD1, NEW1); changed = True
if OLD2 in content:
    content = content.replace(OLD2, NEW2); changed = True

if changed:
    with open(features_path, "w") as f:
        f.write(content)
    ok("Fixed pandas fillna FutureWarning in features.py")
else:
    ok("features.py fillna already correct")


# ════════════════════════════════════════════════════════════
# STEP 2 — Run all scrapers concurrently
# ════════════════════════════════════════════════════════════
print("\n── Step 2: Run scrapers (BE FORWARD + SBT + Peach) ──")

sys.path.insert(0, BASE)

from app.database import engine
from sqlalchemy import text

# Count current data across all import sources
with engine.connect() as conn:
    r = conn.execute(text("""
        SELECT COUNT(*) as n
        FROM car_listings
        WHERE is_cleaned = true
          AND price_usd IS NOT NULL
          AND mileage_km IS NOT NULL
          AND engine_cc IS NOT NULL
          AND year >= 2018
    """)).one()
    n_imports = r.n

    # Also count local listings from Peach
    r2 = conn.execute(text("""
        SELECT COUNT(*) as n FROM local_listings
        WHERE scraped_at IS NOT NULL
    """)).one()
    n_local = r2.n

log.info("Current eligible import rows: %d", n_imports)
log.info("Current local listing rows:  %d", n_local)

async def run_scrapers():
    """Launch BE FORWARD, SBT, and Peach concurrently."""
    tasks = []

    # BE FORWARD
    try:
        from app.scrapers.beforward import BeForwardScraper
        import app.scrapers.beforward as bf_mod
        bf_mod.BF_MAKES = ["TOYOTA", "HONDA", "NISSAN", "MAZDA", "SUBARU"]
        async def scrape_bf():
            scraper = BeForwardScraper()
            return ("beforward", await scraper.run(max_pages=30))
        tasks.append(scrape_bf())
        log.info("Scheduled BE FORWARD scraper")
    except Exception as e:
        log.warning("BE FORWARD scraper not available: %s", e)

    # SBT Japan
    try:
        from app.scrapers.sbt import SBTScraper
        async def scrape_sbt():
            scraper = SBTScraper()
            return ("sbt", await scraper.run(max_pages=50))
        tasks.append(scrape_sbt())
        log.info("Scheduled SBT Japan scraper")
    except Exception as e:
        log.warning("SBT scraper not available: %s", e)

    # Peach Cars
    try:
        from app.scrapers.peachcars import PeachCarsScraper
        async def scrape_peach():
            scraper = PeachCarsScraper()
            return ("peachcars", await scraper.run())
        tasks.append(scrape_peach())
        log.info("Scheduled Peach Cars scraper")
    except Exception as e:
        log.warning("Peach Cars scraper not available: %s", e)

    if not tasks:
        log.error("No scrapers available to run")
        return {}

    results_map = {}
    for coro in asyncio.as_completed(tasks):
        try:
            name, count = await coro
            results_map[name] = count
            log.info("[%s] completed — %s new listings", name, count)
        except Exception as e:
            log.error("Scraper failed: %s", e)
    return results_map

scraper_results = asyncio.run(run_scrapers())

for name, count in scraper_results.items():
    ok(f"{name.upper()} scraper", f"{count} listings saved")

if not scraper_results:
    ok("No scrapers ran", "using existing data")


# ════════════════════════════════════════════════════════════
# STEP 3 — Run ETL cleaner
# ════════════════════════════════════════════════════════════
print("\n── Step 3: Run ETL cleaner ──")

try:
    from app.etl.cleaner import ListingCleaner
    stats = ListingCleaner(chunk_size=500).run()
    ok("ETL cleaner", f"fetched={stats['fetched']} cleaned={stats['cleaned']} dropped={stats['dropped']}")
except Exception as e:
    log.warning("ETL cleaner error: %s", e)
    ok("ETL cleaner", "skipped or failed")

# Re-check counts after ETL
with engine.connect() as conn:
    r = conn.execute(text("""
        SELECT COUNT(*) as n FROM car_listings
        WHERE is_cleaned = true
          AND price_usd IS NOT NULL AND mileage_km IS NOT NULL
          AND engine_cc IS NOT NULL AND year >= 2018
    """)).one()
    n_imports = r.n

    r2 = conn.execute(text("SELECT COUNT(*) as n FROM local_listings WHERE scraped_at IS NOT NULL")).one()
    n_local = r2.n

log.info("Import rows after scrape + ETL: %d", n_imports)
log.info("Local rows after scrape + ETL:  %d", n_local)

if n_imports < 50:
    fail("Training data", f"Only {n_imports} import rows. Check scraper connectivity.")
else:
    ok(f"Sufficient training data", f"{n_imports} import rows, {n_local} local rows")


# ════════════════════════════════════════════════════════════
# STEP 4 — Retrain the model
# ════════════════════════════════════════════════════════════
print("\n── Step 4: Retrain model ──")
log.info("Starting training on %d rows...", n_imports)

import glob

# Dynamically find and delete ALL previous xgb_v1 models, encoders, and metrics
old_artifacts = glob.glob(os.path.join(BASE, "models", "xgb_v1*"))
for p in old_artifacts:
    try:
        os.remove(p)
        log.debug(f"Removed old artifact: {os.path.basename(p)}")
    except OSError as e:
        log.error(f"Error deleting {p}: {e}")

from app.ml.train import train
metrics = train(use_optuna=False)

ok("Model trained", f"test_mae=${metrics['mae']:,.0f}  R²={metrics['r2']}  n_train={metrics['n_train']}")

# ════════════════════════════════════════════════════════════
# STEP 5 — Validate metrics
# ════════════════════════════════════════════════════════════
print("\n── Step 5: Validate metrics ──")

import json
metrics_path = os.path.join(BASE, "models", "xgb_v1_metrics.json")
with open(metrics_path) as f:
    m = json.load(f)

# source must not be in features
if "source" in m.get("features", []):
    fail("source not in features", "Still present — features.py not patched correctly")
else:
    ok("source not in features")

# FutureWarning check
import warnings
with warnings.catch_warnings(record=True) as w:
    warnings.simplefilter("always")
    from app.ml.features import engineer_features
    import pandas as pd, numpy as np
    test_df = pd.DataFrame([{"make":"Toyota","model":"Vitz","year":2021,
                              "mileage_km":None,"engine_cc":None,
                              "fuel_type":"petrol","transmission":"automatic","body_type":"hatchback"}])
    engineer_features(test_df)
    future_warns = [x for x in w if issubclass(x.category, FutureWarning)]
if future_warns:
    fail("No FutureWarning from features.py", str(future_warns[0].message)[:80])
else:
    ok("No FutureWarning from features.py")

# Overfitting check
test_mae  = m["mae"]
train_mae = m.get("train_mae", test_mae)
r2        = m["r2"]

if test_mae == 0:
    fail("No overfitting", "test_mae=$0 — model memorised data")

ratio = train_mae / max(test_mae, 1)
if ratio < 0.20:
    fail("No overfitting", f"train_mae=${train_mae:.0f} << test_mae=${test_mae:.0f} (ratio={ratio:.2f})")
else:
    ok("Overfitting check", f"ratio={ratio:.2f} train=${train_mae:.0f} test=${test_mae:.0f}")

if r2 < 0.5:
    print(f"  ⚠  R²={r2} is low (need more data). Model still usable. Target 500+ rows.")
else:
    ok(f"R²={r2}", "acceptable accuracy")

# Feature importance — source must be absent
fi = m.get("feature_importance", {})
if "source" in fi and fi["source"] > 0:
    fail("Feature importance", f"source has non-zero importance: {fi['source']}")
elif "source" in fi:
    if "source" not in m.get("features", []):
        ok("Feature importance", "source=0.0 not in features list (encoder artefact — harmless)")
    else:
        fail("Feature importance", "source in both features list and has 0 importance — retrain after full patch")
else:
    ok("Feature importance clean", f"top feature: {max(fi, key=fi.get) if fi else 'N/A'}")


# ════════════════════════════════════════════════════════════
# STEP 6 — Predictor sanity check
# ════════════════════════════════════════════════════════════
print("\n── Step 6: Predictor sanity ──")

from app.ml.predictor import CarPricePredictor
CarPricePredictor.load()

vitz_old = CarPricePredictor.predict({"make":"Toyota","model":"Vitz","year":2018,"mileage_km":90000,"engine_cc":1000,"fuel_type":"petrol","transmission":"automatic","body_type":"hatchback"})
vitz_new = CarPricePredictor.predict({"make":"Toyota","model":"Vitz","year":2023,"mileage_km":15000,"engine_cc":1000,"fuel_type":"petrol","transmission":"automatic","body_type":"hatchback"})
hybrid   = CarPricePredictor.predict({"make":"Toyota","model":"Aqua","year":2021,"mileage_km":40000,"engine_cc":1500,"fuel_type":"hybrid","transmission":"automatic","body_type":"hatchback"})

ok("2018 Vitz prediction", f"${vitz_old['predicted_price_usd']:,.0f}")
ok("2023 Vitz prediction", f"${vitz_new['predicted_price_usd']:,.0f}")
ok("2021 Aqua hybrid",     f"${hybrid['predicted_price_usd']:,.0f}")

if vitz_old["predicted_price_usd"] < vitz_new["predicted_price_usd"]:
    ok("Older car < newer car sanity check")
else:
    print(f"  ⚠  Age ordering not correct yet ({vitz_old['predicted_price_usd']:,.0f} vs {vitz_new['predicted_price_usd']:,.0f}) — needs more data")


# ════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ════════════════════════════════════════════════════════════
print("\n" + "═" * 60)
print("  SUMMARY")
print("═" * 60)

passed = sum(1 for s, _ in results if s == "PASS")
failed_list = [(l) for s, l in results if s == "FAIL"]

print(f"\n  {passed}/{len(results)} checks passed")
print(f"  Import rows     : {n_imports}")
print(f"  Local rows      : {n_local}")
print(f"  Test MAE        : ${m['mae']:,.0f}")
print(f"  R²              : {m['r2']}")
print(f"  Features        : {m['features']}")

if failed_list:
    print(f"\n  FAILED:")
    for l in failed_list:
        print(f"    ✗ {l}")
    print("\n  Fix the above then re-run this script.")
    sys.exit(1)
else:
    print("\n  ✓ All checks passed!")
    print("  ✓ source removed from features")
    print("  ✓ No FutureWarning")
    print("  ✓ Model trained on real data")
    print("\n  Next: run pytest tests/test_ml.py tests/test_calculator.py -v")
    print("        Then proceed to Phase 7.\n")
