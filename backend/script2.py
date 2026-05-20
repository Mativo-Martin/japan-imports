import asyncio
from app.scrapers.beforward import BeForwardScraper
import app.scrapers.beforward as bf_mod

async def run():
    original = bf_mod.BF_MAKES
    bf_mod.BF_MAKES = ["TOYOTA"]

    scraper = BeForwardScraper()
    total = await scraper.run(max_pages=5)

    bf_mod.BF_MAKES = original

    print("Saved:", total)

asyncio.run(run())
