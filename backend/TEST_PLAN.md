# Comprehensive Test Plan: BeForward & PeachCars Scraping + ETL

## Document Purpose
This test plan validates that the scraping + ETL pipeline correctly fetches diverse car types, performs data cleaning/validation, and produces production-ready data on the Neon PostgreSQL database.

**Target Audience**: QA, DevOps, Data Engineers  
**Scope**: BeForward, PeachCars scrapers + ETL cleaner + Quality check  
**Database**: Neon PostgreSQL (cloud-based)

---

## Test Environment Setup

### Prerequisites
- [ ] Neon PostgreSQL database accessible with valid `DATABASE_URL`
- [ ] Redis running or accessible via `REDIS_URL`
- [ ] Python 3.10+, dependencies from `requirements.txt` installed
- [ ] `.env` file configured with `database_url`, `redis_url`, `app_env`
- [ ] Alembic migrations applied (`alembic upgrade head`)

### Database State
- [ ] Start with clean state: `DELETE FROM car_listings;` and `DELETE FROM local_listings;`
- [ ] Verify tables exist: `car_listings`, `local_listings`, and associated indexes

### Network Access
- [ ] BeForward: `https://www.beforward.jp/stocklist/minyear/2018/maxyear/2025/p/1/` accessible
- [ ] PeachCars: `https://peachcars.co.ke/cars` API accessible

---

## Test Categories & Scenarios

### Category 1: BeForward Data Acquisition Tests

#### Test 1.1: Single Page Scrape
**Objective**: Verify BeForward scraper can fetch and parse a single page.

**Steps**:
1. Run: `python -c "import asyncio; from app.scrapers.beforward import BeForwardScraper; print(asyncio.run(BeForwardScraper().run(max_pages=1)))"`
2. Check database: `SELECT COUNT(*) FROM car_listings WHERE source='beforward';`

**Expected Results**:
- Return value: 1-50 new records (at least 1)
- Car types: Mix of sedans, SUVs, hatchbacks visible in sample
- All have: source_id, make, model, year, price_usd, url
- Year range: 2018-2025
- Price range: $300-$150,000 (typical Japanese cars)

**Pass Criteria**: ✅ At least 5 records with year 2018-2025 and price in range

---

#### Test 1.2: Multi-Page Scrape (10 Pages)
**Objective**: Verify scraper handles pagination and retrieves diverse inventory.

**Steps**:
1. Run: `python dev_runner.py scrape beforward 10`
2. Monitor: Check logs for "page 1", "page 2", etc.
3. Inspect: `SELECT COUNT(*), MIN(price_usd), MAX(price_usd), COUNT(DISTINCT make) FROM car_listings WHERE source='beforward';`

**Expected Results**:
- Total records: 50-200 (depending on page availability)
- Distinct makes: 5+ (Toyota, Honda, Nissan, Mazda, Subaru minimum)
- Price distribution: $2,000-$150,000 range
- No duplicate source_ids
- Log shows progression through multiple pages

**Pass Criteria**: ✅ 50+ records, 5+ distinct makes, no duplicates

---

#### Test 1.3: Car Type Diversity
**Objective**: Verify BeForward scraper captures various car types.

**Steps**:
1. Query: 
```sql
SELECT DISTINCT body_type, COUNT(*) as count 
FROM car_listings 
WHERE source='beforward' 
GROUP BY body_type 
ORDER BY count DESC;
```
2. Verify each type: sedans, SUVs, hatchbacks, etc.

**Expected Results**:
- Sedans: 30%+ of records
- SUVs: 20%+ of records
- Hatchbacks: 10%+ of records
- Other types: vans, trucks, crossovers present

**Pass Criteria**: ✅ At least 3 distinct body types represented

---

#### Test 1.4: Year Distribution
**Objective**: Verify cars span 2018-2025 range, not just recent years.

**Steps**:
1. Query:
```sql
SELECT year, COUNT(*) as count 
FROM car_listings 
WHERE source='beforward' 
GROUP BY year 
ORDER BY year;
```

