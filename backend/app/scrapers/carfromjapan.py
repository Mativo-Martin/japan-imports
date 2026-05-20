import re, json
from playwright.async_api import async_playwright, Page
from bs4 import BeautifulSoup
from .base import BaseScraper

class CarFromJapanScraper(BaseScraper):
    SOURCE   = "carfromjapan"
    BASE_URL = "https://carfromjapan.com/cheap-used-japanese-cars"

    async def run(self, max_pages: int = 80) -> int:
        total = 0
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage"],
            )
            ctx = await browser.new_context(
                user_agent=self.HEADERS["User-Agent"],
                viewport={"width": 1280, "height": 900},
            )
            page = await ctx.new_page()

            for pg in range(1, max_pages + 1):
                try:
                    await page.goto(
                        f"{self.BASE_URL}?page={pg}&stock_year_from=2018",
                        wait_until="networkidle",
                        timeout=30_000,
                    )
                    await page.wait_for_selector(".car-list-item, .stock-card", timeout=15_000)
                    html     = await page.content()
                    listings = self.parse(html, pg)
                    if not listings:
                        break
                    saved = self.save_batch(listings)
                    total += saved
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).error("[cfj] page %d: %s", pg, e)
                    break

            await browser.close()
        return total

    def parse(self, html: str, page: int) -> list[dict]:
        soup    = BeautifulSoup(html, "html.parser")
        cards   = soup.select(".car-list-item, .stock-card")
        results = []
        for card in cards:
            try:
                sid   = card.get("data-id") or card.get("data-stock-id", "")
                price = self._extract_price(card)
                year  = self._extract_year(card)
                if not sid or not price or not year or year < 2018:
                    continue
                results.append({
                    "source_id":    f"cfj_{sid}",
                    "url":          self._extract_url(card),
                    "make":         self._extract_text(card, ".car-make, .make"),
                    "model":        self._extract_text(card, ".car-model, .model"),
                    "year":         year,
                    "mileage_km":   self._extract_mileage(card),
                    "engine_cc":    self._extract_engine(card),
                    "fuel_type":    self._extract_fuel(card),
                    "transmission": self._extract_trans(card),
                    "body_type":    self._extract_text(card, ".body-type", "").lower(),
                    "price_usd":    price,
                    "raw_data":     str(card)[:2000],
                })
            except Exception:
                continue
        return results

    def _extract_text(self, el, sel, default=None):
        node = el.select_one(sel)
        return node.get_text(strip=True) if node else default

    def _extract_price(self, card) -> float | None:
        node = card.select_one(".price, [class*='price']")
        if not node:
            return None
        m = re.search(r"[\d,]+", node.text.replace(",", ""))
        return float(m.group()) if m else None

    def _extract_year(self, card) -> int | None:
        for sel in [".year", ".manufacture-year", "[class*='year']"]:
            node = card.select_one(sel)
            if node:
                m = re.search(r"(20\d{2})", node.text)
                if m:
                    return int(m.group())
        return None

    def _extract_mileage(self, card) -> int | None:
        node = card.select_one(".mileage, [class*='mileage']")
        if not node:
            return None
        m = re.search(r"\d[\d,]*", node.text.replace(",", ""))
        return int(m.group()) if m else None

    def _extract_engine(self, card) -> int | None:
        node = card.select_one(".engine, [class*='engine']")
        if not node:
            return None
        m = re.search(r"(\d[\d.]*)", node.text)
        val = float(m.group()) if m else None
        if val and val < 10:
            val = val * 1000
        return int(val) if val else None

    def _extract_fuel(self, card) -> str:
        txt = self._extract_text(card, ".fuel, [class*='fuel']", "").lower()
        return {"gasoline": "petrol", "gas": "petrol"}.get(txt, txt or "petrol")

    def _extract_trans(self, card) -> str:
        txt = self._extract_text(card, ".transmission, [class*='trans']", "").lower()
        if "cvt" in txt:  return "cvt"
        if "auto" in txt: return "automatic"
        return "manual" if "mt" in txt or "manual" in txt else "automatic"

    def _extract_url(self, card) -> str | None:
        a = card.select_one("a[href]")
        if not a:
            return None
        href = a["href"]
        return href if href.startswith("http") else "https://carfromjapan.com" + href
