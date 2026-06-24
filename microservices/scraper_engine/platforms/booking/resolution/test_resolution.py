import asyncio
import json
import re
from playwright.async_api import async_playwright

async def get_booking_hotel_url(hotel_name):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        try:
            # 1. Direct Search
            encoded_name = hotel_name.replace(' ', '+')
            search_url = f"https://www.booking.com/searchresults.html?ss={encoded_name}"
            print(f"Navigating to: {search_url}")
            await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
            
            # Dismiss popups
            try:
                await page.keyboard.press("Escape")
                dismiss_btn = page.locator('button[aria-label="Dismiss sign-in info"]').first
                if await dismiss_btn.is_visible():
                    await dismiss_btn.click()
            except:
                pass

            # 2. Extract Data
            await page.wait_for_selector('[data-testid="property-card"]', timeout=15000)
            
            extracted_data = await page.evaluate("""
                () => {
                    const card = document.querySelector('[data-testid="property-card"]');
                    if (!card) return null;
                    
                    const link = card.querySelector('a[data-testid="title-link"]');
                    const hotelId = card.getAttribute('data-hotelid') || card.querySelector('[data-hotelid]')?.getAttribute('data-hotelid');
                    
                    return {
                        href: link ? link.href : null,
                        hotelId: hotelId
                    };
                }
            """)
            
            if extracted_data and extracted_data['href']:
                clean_url = extracted_data['href'].split('?')[0]
                return clean_url, extracted_data['hotelId']
                
            # Check if direct land
            if "/hotel/" in page.url:
                return page.url.split('?')[0], None

            return "No property card found.", None
        except Exception as e:
            return f"Error: {str(e)}", None
        finally:
            await browser.close()

async def verifyBookingEndpoint(generatedUrl, expected_name):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            print(f"Verifying URL: {generatedUrl}")
            await page.goto(generatedUrl, wait_until="networkidle", timeout=30000)
            page_title = await page.title()
            
            is_valid = expected_name.lower() in page_title.lower()
            
            # Extract ID from content
            content = await page.content()
            id_match = re.search(r'hotel_id:\s*\'(\d+)\'', content) or re.search(r'b_hotel_id:\s*\'(\d+)\'', content)
            hotel_id = id_match.group(1) if id_match else None

            return {
                "status": "active" if is_valid else "inactive",
                "hotelId": hotel_id,
                "resolved_name": page_title.split(',')[0].strip(),
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
    hotels = ["Hilton Colombo", "Marriott Weligama"]
    for hotel in hotels:
        print(f"\n--- Resolving: {hotel} ---")
        generated_url, hotel_id = await get_booking_hotel_url(hotel)
        
        if hotel_id or "/hotel/" in generated_url:
            print(f"Generated URL: {generated_url}")
            print(f"Hotel ID: {hotel_id}")
            
            verification_result = await verifyBookingEndpoint(generated_url, hotel)
            print(json.dumps(verification_result, indent=4))
        else:
            print(f"Failed: {generated_url}")

if __name__ == "__main__":
    asyncio.run(main())