**Expected Results**:
- Records from 2018: at least 1
- Records from 2024-2025: present
- No year < 2018
- Distribution across multiple years (not concentrated in 2023-2025)

**Pass Criteria**: ✅ At least 5 different years represented, minimum 1 per year

---

#### Test 1.5: Price Distribution
**Objective**: Verify realistic price range, no extreme outliers.

**Steps**:
1. Query:
```sql
SELECT 
  MIN(price_usd), MAX(price_usd), AVG(price_usd),
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY price_usd) AS q1,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY price_usd) AS q3
FROM car_listings WHERE source='beforward';
```

**Expected Results**:
- Min: $1,000-$5,000
- Max: $100,000-$150,000
- Mean: $20,000-$50,000
- Q1-Q3 spread: reasonable distribution (not skewed)
- No prices > $200,000
- No prices < $300

**Pass Criteria**: ✅ Mean $15k-$60k, realistic distribution

---

### Category 2: PeachCars Data Acquisition Tests

#### Test 2.1: PeachCars Single Fetch
**Objective**: Verify PeachCars API scraper works.

**Steps**:
1. Run: `python -c "import asyncio; from app.scrapers.peachcars import PeachCarsScraper; print(asyncio.run(PeachCarsScraper().run(max_pages=1)))"`
2. Check: `SELECT COUNT(*) FROM local_listings WHERE source='peachcars';`

**Expected Results**:
- Return value: 10-100 records
- Table: `local_listings` (not car_listings)
- Condition: "local_used" or "imported_used"
- Year, price_kes, mileage_km present

**Pass Criteria**: ✅ At least 5 records in local_listings

---

#### Test 2.2: PeachCars Data Schema
**Objective**: Verify PeachCars data matches local_listings schema.

**Steps**:
1. Query:
```sql
SELECT 
  COUNT(*) as total,
  COUNT(make) as has_make,
  COUNT(model) as has_model,
  COUNT(year) as has_year,
  COUNT(price_kes) as has_price_kes,
  COUNT(DISTINCT condition) as distinct_conditions
FROM local_listings WHERE source='peachcars';
```

**Expected Results**:
- All rows have make, model, year, price_kes
- Distinct conditions: 2 ("local_used", "imported_used")
- Location: "Nairobi" for all records

**Pass Criteria**: ✅ 100% field population for required fields, 2 condition types

---

### Category 3: ETL Cleaner Tests

#### Test 3.1: Cleaner Field Standardization
**Objective**: Verify cleaner standardizes make, model, fuel_type, transmission.

**Steps**:
1. Insert test record with non-standard data:
```python
from app.database import SessionLocal
from app.models.car_listings import CarListing
db = SessionLocal()
db.add(CarListing(
  source='test', source_id='test_std_1', make='TOYOTA', model='COROLLA',
  year=2023, price_usd=15000, fuel_type='gasoline', transmission='at', is_cleaned=False
))
db.commit()
```
2. Run cleaner: `python -c "from app.etl.cleaner import ListingCleaner; ListingCleaner().run()"`
3. Query cleaned record:
```sql
SELECT make, model, fuel_type, transmission, is_cleaned 
FROM car_listings 
WHERE source_id='test_std_1';
```

**Expected Results**:
- make: "Toyota" (standardized)
- model: "Corolla" (standardized)
- fuel_type: "petrol" (mapped from "gasoline")
- transmission: "automatic" (mapped from "at")
- is_cleaned: true

**Pass Criteria**: ✅ All fields correctly standardized and cleaned

---

#### Test 3.2: Cleaner Year Filtering
**Objective**: Verify pre-2018 cars are dropped.

**Steps**:
1. Insert 2017 car: `INSERT INTO car_listings (source, source_id, make, model, year, price_usd, is_cleaned) VALUES ('test', 'test_year_old', 'Toyota', 'Corolla', 2017, 15000, false);`
2. Run cleaner
3. Query: `SELECT * FROM car_listings WHERE source_id='test_year_old' AND is_cleaned=true;`

