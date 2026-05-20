"""
db_summary.py
─────────────
Run from backend/ with venv active:
  python3 db_summary.py

Shows counts, averages and year ranges for both tables.
Safe to run at any time — read-only queries.
"""

from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:

    # ── car_listings (Japan imports) ───────────────────────────────────────
    car_rows = conn.execute(text("""
        SELECT source,
               COUNT(*)                            AS n,
               ROUND(AVG(price_usd)::numeric, 0)  AS avg_usd,
               MIN(year)                           AS min_year,
               MAX(year)                           AS max_year,
               SUM(CASE WHEN is_cleaned THEN 1 ELSE 0 END) AS cleaned
        FROM   car_listings
        GROUP  BY source
        ORDER  BY n DESC
    """)).fetchall()

    print()
    print("=== Japan listings (car_listings) ===")
    print(f"{'Source':<20} {'Count':>6} {'Avg USD':>10} {'Year range':>12} {'Cleaned':>8}")
    print("-" * 62)
    for r in car_rows:
        yr   = f"{r.min_year or '?'}-{r.max_year or '?'}"
        print(
            f"{r.source:<20} "
            f"{r.n:>6} "
            f"{int(r.avg_usd or 0):>10,} "
            f"{yr:>12} "
            f"{r.cleaned:>6}/{r.n}"
        )
    total_cars = sum(r.n for r in car_rows)
    print(f"\n  Total: {total_cars} rows")

    # ── local_listings (Peach Cars) ────────────────────────────────────────
    local_rows = conn.execute(text("""
        SELECT source,
               condition,
               COUNT(*)                            AS n,
               ROUND(AVG(price_kes)::numeric, 0)  AS avg_kes,
               MIN(year)                           AS min_year,
               MAX(year)                           AS max_year
        FROM   local_listings
        GROUP  BY source, condition
        ORDER  BY n DESC
    """)).fetchall()

    print()
    print("=== Local listings (local_listings) ===")
    print(f"{'Source':<15} {'Condition':<18} {'Count':>6} {'Avg KES':>14} {'Year range':>12}")
    print("-" * 70)
    for r in local_rows:
        yr = f"{r.min_year or '?'}-{r.max_year or '?'}"
        print(
            f"{r.source:<15} "
            f"{r.condition:<18} "
            f"{r.n:>6} "
            f"{int(r.avg_kes or 0):>14,} "
            f"{yr:>12}"
        )
    total_local = sum(r.n for r in local_rows)
    print(f"\n  Total: {total_local} rows")
    print()