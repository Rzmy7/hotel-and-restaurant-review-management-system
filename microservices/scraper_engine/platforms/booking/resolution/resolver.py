import re
import time
from typing import Optional, Tuple, Dict, Any
from playwright.sync_api import Page

def get_booking_hotel_url(page: Page, hotel_name: str) -> str:
    """
    Resolves a hotel name to a canonical Booking.com URL.
    
    Args:
        page: Playwright Page object (sync)
        hotel_name: Name of the hotel to resolve
        
    Returns:
        Canonical Booking.com hotel URL
    """
    # 1. Use direct search URL to bypass landing page complexity
    encoded_name = hotel_name.replace(' ', '+')
    search_url = f"https://www.booking.com/searchresults.html?ss={encoded_name}"
    page.goto(search_url, wait_until='domcontentloaded')
    
    # 2. Dismiss potential popups (Sign-in overlays are common)
    try:
        page.keyboard.press('Escape')
        # Check for the specific "Dismiss sign-in info" button if Escape doesn't work
        dismiss_btn = page.locator('button[aria-label="Dismiss sign-in info"]').first
        if dismiss_btn.is_visible():
            dismiss_btn.click()
    except:
        pass

    # 3. Extract first property card link and ID
    try:
        # Wait for property cards to appear
        page.wait_for_selector('[data-testid="property-card"]', timeout=15000)
        
        extracted_data = page.evaluate("""
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
            # Clean the URL (Booking.com URLs have many tracking params)
            clean_url = extracted_data['href'].split('?')[0]
            return clean_url
            
    except Exception as e:
        # Fallback: check if we already landed on a hotel page directly
        current_url = page.url
        if "/hotel/" in current_url:
            return current_url.split('?')[0]
        raise Exception(f"Failed to resolve Booking.com URL for: {hotel_name}") from e
        
    raise Exception(f"No results found on Booking.com for: {hotel_name}")

def verify_booking_endpoint(page: Page, target_url: str, expected_name: str) -> Dict[str, Any]:
    """
    Verifies if the generated URL lands on the correct property.
    """
    try:
        page.goto(target_url, wait_until='networkidle')
        page_title = page.title()
        
        # Booking titles usually follow "Hotel Name, City – Updated 2024 Prices"
        is_valid = expected_name.lower() in page_title.lower()
        
        # Try to extract the hotel ID from the page source as a secondary verification
        hotel_id = None
        try:
            content = page.content()
            id_match = re.search(r'hotel_id:\s*\'(\d+)\'', content) or re.search(r'b_hotel_id:\s*\'(\d+)\'', content)
            if id_match:
                hotel_id = id_match.group(1)
        except:
            pass
            
        return {
            "status": "active" if is_valid else "inactive",
            "hotelId": hotel_id,
            "resolved_name": page_title.split(',')[0].strip(), # Get just the name part
            "url": target_url,
            "meta": {
                "title": page_title,
                "url": page.url
            }
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}
