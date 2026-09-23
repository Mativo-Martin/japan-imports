#!/usr/bin/env python3
"""
daily_scrape_runner.py
───────────────────────
Automated midnight daily pipeline for Japan Imports:
  1. Runs BE FORWARD, SBT Japan, and Peach Cars scrapers concurrently.
  2. Runs ETL ListingCleaner & cross-source deduplication.
  3. Retrains the XGBoost model with updated listing data.
  4. Logs complete execution summary.

Can be run via CLI, system cron, or Celery task.
"""

import os
import sys
import asyncio
import logging
from datetime import datetime

# Add backend directory to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("daily_scrape_runner")

from app.scrapers.beforward import BeForwardScraper
from app.scrapers.sbt import SBTScraper
from app.scrapers.peachcars import PeachCarsScraper
from app.etl.cleaner import ListingCleaner
from app.etl.dedup import mark_duplicates_inactive
from app.etl.quality import quality_report
from app.ml.train import train


async def run_all_scrapers():
    """Launch scrapers concurrently across all configured sources."""
    logger.info("=== Starting Concurrent Scraping Pass ===")
    
    tasks = []
    scrapers = {
        "beforward": BeForwardScraper(),
        "sbt": SBTScraper(),
        "peachcars": PeachCarsScraper(),
    }

    async def _run_one(name, scraper):
        try:
            logger.info("Starting scraper [%s]...", name)
            res = await scraper.run()
            logger.info("Scraper [%s] finished: %s", name, res)
            return name, res
        except Exception as e:
            logger.error("Scraper [%s] failed with error: %s", name, e, exc_info=True)
            return name, {"error": str(e), "new": 0, "updated": 0, "sold": 0, "removed": 0}

    for name, scraper in scrapers.items():
        tasks.append(_run_one(name, scraper))

    results = await asyncio.gather(*tasks)
    return dict(results)


def run_daily_pipeline():
    """Execute complete daily pipeline: Scraping -> ETL -> Retraining."""
    start_time = datetime.utcnow()
    logger.info("==================================================")
    logger.info("   AUTOMATED DAILY SCRAPE & ETL RUNNER STARTING   ")
    logger.info("   Timestamp: %s UTC                            ", start_time.isoformat())
    logger.info("==================================================")

    # Step 1: Execute scrapers
    scrape_summary = asyncio.run(run_all_scrapers())

    # Step 2: Run ETL cleaning & deduplication
    logger.info("\n--- Step 2: Running ETL Cleaner & Quality Rules ---")
    cleaner_stats = {}
    dups_removed = 0
    try:
        cleaner = ListingCleaner(chunk_size=500)
        cleaner_stats = cleaner.run()
        logger.info("ETL Cleaner completed: %s", cleaner_stats)

        dups_removed = mark_duplicates_inactive(dry_run=False)
        logger.info("Deduplication completed: %d inactive duplicate records marked", dups_removed)

        q_report = quality_report()
        logger.info("Quality Report: Total Clean Records = %d", q_report.get("total_records", 0))
    except Exception as e:
        logger.error("ETL processing encountered an error: %s", e, exc_info=True)

    # Step 3: Retrain XGBoost ML model
    logger.info("\n--- Step 3: Retraining XGBoost Valuation Model ---")
    train_metrics = {}
    try:
        train_metrics = train(use_optuna=False)
        logger.info(
            "Model retraining successful: Test MAE=$%.2f | R²=%.4f | Train MAE=$%.2f | n_train=%d",
            train_metrics.get("mae", 0),
            train_metrics.get("r2", 0),
            train_metrics.get("train_mae", 0),
            train_metrics.get("n_train", 0),
        )
    except Exception as e:
        logger.error("Model retraining encountered an error: %s", e, exc_info=True)

    duration = (datetime.utcnow() - start_time).total_seconds()
    logger.info("\n==================================================")
    logger.info("   DAILY PIPELINE COMPLETE IN %.2f SECONDS        ", duration)
    logger.info("==================================================")
    logger.info("Scraper Results: %s", scrape_summary)
    logger.info("ETL Stats: %s | Duplicates Removed: %d", cleaner_stats, dups_removed)
    logger.info("ML Metrics: MAE=$%s | R²=%s", train_metrics.get("mae"), train_metrics.get("r2"))

    return {
        "status": "success",
        "duration_seconds": duration,
        "scrapers": scrape_summary,
        "etl": cleaner_stats,
        "metrics": train_metrics,
    }


if __name__ == "__main__":
    run_daily_pipeline()
