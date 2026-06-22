import asyncio
import json
import re
from playwright.async_api import async_playwright

async def get_tripadvisor_hotel_url(hotel_name):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Use a more realistic context
        context = await browser.new_context(
            viewport={'width': 1280, 'height': 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        try:
            print(f"Navigating to TripAdvisor homepage...")
            await page.goto('https://www.tripadvisor.com', wait_until="domcontentloaded", timeout=45000)
            
            # Dismiss consent banner
            try:
                await page.wait_for_timeout(2000)
                consent_btn = page.locator('#onetrust-accept-btn-handler, button:has-text("Accept"), .ot-sdk-row button').first
                if await consent_btn.is_visible():
                    await consent_btn.click()
                    await page.wait_for_timeout(1000)
            except:
                pass

            # Step 2: Use search bar
            print(f"Locating search bar...")
            # Try multiple common selectors for the search input
            search_selectors = [
                'input[name="q"]',
                'input[placeholder*="Search"]',
                '[data-testid="search-input"]',
                'input[type="search"]',
                '.q6Pcs input'
            ]
            
            search_input = None
            for selector in search_selectors:
                try:
                    search_input = page.locator(selector).first
                    await search_input.wait_for(state="visible", timeout=5000)
                    if search_input:
                        print(f"Found search bar with selector: {selector}")
                        break
                except:
                    continue
            
            if not search_input:
                # Fallback: Try to find any searchbox role
                try:
                    search_input = page.get_by_role("searchbox").first
                    await search_input.wait_for(state="visible", timeout=5000)
                    print(f"Found search bar with role: searchbox")
                except:
                    pass

            if not search_input:
                # If still not found, try to navigate directly to search results
                print("Search bar not found, navigating directly to search results...")
                search_url = f"https://www.tripadvisor.com/Search?q={hotel_name.replace(' ', '+')}"
                await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
            else:
                await search_input.click()
                await search_input.fill(hotel_name)
                await page.keyboard.press("Enter")
            
            print(f"Waiting for results for: {hotel_name}...")
            # Wait for results or timeout
            try:
                # Look for the hotel review link pattern
                await page.wait_for_selector('a[href*="/Hotel_Review-"]', timeout=30000)
            except Exception as e:
                print(f"Results took too long: {str(e)}")
                # Try to scroll to trigger loading
                await page.mouse.wheel(0, 1000)
                await page.wait_for_timeout(3000)
                # Check again
                if not await page.locator('a[href*="/Hotel_Review-"]').count():
                    await page.screenshot(path=f"tripadvisor_fail_{hotel_name.replace(' ', '_')}.png")
                    return f"Failed to find results on page: {page.url}"
            
            extracted_data = await page.evaluate("""
                () => {
                    const links = Array.from(document.querySelectorAll('a[href*="/Hotel_Review-"]'));
                    const firstValidLink = links.find(l => l.href.includes('/Hotel_Review-'));
                    return firstValidLink ? { href: firstValidLink.href } : null;
                }
            """)
            
            if extracted_data and extracted_data['href']:
                clean_url = extracted_data['href'].split('?')[0]
                return clean_url
                
            return "No valid link found."
        except Exception as e:
            await page.screenshot(path="tripadvisor_error.png")
            return f"Error: {str(e)}"
        finally:
            await browser.close()

async def verifyTripAdvisorEndpoint(generatedUrl, expected_name):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            print(f"Verifying URL: {generatedUrl}")
            await page.goto(generatedUrl, wait_until="networkidle", timeout=30000)
            page_title = await page.title()
            
            is_valid = expected_name.lower() in page_title.lower()
            
            id_match = re.search(r'Hotel_Review-g(\d+)-d(\d+)-', generatedUrl)
            location_id = id_match.group(1) if id_match else None
            hotel_id = id_match.group(2) if id_match else None

            return {
                "status": "active" if is_valid else "inactive",
                "hotelId": hotel_id,
                "locationId": location_id,
                "resolved_name": page_title.split('-')[0].strip(),
                "url": generatedUrl,
                "meta": {
                    "title": page_title,
                    "url": page.url
                }
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
        finally:
            await browser.close()

async def main():
    hotels = ["Hilton Colombo", "Marriott Weligama"] # Just one for speed
    for hotel in hotels:
        print(f"\n--- Resolving: {hotel} ---")
        generated_url = await get_tripadvisor_hotel_url(hotel)
        
        if "/Hotel_Review-" in generated_url:
            print(f"Generated URL: {generated_url}")
            verification_result = await verifyTripAdvisorEndpoint(generated_url, hotel)
            print(json.dumps(verification_result, indent=4))
        else:
            print(f"Failed: {generated_url}")

if __name__ == "__main__":
    asyncio.run(main())
