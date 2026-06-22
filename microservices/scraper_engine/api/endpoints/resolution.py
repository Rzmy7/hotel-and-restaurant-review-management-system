"""
POST /api/resolve  — Unified Platform Link Resolution
=======================================================
Given an organization (hotel) name, concurrently resolves canonical URLs
from Agoda, Booking.com, and TripAdvisor.

Architecture:
- Each resolver runs as a standalone Python subprocess via subprocess.run().
- This fully isolates each Playwright instance from uvicorn's event loop
  and the ScrapePool's WindowsProactorEventLoopPolicy settings.
- Three resolvers run in parallel via asyncio.gather + asyncio.to_thread.
"""
import asyncio
import json
import os
import subprocess
import sys
import traceback
from typing import Dict, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from core.config import setup_logger

logger = setup_logger("resolution_endpoint")
router = APIRouter(tags=["Resolution"])


# ── Pydantic Models ─────────────────────────────────────────────────────────

class ResolutionRequest(BaseModel):
    organization_name: str
    headless: bool = True


class ResolutionResponse(BaseModel):
    organization_name: str
    agoda: Optional[str] = None
    booking: Optional[str] = None
    tripadvisor: Optional[str] = None
    errors: Dict[str, str] = {}


# ── Inline resolver scripts (executed as subprocesses) ───────────────────────

_AGODA_SCRIPT = """
import asyncio, json, sys
sys.path.insert(0, {root!r})

async def main():
    from playwright.async_api import async_playwright
    hotel_name = {hotel_name!r}
    headless = {headless!r}
    UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless)
        context = await browser.new_context(user_agent=UA, viewport={{"width": 1920, "height": 1080}})
        page = await context.new_page()
        try:
            await page.goto("https://www.agoda.com", wait_until="domcontentloaded", timeout=30000)
            try:
                await page.keyboard.press("Escape")
                await asyncio.sleep(1)
            except: pass

            search_input = page.locator('#textInput, [data-selenium="textInput"]').first
            await search_input.wait_for(state="visible", timeout=10000)
            await search_input.click()
            await page.keyboard.type(hotel_name, delay=80)

            try:
                sug = page.locator("li.AutocompleteItem, li.Suggest__Item").first
                await sug.wait_for(state="visible", timeout=5000)
                await sug.click()
            except:
                btn = page.locator('button:has-text("SEARCH"), [data-selenium="searchButton"]').first
                await btn.click()

            await asyncio.sleep(4)
            await page.wait_for_selector('[data-selenium="hotel-item"], a.PropertyCard__Link', timeout=15000)

            data = await page.evaluate('''() => {{
                const card = document.querySelector('[data-selenium="hotel-item"]');
                const link = card ? card.querySelector('a') : document.querySelector('a.PropertyCard__Link, a[href*="/hotel/"]');
                if (!link) return null;
                return {{ href: link.href, hotelId: card ? card.getAttribute('data-hotelid') : null }};
            }}''')
            if data and data.get("href"):
                import re
                href = data["href"]
                clean = href.split("?")[0]
                if "/hotel/" in clean:
                    print(json.dumps({{"url": clean}}))
                    return
                hotel_id = data.get("hotelId") or ""
                if not hotel_id:
                    m = re.search(r"hotel[_-]?id[=:](\\d+)", href, re.I)
                    hotel_id = m.group(1) if m else ""
                url = f"https://www.agoda.com/search?hotel={{hotel_id}}" if hotel_id else clean
                print(json.dumps({{"url": url}}))
                return
            print(json.dumps({{"error": "No hotel link found"}}))
        except Exception as e:
            print(json.dumps({{"error": str(e)}}))
        finally:
            await browser.close()

asyncio.run(main())
"""

_BOOKING_SCRIPT = """
import asyncio, json, sys
sys.path.insert(0, {root!r})

async def main():
    from playwright.async_api import async_playwright
    hotel_name = {hotel_name!r}
    headless = {headless!r}
    UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    encoded = hotel_name.replace(" ", "+")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless)
        context = await browser.new_context(user_agent=UA, viewport={{"width": 1920, "height": 1080}})
        page = await context.new_page()
        try:
            await page.goto(f"https://www.booking.com/searchresults.html?ss={{encoded}}", wait_until="domcontentloaded", timeout=30000)
            try:
                await page.keyboard.press("Escape")
                d = page.locator('button[aria-label="Dismiss sign-in info"]').first
                if await d.is_visible(): await d.click()
            except: pass
            await page.wait_for_selector('[data-testid="property-card"]', timeout=15000)
            data = await page.evaluate('''() => {{
                const card = document.querySelector('[data-testid="property-card"]');
                if (!card) return null;
                const link = card.querySelector('a[data-testid="title-link"]');
                return {{ href: link ? link.href : null }};
            }}''')
            if data and data.get("href"):
                print(json.dumps({{"url": data["href"].split("?")[0]}}))
                return
            if "/hotel/" in page.url:
                print(json.dumps({{"url": page.url.split("?")[0]}}))
                return
            print(json.dumps({{"error": "No property card found"}}))
        except Exception as e:
            print(json.dumps({{"error": str(e)}}))
        finally:
            await browser.close()

asyncio.run(main())
"""

