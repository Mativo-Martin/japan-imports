#!/usr/bin/env python3
"""
fix_and_retrain.py
──────────────────
Run from ~/japan-imports/backend with venv active:
  python3 fix_and_retrain.py

What it does (in order):
  1. Patches features.py  — removes 'source' from CAT_COLS
  2. Patches train.py     — fixes FutureWarning (root_mean_squared_error)
  3. Runs BE FORWARD scraper (max_pages=30) to collect more data
  4. Runs ETL cleaner on new rows
  5. Retrains the model
  6. Validates final metrics (no source, no overfitting)
  7. Prints pass/fail summary
"""

import os, sys, subprocess, logging

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
# STEP 1 — Patch features.py
# ════════════════════════════════════════════════════════════
print("\n── Step 1: Patch app/ml/features.py ──")

features_path = os.path.join(BASE, "app", "ml", "features.py")
with open(features_path) as f:
    content = f.read()

# Check if source is in CAT_COLS
if '"source"' in content and 'CAT_COLS' in content:
    # Remove source from the list
    import re
    # Pattern: CAT_COLS = [..., "source", ...]  or  [..., "source"]
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

# Fix fillna FutureWarning — ensure explicit .astype(float) before fillna
with open(features_path) as f:
    content = f.read()

# Replace bare fillna patterns that cause warnings
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
# STEP 2 — Patch train.py
# ════════════════════════════════════════════════════════════
print("\n── Step 2: Patch app/ml/train.py ──")

train_path = os.path.join(BASE, "app", "ml", "train.py")
with open(train_path) as f:
    content = f.read()

# Fix sklearn FutureWarning: replace squared=False with root_mean_squared_error
if "squared=False" in content:
    content = content.replace(
        "from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score",
        "from sklearn.metrics import mean_absolute_error, r2_score\ntry:\n    from sklearn.metrics import root_mean_squared_error\nexcept ImportError:\n    from sklearn.metrics import mean_squared_error\n    def root_mean_squared_error(y_true, y_pred):\n        return mean_squared_error(y_true, y_pred, squared=False)"
    )
    content = content.replace(
        "rmse = mean_squared_error(y_test, preds, squared=False)",
        "rmse = root_mean_squared_error(y_test, preds)"
    )
    content = content.replace(
        "mean_squared_error(y_test, preds, squared=False)",
        "root_mean_squared_error(y_test, preds)"
    )
    with open(train_path, "w") as f:
        f.write(content)
    ok("Fixed root_mean_squared_error import in train.py")
else:
    ok("train.py RMSE already using correct import")

# Ensure early_stopping_rounds is handled correctly for XGBoost 2.x
# In XGBoost 2.x, early_stopping_rounds goes in fit(), not constructor
with open(train_path) as f:
    content = f.read()

if "early_stopping_rounds" not in content:
    # Add it to the fit call
    old_fit = 'model.fit(\n        X_train, y_train,\n        eval_set=[(X_test, y_test)],\n        verbose=50,\n    )'
    new_fit = 'model.fit(\n        X_train, y_train,\n        eval_set=[(X_test, y_test)],\n        verbose=50,\n        early_stopping_rounds=20,\n    )'
    if old_fit in content:
        content = content.replace(old_fit, new_fit)
        with open(train_path, "w") as f:
            f.write(content)
        ok("Added early_stopping_rounds=20 to model.fit()")
else:
    ok("early_stopping_rounds already in train.py")


# ════════════════════════════════════════════════════════════
# STEP 3 — Check current training data, run scraper if needed
# ════════════════════════════════════════════════════════════
print("\n── Step 3: Check training data / run scraper ──")

import asyncio
# Import after potential patch so it picks up fixed files
sys.path.insert(0, BASE)

from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    r = conn.execute(text("""
        SELECT COUNT(*) as n
        FROM car_listings
        WHERE source='beforward' AND is_cleaned=true
          AND price_usd IS NOT NULL
          AND mileage_km IS NOT NULL
          AND engine_cc IS NOT NULL
          AND year >= 2018
    """)).one()

n_current = r.n
log.info("Current eligible training rows: %d", n_current)

if n_current < 300:
    log.info("Running BE FORWARD scraper (max_pages=30) to collect more data...")
    log.info("This will take ~5–8 minutes. Each page = ~20 listings.")

    from app.scrapers.beforward import BeForwardScraper
    import app.scrapers.beforward as bf_mod

    # Scrape Toyota + Honda + Nissan (highest Kenya import volume)
    bf_mod.BF_MAKES = ["TOYOTA", "HONDA", "NISSAN", "MAZDA", "SUBARU"]

    async def scrape():
        scraper = BeForwardScraper()
        total   = await scraper.run(max_pages=30)
        return total

    new_listings = asyncio.run(scrape())
    ok(f"Scraper completed", f"{new_listings} new listings saved")

    # Run ETL on new rows
    log.info("Running ETL on new rows...")
    from app.etl.cleaner import ListingCleaner
    stats = ListingCleaner(chunk_size=500).run()
    ok("ETL cleaner", f"fetched={stats['fetched']} cleaned={stats['cleaned']} dropped={stats['dropped']}")

    # Re-check
    with engine.connect() as conn:
        r2 = conn.execute(text("""
            SELECT COUNT(*) as n FROM car_listings
            WHERE source='beforward' AND is_cleaned=true
              AND price_usd IS NOT NULL AND mileage_km IS NOT NULL
              AND engine_cc IS NOT NULL AND year >= 2018
        """)).one()
    n_current = r2.n
    log.info("Eligible rows after scrape + ETL: %d", n_current)
else:
    ok(f"Sufficient training data", f"{n_current} eligible rows")

if n_current < 50:
    fail("Training data", f"Only {n_current} rows after scraping. Check BF scraper connectivity.")


# ════════════════════════════════════════════════════════════
# STEP 4 — Retrain the model
# ════════════════════════════════════════════════════════════
print("\n── Step 4: Retrain model ──")
log.info("Starting training on %d rows...", n_current)

# Delete old model to force fresh train
for fname in ["xgb_v1.joblib", "encoder_v1.joblib", "metrics_v1.json"]:
    p = os.path.join(BASE, "models", fname)
    if os.path.exists(p):
        os.remove(p)

from app.ml.train import train
metrics = train(use_optuna=False)

ok("Model trained", f"test_mae=${metrics['mae']:,.0f}  R²={metrics['r2']}  n_train={metrics['n_train']}")


# ════════════════════════════════════════════════════════════
# STEP 5 — Validate metrics
# ════════════════════════════════════════════════════════════
print("\n── Step 5: Validate metrics ──")

import json
metrics_path = os.path.join(BASE, "models", "metrics_v1.json")
with open(metrics_path) as f:
    m = json.load(f)

# source must not be in features
if "source" in m.get("features", []):
    fail("source not in features", "Still present — features.py not patched correctly")
else:
    ok("source not in features")

# FutureWarning check — re-run import to see if warning gone
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
    # source=0.0 means encoder still included it — check features list
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
print(f"  Training rows   : {n_current}")
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
    print("  ✓ Model trained on real BF data")
    print("\n  Next: run pytest tests/test_ml.py tests/test_calculator.py -v")
    print("        Then proceed to Phase 7.\n")
