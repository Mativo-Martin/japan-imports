"""
probe_bf.py — Run this to find the correct make filter and API format.

  python3 probe_bf.py

Checks:
  1. Working base URL returns stock cards
  2. How to filter by make (sidebar links, path segment, query param)
  3. Whether numeric API make IDs work
  4. What the card HTML structure looks like
"""
import asyncio, httpx, certifi, json, re
from bs4 import BeautifulSoup

BASE = "https://www.beforward.jp"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# Common BF make IDs from Carapis docs and public BF API exploration
MAKE_IDS_TO_TEST = {
    "TOYOTA":    1,
    "NISSAN":    2,
    "HONDA":     3,
    "MAZDA":     4,
    "MITSUBISHI":5,
    "SUBARU":    6,
    "SUZUKI":    7,
    "ISUZU":     8,
    "DAIHATSU":  9,
}

async def main():
    async with httpx.AsyncClient(
        headers=HEADERS, timeout=25, follow_redirects=True, verify=certifi.where()
    ) as c:
        # Prime session
        r0 = await c.get(f"{BASE}/")
        print(f"Homepage: {r0.status_code}, cookies: {list(c.cookies.keys())}\n")
        await asyncio.sleep(1.5)

        # ── TEST 1: Working base URL (no make filter) ──────────────────────
        print("=" * 60)
        print("TEST 1: Base URL without make filter")
        url1 = f"{BASE}/stocklist/minyear=2018/sar=steering/steering=Right/tp_country_id=27/"
        r1 = await c.get(url1)
        soup1 = BeautifulSoup(r1.text, "html.parser")
        meta1 = soup1.select_one("meta[name='ga_stocklist_results']")
        stock_links1 = soup1.select("a[href*='/stock/']")
        print(f"  Status: {r1.status_code}")
        print(f"  ga_results: {meta1['content'] if meta1 else 'none'}")
        print(f"  /stock/ links: {len(stock_links1)}")
        if stock_links1:
            print(f"  Sample link: {stock_links1[0]['href']}")

        # ── TEST 2: Find make filter links in the sidebar ──────────────────
        print("\nTEST 2: Make filter URLs from sidebar (shop-by-make)")
        make_links = soup1.select(".shop-by-make a, .clear a[href*='make'], a[href*='make=TOYOTA']")
        if not make_links:
            # Try finding Toyota specifically in any link
            make_links = [a for a in soup1.find_all("a", href=True)
                         if "toyota" in a["href"].lower() and "stocklist" in a["href"].lower()]
        print(f"  Found {len(make_links)} make filter links")
        for a in make_links[:5]:
            print(f"    {a.get_text(strip=True)[:20]:<20} → {a['href']}")
        await asyncio.sleep(2)

        # ── TEST 3: Try make filter appended to the working URL ────────────
        print("\nTEST 3: Append make filter to working base URL")
        make_url_variants = [
            f"{BASE}/stocklist/make=TOYOTA/minyear=2018/sar=steering/steering=Right/tp_country_id=27/",
            f"{BASE}/stocklist/minyear=2018/make=TOYOTA/sar=steering/steering=Right/tp_country_id=27/",
            f"{BASE}/stocklist/minyear=2018/sar=steering/steering=Right/tp_country_id=27/make=TOYOTA/",
            f"{BASE}/stocklist/minyear=2018/sar=steering/steering=Right/tp_country_id=27/?make=TOYOTA",
        ]
        for url in make_url_variants:
            r = await c.get(url)
            soup = BeautifulSoup(r.text, "html.parser")
            meta = soup.select_one("meta[name='ga_stocklist_results']")
            links = len(soup.select("a[href*='/stock/']"))
            ga = meta["content"] if meta else "none"
            print(f"  {r.status_code} | ga={ga:>6} | /stock/={links:3d} | {url[len(BASE):]}")
            await asyncio.sleep(1.5)

        # ── TEST 4: API with numeric make IDs ──────────────────────────────
        print("\nTEST 4: JSON API with numeric make IDs")
        api_variants = [
            f"{BASE}/api/v1/stocklist/?make=1&p=1&limit=5",
            f"{BASE}/api/v1/stocklist/?make_id=1&p=1&limit=5",
            f"{BASE}/api/v1/stocklist/?maker_id=1&p=1&limit=5",
            f"{BASE}/api/stocklist/?make=TOYOTA&p=1&limit=5",
            f"{BASE}/api/v1/stock/?make=1&p=1&limit=5",
        ]
        json_headers = {**HEADERS, "Accept": "application/json, */*"}
        for url in api_variants:
            try:
                r = await c.get(url, headers=json_headers)
                content_type = r.headers.get("content-type", "")
                try:
                    data = r.json()
                    items = data if isinstance(data, list) else data.get("data", data.get("stocks", data.get("results", [])))
                    print(f"  {r.status_code} | JSON ✓ | items={len(items) if isinstance(items, list) else '?'} | {url[len(BASE):]}")
                    if isinstance(items, list) and items:
                        print(f"    Keys: {list(items[0].keys())[:8]}")
                except Exception:
                    print(f"  {r.status_code} | not JSON ({content_type[:30]}) | {url[len(BASE):]}")
            except Exception as e:
                print(f"  ERR | {e} | {url[len(BASE):]}")
            await asyncio.sleep(1)

        # ── TEST 5: Inspect card HTML structure from working URL ───────────
        print("\nTEST 5: Card HTML structure from base URL")
        if stock_links1:
            # Look at what element wraps a /stock/ link
            for link in stock_links1[:3]:
                parent = link.parent
                for _ in range(4):  # walk up to find card container
                    if parent and parent.name in ("li", "div", "article"):
                        cls = " ".join(parent.get("class", []))
                        sid = parent.get("data-stock-id", "")
                        print(f"  <{parent.name} class='{cls}' data-stock-id='{sid}'>")
                        print(f"    text preview: {parent.get_text(strip=True)[:100]}")
                        break
                    parent = parent.parent if parent else None
        else:
            print("  No /stock/ links found in base URL response — BF is JS-rendered for listings")
            # Save for manual inspection
            with open("/tmp/bf_base_url.html", "w") as f:
                f.write(r1.text)
            print("  Saved to /tmp/bf_base_url.html")

            # Check if there's a data attribute or JSON embedded in the page
            scripts = soup1.find_all("script")
            for sc in scripts:
                if sc.string and ("stockList" in sc.string or "stock_id" in sc.string):
                    print(f"  Found JS with stock data: {sc.string[:200]}")
                    break

        print("\nDone.")

asyncio.run(main())