_TRIPADVISOR_SCRIPT = """
import asyncio, json, sys
sys.path.insert(0, {root!r})

async def main():
    from playwright.async_api import async_playwright
    hotel_name = {hotel_name!r}
    headless = {headless!r}
    UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless)
        context = await browser.new_context(user_agent=UA, viewport={{"width": 1280, "height": 800}})
        page = await context.new_page()
        try:
            await page.goto("https://www.tripadvisor.com", wait_until="domcontentloaded", timeout=45000)
            try:
                await page.wait_for_timeout(2000)
                c = page.locator('#onetrust-accept-btn-handler, button:has-text("Accept")').first
                if await c.is_visible(): await c.click()
            except: pass

            search_input = None
            for sel in ['input[name="q"]', 'input[placeholder*="Search"]', '[data-testid="search-input"]']:
                try:
                    cand = page.locator(sel).first
                    await cand.wait_for(state="visible", timeout=5000)
                    search_input = cand
                    break
                except: continue

            if search_input:
                await search_input.click()
                await search_input.fill(hotel_name)
                await page.keyboard.press("Enter")
            else:
                await page.goto(f"https://www.tripadvisor.com/Search?q={{hotel_name.replace(' ', '+')}}", wait_until="domcontentloaded", timeout=30000)

            try:
                await page.wait_for_selector('a[href*="/Hotel_Review-"]', timeout=30000)
            except:
                await page.mouse.wheel(0, 1000)
                await page.wait_for_timeout(3000)

            data = await page.evaluate('''() => {{
                const links = Array.from(document.querySelectorAll('a[href*="/Hotel_Review-"]'));
                const first = links.find(l => l.href.includes('/Hotel_Review-'));
                return first ? {{ href: first.href }} : null;
            }}''')
            if data and data.get("href"):
                print(json.dumps({{"url": data["href"].split("?")[0]}}))
                return
            print(json.dumps({{"error": "No Hotel_Review link found"}}))
        except Exception as e:
            print(json.dumps({{"error": str(e)}}))
        finally:
            await browser.close()

asyncio.run(main())
"""


# ── Subprocess runner ─────────────────────────────────────────────────────────

def _run_script_subprocess(script: str, timeout: int = 120) -> dict:
    """
    Execute a Python script in a subprocess and parse its JSON stdout output.
    Completely isolated from the parent process's event loop and policies.
    """
    result = subprocess.run(
        [sys.executable, "-c", script],
        capture_output=True,
        text=True,
        timeout=timeout,
        env=os.environ.copy(),
    )
    stdout = result.stdout.strip()
    stderr = result.stderr.strip()

    if result.returncode != 0:
        return {"error": stderr or f"Script exited with code {result.returncode}"}

    if not stdout:
        return {"error": "Empty output from resolver script"}

    try:
        # Take last JSON line (in case there's other debug output)
        for line in reversed(stdout.splitlines()):
            line = line.strip()
            if line.startswith("{"):
                return json.loads(line)
        return {"error": f"No JSON found in output: {stdout[:200]}"}
    except json.JSONDecodeError as e:
        return {"error": f"JSON parse error: {e} | output: {stdout[:200]}"}


# ── Endpoint ─────────────────────────────────────────────────────────────────

# Engine root path (needed for sys.path in subprocesses)
_ENGINE_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@router.post(
    "/resolve",
    response_model=ResolutionResponse,
    summary="Resolve hotel URLs across all platforms",
)
async def resolve_links(request: ResolutionRequest):
    """
    Resolves canonical hotel/property URLs for **Agoda**, **Booking.com**, and **TripAdvisor** in parallel.
    A failure on one platform does not affect the others.

    Each platform runs in an **isolated subprocess** with its own fresh Python interpreter,
    ensuring zero event loop conflicts with the scraper engine's uvicorn process.

    - **organization_name**: Hotel or property name to search for.
    - **headless**: Run Playwright in headless mode (default `true`). Set to `false` to observe the browser during debugging.
    """
    org = request.organization_name
    headless = request.headless
    logger.info(f"[resolve] Starting parallel resolution for: '{org}' (headless={headless})")

    response = ResolutionResponse(organization_name=org)

    def make_script(template: str) -> str:
        return template.format(root=_ENGINE_ROOT, hotel_name=org, headless=headless)

    async def safe_subprocess(platform: str, script: str):
        try:
            result = await asyncio.to_thread(_run_script_subprocess, script)
            if "url" in result:
                url = result["url"]
                logger.info(f"[resolve] {platform} → {url}")
                return platform, url, None
            else:
                err = result.get("error", "Unknown error")
                logger.error(f"[resolve] {platform} FAILED for '{org}': {err}")
                return platform, None, err
        except subprocess.TimeoutExpired:
            msg = "Resolution timed out after 120s"
            logger.error(f"[resolve] {platform} TIMEOUT for '{org}'")
            return platform, None, msg
        except Exception as e:
            msg = str(e) or repr(e)
            logger.error(f"[resolve] {platform} ERROR: {msg}")
            logger.debug(traceback.format_exc())
            return platform, None, msg

    results = await asyncio.gather(
        safe_subprocess("agoda",       make_script(_AGODA_SCRIPT)),
        safe_subprocess("booking",     make_script(_BOOKING_SCRIPT)),
        safe_subprocess("tripadvisor", make_script(_TRIPADVISOR_SCRIPT)),
    )

    for platform, url, error in results:
        if error:
            response.errors[platform] = error
        else:
            setattr(response, platform, url)

    return response
