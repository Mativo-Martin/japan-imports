from app.tasks.scrape_tasks import celery_app
from app.etl.cleaner import ListingCleaner
from app.etl.dedup   import mark_duplicates_inactive
from app.etl.quality import quality_report
from app.ml.train import train
import logging

logger = logging.getLogger(__name__)

@celery_app.task
def run_etl_pipeline():
    """Clean → deduplicate → quality check."""
    cleaner = ListingCleaner(chunk_size=500)
    stats   = cleaner.run()
    logger.info("Cleaner stats: %s", stats)

    n_dups = mark_duplicates_inactive(dry_run=False)
    logger.info("Dedup: removed %d cross-source duplicates", n_dups)

    report = quality_report()
    logger.info("Quality report: %s records clean, sources: %s",
                report["total_records"], report["sources"])
    return {**stats, "duplicates_removed": n_dups, "quality": report}

@celery_app.task
def train_model():
    """Automatic daily model retraining."""
    try:
        metrics = train(use_optuna=False)
        logger.info("Model training complete: MAE=$%.2f R²=%.4f", metrics["mae"], metrics["r2"])
        return {"status": "success", "metrics": metrics}
    except Exception as e:
        logger.error("Model training failed: %s", e)
        return {"status": "failed", "error": str(e)}

