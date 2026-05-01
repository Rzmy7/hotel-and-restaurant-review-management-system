import asyncio
import re
import json
from playwright.async_api import async_playwright

async def get_agoda_hotel_url(hotel_name):
    async with async_playwright() as p:
        # Launch browser with a real user agent
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        try:
            # Step 1: Navigate to Agoda
            await page.goto('https://www.agoda.com', wait_until="domcontentloaded", timeout=30000)
            
            # Softly clear popups
            try:
                await page.keyboard.press("Escape")
                await asyncio.sleep(1)
            except:
                pass

            # Step 2: Perform Search
            search_input = page.locator('#textInput, [data-selenium="textInput"]').first
            await search_input.wait_for(state="visible", timeout=10000)
            await search_input.click()
            await page.keyboard.type(hotel_name, delay=100)
            
            # Step 3: Click Suggestion or Search
            try:
                # Wait for suggestions
                suggestion_item = page.locator('li.AutocompleteItem, li.Suggest__Item, .Suggest__Item').first
                await suggestion_item.wait_for(state="visible", timeout=5000)
                await suggestion_item.click()
                print("Clicked suggestion.")
            except:
                # Fallback to search button
                search_btn = page.locator('button:has-text("SEARCH"), [data-selenium="searchButton"]').first
                await search_btn.click()
                print("Clicked search button.")
            
            # Step 4: Wait for results
            # Give it some time to load
            await asyncio.sleep(5)
            current_url = page.url
            
            # Step 5: Extract ID and Pretty URL using JS evaluation
            try:
                # Wait for any property card to appear
                await page.wait_for_selector('[data-selenium="hotel-item"], a.PropertyCard__Link', timeout=15000)
                
                extracted_data = await page.evaluate("""
                    () => {
                        const card = document.querySelector('[data-selenium="hotel-item"]');
                        const link = card ? card.querySelector('a') : document.querySelector('a.PropertyCard__Link, a[href*="/hotel/"]');
                        
                        if (link) {
                            return {
                                href: link.href,
                                hotelId: card ? card.getAttribute('data-hotelid') : null
                            };
                        }
                        return null;
                    }
                """)
                
                if extracted_data and extracted_data['href']:
                    href = extracted_data['href']
                    clean_url = href.split('?')[0]
                    hotel_id = extracted_data['hotelId']
                    
                    # If ID not found in data-hotelid, try regex on href or current URL
                    if not hotel_id:
                        id_pattern = r'(?:hotel_id|hotelid|hotel)=(\d+)'
                        match = re.search(id_pattern, href, re.I) or re.search(id_pattern, current_url, re.I)
                        hotel_id = match.group(1) if match else None
                    
                    if clean_url and "/hotel/" in clean_url:
                        return clean_url, hotel_id
                    return f"https://www.agoda.com/search?hotel={hotel_id}", hotel_id
            except Exception as e:
                print(f"Extraction failed: {str(e)}")
                # Capture screenshot for debugging
                await page.screenshot(path="agoda_extract_error.png")
            
            return "Could not extract Hotel ID.", None
        finally:
            await browser.close()

async def verifyAgodaEndpoint(generatedUrl, expected_name):
    """
    Verifies if the generated URL lands on the correct property
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            await page.goto(generatedUrl, wait_until="networkidle", timeout=30000)
            page_title = await page.title()
            
            # Check if title or meta contains hotel name
            is_valid = expected_name.lower() in page_title.lower()
            
            # Extract ID for the response object
            hotel_id_match = re.search(r'hotel=(\d+)', generatedUrl)
            hotel_id = int(hotel_id_match.group(1)) if hotel_id_match else None
            
            # Try to get the resolved name from the page (usually in H1)
            resolved_name = page_title
            try:
                h1_text = await page.inner_text('h1')
                if h1_text:
                    resolved_name = h1_text.strip()
            except:
                pass

            return {
                "status": "active" if is_valid else "inactive",
                "hotelId": hotel_id,
                "resolved_name": resolved_name,
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

if __name__ == "__main__":
    hotel = "Cinnamon Colombo"
    print(f"Resolving: {hotel}...")
    
    # Run Resolver
    generated_url, hotel_id = asyncio.run(get_agoda_hotel_url(hotel))
    
    if hotel_id:
        print(f"Generated URL: {generated_url}")
        print(f"Hotel ID: {hotel_id}")
        
        # Run Verification
        print("\nVerifying Endpoint...")
        verification_result = asyncio.run(verifyAgodaEndpoint(generated_url, hotel))
        print(json.dumps(verification_result, indent=4))
    else:
        print(f"Failed: {generated_url}")