**Expected Results**:
- No records returned (pre-2018 cars filtered out)
- Log shows: "Filter: N → M rows" with decreased count

**Pass Criteria**: ✅ Pre-2018 cars not in cleaned dataset

---

#### Test 3.3: Cleaner Price Filtering
**Objective**: Verify extreme prices ($0-$300, >$200k) are filtered.

**Steps**:
1. Insert 3 test cars with prices: $0, $250, $250,000
2. Run cleaner
3. Query: `SELECT COUNT(*) FROM car_listings WHERE source_id LIKE 'test_price%' AND is_cleaned=true;`

**Expected Results**:
- Count: 0 (all 3 dropped)
- All cars outside $300-$200k range removed

**Pass Criteria**: ✅ All out-of-range prices filtered

---

#### Test 3.4: Cleaner Required Field Nulls
**Objective**: Verify rows with null make/model/year/price are dropped.

**Steps**:
1. Insert cars with missing required fields (4 records total):
   - Missing make
   - Missing model
   - Missing year
   - Missing price_usd
2. Run cleaner
3. Query: `SELECT COUNT(*) FROM car_listings WHERE source_id LIKE 'test_null%' AND is_cleaned=true;`

**Expected Results**:
- Count: 0 (all dropped due to nulls)

**Pass Criteria**: ✅ All rows with null required fields dropped

---

#### Test 3.5: Cleaner Outlier Removal (IQR)
**Objective**: Verify extreme price outliers are removed per make+model+year group.

**Steps**:
1. Insert 10 cars (same make/model/year): 9 normal prices ($15k-$20k), 1 extreme ($200k)
2. Run cleaner
3. Query: `SELECT COUNT(*) FROM car_listings WHERE source_id LIKE 'test_outlier%' AND is_cleaned=true;`

**Expected Results**:
- Count: 9 (extreme outlier removed)
- Log shows IQR filtering applied

**Pass Criteria**: ✅ Extreme outlier removed, normal cars retained

---

### Category 4: ETL Quality Check Tests

#### Test 4.1: Quality Report Generation
**Objective**: Verify quality_report() computes all metrics correctly.

**Steps**:
1. Load 200 test cars: `python dev_runner.py load-test 200`
2. Run cleaner: `python dev_runner.py etl`
3. Inspect output quality metrics

**Expected Results**:
- total_records: ≥ 100 (assertion requirement met)
- sources: {'test': 200, ...}
- makes: 5+ (Toyota, Honda, Nissan, Mazda, Subaru)
- models: 10+
- year_range: [2021, 2023] (test data range)
- price_range_usd: [$2k, $25k]
- null_rates all 0% (no nulls allowed in cleaned data)

**Pass Criteria**: ✅ All assertions pass, metrics computed correctly

---

#### Test 4.2: Quality Minimum Record Assertion
**Objective**: Verify pipeline fails if < 100 cleaned records.

**Steps**:
1. Load 50 test cars: `python -c "from app.etl.test_data import load_test_data; load_test_data(50)"`
2. Run ETL: `python dev_runner.py etl`
3. Verify error

**Expected Results**:
- Error: "AssertionError: Too few records — scraping may have failed"
- Pipeline stops at quality check

**Pass Criteria**: ✅ Pipeline fails gracefully with clear error

---

#### Test 4.3: Quality Null Rate Assertion
**Objective**: Verify pipeline fails if any nulls in critical fields.

**Steps**:
1. Manually insert cleaned record with null price_usd:
```sql
INSERT INTO car_listings (source, source_id, make, model, year, price_usd, is_cleaned) 
VALUES ('test', 'test_null_price', 'Toyota', 'Corolla', 2023, NULL, true);
```
2. Run quality report: `python -c "from app.etl.quality import quality_report; print(quality_report())"`
3. Verify error

**Expected Results**:
- Error: "AssertionError: Null prices in cleaned data!"

