#!/usr/bin/env python
"""Run scrapers and ETL manually for development."""
import asyncio, logging, sys
from app.tasks.scrape_tasks import SCRAPERS
from app.tasks.etl_tasks import run_etl_pipeline
from app.etl.test_data import load_test_data

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s"
)
logger = logging.getLogger(__name__)

async def run_scraper(source_name: str, max_pages: int = 5) -> int:
    """Run a single scraper."""
    cls = SCRAPERS.get(source_name)
    if not cls:
        logger.error("Unknown source: %s", source_name)
        return 0
    logger.info("Starting scraper: %s (max %d pages)", source_name, max_pages)
    scraper = cls()
    try:
        total = await scraper.run(max_pages=max_pages)
        logger.info("[%s] Complete — %d new listings", source_name, total)
        return total
    except Exception as e:
        logger.error("[%s] Failed: %s", source_name, e)
        return 0

async def run_all_scrapers(max_pages: int = 5) -> int:
    """Run all scrapers in parallel."""
    tasks = [
        run_scraper(name, max_pages)
        for name in SCRAPERS.keys()
    ]
    results = await asyncio.gather(*tasks)
    return sum(results)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python dev_runner.py <command> [args]")
        print()
        print("Commands:")
        print("  load-test [count]       Load test data (default 150 listings)")
        print("  scrape <source> [pages] Run single scraper (default 5 pages)")
        print("  scrape-all [pages]      Run all scrapers in parallel")
        print("  etl                     Run cleaner → dedup → quality check")
        print("  full [pages]            Scrape all → ETL pipeline")
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "load-test":
        count = int(sys.argv[2]) if len(sys.argv) > 2 else 150
        load_test_data(count)

    elif cmd == "scrape":
        if len(sys.argv) < 3:
            logger.error("Need source name: scrape <source> [max_pages]")
            sys.exit(1)
        source = sys.argv[2]
        pages = int(sys.argv[3]) if len(sys.argv) > 3 else 5
        total = asyncio.run(run_scraper(source, pages))
        print(f"\nScraped {total} new listings")

    elif cmd == "scrape-all":
        pages = int(sys.argv[2]) if len(sys.argv) > 2 else 5
        total = asyncio.run(run_all_scrapers(pages))
        print(f"\nScraped {total} new listings total")

    elif cmd == "etl":
        print("Running ETL pipeline...")
        result = run_etl_pipeline()
        print(f"\nETL complete:\n{result}")

    elif cmd == "full":
        pages = int(sys.argv[2]) if len(sys.argv) > 2 else 5
        logger.info("=== Phase 1: Scraping ===")
        scraped = asyncio.run(run_all_scrapers(pages))
        print(f"\nScraped {scraped} listings\n")

        logger.info("=== Phase 2: ETL ===")
        result = run_etl_pipeline()
        print(f"\nETL complete:\n{result}")

    else:
        logger.error("Unknown command: %s", cmd)
        sys.exit(1)
