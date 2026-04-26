import sys
import os

# Ensure root is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from platforms.booking.logic import scrape_booking


def test_live_scrape():
    # Target URL matching the Agoda context
    url = "https://www.booking.com/hotel/lk/the-villa-in-lavinia.en-gb.html"
    print(f"\n[TEST] Commencing Live Booking.com Scrape on {url}")

    # Run a shallow 1-page scrape in headless mode
    result = scrape_booking(url=url, headless=True, pages="1")

    print(f"\n[TEST] Scrape completed. Payload Summary:")
    print(result)

    if result.get("status") == "success":
        print("[TEST] End-to-End valid!")
    else:
        print("[TEST] End-to-End returned an error or warning.")


if __name__ == "__main__":
    test_live_scrape()