**Pass Criteria**: ✅ Quality check detects null violations

---

### Category 5: End-to-End Integration Tests

#### Test 5.1: Full Pipeline with Test Data
**Objective**: Verify entire pipeline from raw data to quality-checked dataset.

**Steps**:
1. Reset DB: `DELETE FROM car_listings;`
2. Load test data: `python dev_runner.py load-test 300`
3. Run full ETL: `python dev_runner.py etl`
4. Inspect final state:
```sql
SELECT 
  COUNT(*) as total_cleaned,
  COUNT(DISTINCT source) as num_sources,
  COUNT(DISTINCT make) as num_makes,
  MIN(year) as min_year,
  MAX(year) as max_year
FROM car_listings WHERE is_cleaned=true;
```

**Expected Results**:
- total_cleaned: 300
- num_sources: 1 (test)
- num_makes: 5
- min_year: 2021, max_year: 2023
- Quality report passes all assertions

**Pass Criteria**: ✅ Full pipeline succeeds, all records cleaned and validated

---

#### Test 5.2: Multi-Source Deduplication
**Objective**: Verify cross-source duplicates are identified and marked.

**Steps**:
1. Load test data (200 records, source='test')
2. Insert same cars with different source (source='beforward'):
```sql
INSERT INTO car_listings (source, source_id, make, model, year, price_usd, mileage_km, is_cleaned)
SELECT 'beforward', 'bf_dup_' || ROW_NUMBER() OVER (), make, model, year, price_usd+100, mileage_km+100, false
FROM car_listings WHERE source='test' LIMIT 10;
```
3. Run ETL: `python dev_runner.py etl`
4. Query duplicates:
```sql
SELECT COUNT(DISTINCT is_cleaned) FROM car_listings WHERE source='beforward' AND is_cleaned=false;
```

**Expected Results**:
- Duplicates identified
- Cheaper source kept (cleaned=true)
- Expensive source marked cleaned=false
- Dedup log shows duplicates found

**Pass Criteria**: ✅ Cross-source duplicates correctly handled

---

#### Test 5.3: Real BeForward Scrape + ETL
**Objective**: Verify production-like flow: scrape real data, clean, validate.

**Steps**:
1. Reset DB: `DELETE FROM car_listings WHERE source='beforward';`
2. Scrape: `python dev_runner.py scrape beforward 10`
3. Run ETL: `python dev_runner.py etl`
4. Check final metrics:
```sql
SELECT 
  COUNT(*) as raw_total,
  SUM(CASE WHEN is_cleaned=true THEN 1 ELSE 0 END) as cleaned_count,
  ROUND(100.0 * SUM(CASE WHEN is_cleaned=true THEN 1 ELSE 0 END) / COUNT(*), 1) as pct_cleaned
FROM car_listings WHERE source='beforward';
```

**Expected Results**:
- raw_total: 50-200 (pages available)
- cleaned_count: 40-180 (80%+ pass cleaning)
- pct_cleaned: 80%+ (most cars pass filters)
- Quality report passes
- Make diversity: 5+ distinct makes

**Pass Criteria**: ✅ 50+ raw records, 80%+ conversion to cleaned, quality report passes

---

### Category 6: Regression Tests

#### Test 6.1: Existing Seed Data Preserved
**Objective**: Verify pipeline doesn't break existing data.

**Steps**:
1. Run seed data: `python seed.py`
2. Query before ETL: `SELECT COUNT(*) FROM car_listings WHERE source IN ('beforward', 'sbt', 'carfromjapan');`
3. Run ETL
4. Query after ETL: `SELECT COUNT(*) FROM car_listings WHERE source IN ('beforward', 'sbt', 'carfromjapan');`

**Expected Results**:
- Counts match (no data lost)
- Pre-existing records still accessible

**Pass Criteria**: ✅ Seed data still present after ETL

---

#### Test 6.2: API Response Handling
**Objective**: Verify API endpoints return correct paginated results.

