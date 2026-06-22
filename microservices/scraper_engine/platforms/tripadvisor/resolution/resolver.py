import re
import time
from typing import Optional, Tuple, Dict, Any
from playwright.sync_api import Page

def get_tripadvisor_hotel_url(page: Page, hotel_name: str) -> str:
    """
    Resolves a hotel name to a canonical TripAdvisor URL.
    
    Args:
        page: Playwright Page object (sync)
        hotel_name: Name of the hotel to resolve
        
    Returns:
        Canonical TripAdvisor hotel URL
    """
    # 1. Use direct search URL filtered for hotels (ssrc=h)
    encoded_name = hotel_name.replace(' ', '+')
    search_url = f"https://www.tripadvisor.com/Search?q={encoded_name}&ssrc=h"
    page.goto(search_url, wait_until='domcontentloaded')
    
    # 2. Dismiss potential popups (Privacy/Consent banners)
    try:
        # Wait a bit for the banner to appear
        page.wait_for_timeout(2000)
        # Check for common consent buttons
        consent_btn = page.locator('#onetrust-accept-btn-handler, button:has-text("Accept"), button:has-text("Allow"), .ot-sdk-row button').first
        if consent_btn.is_visible():
            consent_btn.click()
            page.wait_for_timeout(1000)
    except:
        pass

    # 3. Use search bar
    try:
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
                search_input.wait_for(state="visible", timeout=5000)
                if search_input:
                    break
            except:
                continue
        
        if not search_input:
            # Fallback: Try to find any searchbox role
            try:
                search_input = page.get_by_role("searchbox").first
                search_input.wait_for(state="visible", timeout=5000)
            except:
                pass

        if not search_input:
            # If still not found, try to navigate directly to search results
            search_url = f"https://www.tripadvisor.com/Search?q={hotel_name.replace(' ', '+')}"
            page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
        else:
            search_input.click()
            search_input.fill(hotel_name)
            page.keyboard.press("Enter")
            
        # Wait for results page
        page.wait_for_selector('a[href*="/Hotel_Review-"]', timeout=30000)
        
        extracted_data = page.evaluate("""
            () => {
                const links = Array.from(document.querySelectorAll('a[href*="Hotel_Review-"]'));
                // Filter out non-hotel links or specific tracking ones if needed
                const firstValidLink = links.find(l => l.href.includes('/Hotel_Review-'));
                
                if (firstValidLink) {
                    return {
                        href: firstValidLink.href,
                        text: firstValidLink.innerText
                    };
                }
                return null;
            }
        """)
        
        if extracted_data and extracted_data['href']:
            # Strip tracking parameters if any (usually after .html)
            clean_url = extracted_data['href'].split('?')[0]
            return clean_url
            
    except Exception as e:
        # Fallback: check if we already landed on a hotel page directly
        current_url = page.url
        if "/Hotel_Review-" in current_url:
            return current_url.split('?')[0]
        raise Exception(f"Failed to resolve TripAdvisor URL for: {hotel_name}") from e
        
    raise Exception(f"No results found on TripAdvisor for: {hotel_name}")

def verify_tripadvisor_endpoint(page: Page, target_url: str, expected_name: str) -> Dict[str, Any]:
    """
    Verifies if the generated URL lands on the correct property.
    """
    try:
        page.goto(target_url, wait_until='networkidle')
        page_title = page.title()
        
        # TripAdvisor titles: "HOTEL NAME - Prices & Reviews (City, Province)"
        is_valid = expected_name.lower() in page_title.lower()
        
        # Extract IDs from URL
        # Pattern: /Hotel_Review-g(\d+)-d(\d+)-
        id_match = re.search(r'Hotel_Review-g(\d+)-d(\d+)-', target_url)
        location_id = id_match.group(1) if id_match else None
        hotel_id = id_match.group(2) if id_match else None
            
        return {
            "status": "active" if is_valid else "inactive",
            "hotelId": hotel_id,
            "locationId": location_id,
            "resolved_name": page_title.split('-')[0].strip(),
            "url": target_url,
            "meta": {
                "title": page_title,
                "url": page.url
            }
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}
