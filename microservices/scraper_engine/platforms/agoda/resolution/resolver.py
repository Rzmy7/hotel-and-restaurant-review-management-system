import re
import time
from typing import Optional, Tuple, Dict, Any
from playwright.sync_api import Page

def get_hotel_base_url(page: Page, hotel_name: str) -> str:
    """
    Resolves a hotel name to a canonical Agoda URL.
    
    Args:
        page: Playwright Page object (sync)
        hotel_name: Name of the hotel to resolve
        
    Returns:
        Canonical Agoda search URL
    """
    page.goto('https://www.agoda.com', wait_until='domcontentloaded')
    
    # 1. Dismiss popups
    try:
        page.keyboard.press('Escape')
    except:
        pass

    # 2. Perform Search
    search_input = page.locator('#textInput, [data-selenium="textInput"]').first
    search_input.wait_for(state="visible", timeout=10000)
    search_input.click()
    search_input.fill(hotel_name)

    # 3. Attempt to click suggestion
    try:
        first_suggestion = page.locator('li.AutocompleteItem, li.Suggest__Item').first
        first_suggestion.wait_for(state='visible', timeout=5000)
        first_suggestion.click()
    except:
        # Fallback: Click search button
        search_btn = page.locator('button:has-text("SEARCH"), [data-selenium="searchButton"]').first
        search_btn.click()

    # 4. Wait for URL resolution
    try:
        page.wait_for_url(re.compile(r"hotel|search"), timeout=20000)
    except:
        pass # URL might not have changed if it's already on search
    
    current_url = page.url
    hotel_id_match = re.search(r'hotel=(\d+)', current_url) or re.search(r'hotel_id=(\d+)', current_url)
    
    if hotel_id_match:
        hotel_id = hotel_id_match.group(1)
        if "/hotel/" in current_url:
            return current_url.split('?')[0]
        return f"https://www.agoda.com/search?hotel={hotel_id}"
    
    # 5. Extraction Fallback
    try:
        page.wait_for_selector('[data-selenium="hotel-item"]', timeout=10000)
        hotel_id = page.get_attribute('[data-selenium="hotel-item"]', 'data-hotelid')
        if hotel_id:
            return f"https://www.agoda.com/search?hotel={hotel_id}"
    except Exception as e:
        raise Exception(f"Failed to extract hotel ID for: {hotel_name}") from e
    
    raise Exception(f"Hotel ID not found in results for: {hotel_name}")

def verify_agoda_endpoint(page: Page, target_url: str, expected_name: str) -> Dict[str, Any]:
    """
    Verifies if the generated URL lands on the correct property.
    """
    try:
        page.goto(target_url, wait_until='networkidle')
        page_title = page.title()
        is_valid = expected_name.lower() in page_title.lower()
        
        hotel_id_match = re.search(r'hotel=(\d+)', target_url)
        hotel_id = int(hotel_id_match.group(1)) if hotel_id_match else None
        
        return {
            "status": "active" if is_valid else "inactive",
            "hotelId": hotel_id,
            "resolved_name": page_title,
            "url": target_url,
            "meta": {
                "title": page_title,
                "url": page.url
            }
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}