**Steps**:
1. Load 100 cars: `python dev_runner.py load-test 100`
2. Run ETL
3. Call API: `curl http://localhost:8000/api/listings/?skip=0&limit=10`
4. Verify pagination: `curl http://localhost:8000/api/listings/?skip=10&limit=10`

**Expected Results**:
- First call: 10 records
- Second call: 10 different records
- Total records accessible: 100
- Pagination works correctly

**Pass Criteria**: ✅ API pagination returns correct subsets

---

## Performance & Scalability Tests

### Test P.1: Large Dataset Cleaner Performance
**Objective**: Verify cleaner handles 10,000+ records efficiently.

**Steps**:
1. Load 5,000 test cars (cycling templates)
2. Time cleaner execution: `time python dev_runner.py etl`
3. Monitor: Check DB connection pool, memory usage

**Expected Results**:
- Execution time: < 5 minutes
- No connection timeouts
- Memory usage: < 2GB
- All records processed

**Pass Criteria**: ✅ Completes in < 5 minutes without errors

---

## Bug/Edge Case Tests

### Test E.1: Duplicate Source IDs
**Objective**: Verify duplicate source_ids are handled (upsert).

**Steps**:
1. Insert same car twice with same source_id
2. Run cleaner
3. Query: `SELECT COUNT(*) FROM car_listings WHERE source_id='test_dup';`

**Expected Results**:
- Count: 1 (upserted, not duplicated)

**Pass Criteria**: ✅ Duplicate source_ids handled via upsert

---

### Test E.2: Missing Optional Fields
**Objective**: Verify missing optional fields are filled with defaults.

**Steps**:
1. Insert car with NULL: fuel_type, transmission, engine_cc
2. Run cleaner
3. Query:
```sql
SELECT fuel_type, transmission, engine_cc 
FROM car_listings WHERE source_id='test_defaults' AND is_cleaned=true;
```

**Expected Results**:
- fuel_type: "petrol" (default)
- transmission: "automatic" (default)
- engine_cc: 1500 (fallback)

**Pass Criteria**: ✅ All defaults applied correctly

---

### Test E.3: Malformed Year in Image Alt
**Objective**: Verify year extraction handles edge cases.

**Steps**:
1. Test with alt text: "TOYOTA COROLLA" (no year)
2. Test with alt text: "999 TOYOTA COROLLA" (invalid year)
3. Verify scraper skips these records

**Expected Results**:
- Malformed records not inserted
- Log shows parse errors

**Pass Criteria**: ✅ Malformed data safely skipped

---

## Test Execution Checklist

- [ ] Environment prerequisites verified
- [ ] Test data loaded
- [ ] Category 1 tests passed (BeForward: pages 1-5)
- [ ] Category 2 tests passed (PeachCars: API verification)
- [ ] Category 3 tests passed (Cleaner: standardization, filtering)
- [ ] Category 4 tests passed (Quality: assertions)
- [ ] Category 5 tests passed (Integration: full pipeline)
- [ ] Category 6 tests passed (Regression: existing data)
- [ ] Performance tests passed (< 5min for 5k records)
- [ ] Edge case tests passed (duplicates, defaults, malformed)

---

## Success Criteria Summary

| Aspect | Criterion |
|--------|-----------|
| **Data Diversity** | 5+ distinct makes, 3+ body types, years 2018-2025 |
| **Data Volume** | 100+ cleaned records minimum (for assertions) |
| **Conversion Rate** | 80%+ raw → cleaned (most pass filters) |
| **Data Quality** | 0% null rates, no outliers, consistent standardization |
| **Performance** | 5,000 records cleaned in < 5 minutes |
| **Regression** | Existing data preserved, API works correctly |
| **Production Readiness** | All tests pass, pipeline is deterministic and reliable |

---

## Sign-Off

- **Test Plan Created By**: [Team]
- **Date**: [Current Date]
- **Reviewed By**: [Reviewer]
- **Approved For**: Development → Staging → Production
