"""
Google Account Sign-In → Persistent Playwright Profile
========================================================
Run this ONCE (headless=False) to log in to Google and save cookies/session
into a reusable Playwright user-data-dir at:
    platforms/google/chrome_profile

After this, the Google scraper will use this profile automatically.
Reads credentials from .env (GOOGLE_EMAIL, GOOGLE_PASSWORD).
"""
import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

load_dotenv()

GOOGLE_EMAIL = os.getenv("GOOGLE_EMAIL")
GOOGLE_PASSWORD = os.getenv("GOOGLE_PASSWORD")

if not GOOGLE_EMAIL or not GOOGLE_PASSWORD:
    print("ERROR: GOOGLE_EMAIL and GOOGLE_PASSWORD must be set in .env")
    sys.exit(1)

PROFILE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                           "..", "platforms", "google", "chrome_profile")
PROFILE_DIR = os.path.abspath(PROFILE_DIR)


def setup_google_profile():
    print(f"Profile will be saved to: {PROFILE_DIR}")
    os.makedirs(PROFILE_DIR, exist_ok=True)

    pw = sync_playwright().start()
    browser = pw.chromium.launch_persistent_context(
        user_data_dir=PROFILE_DIR,
        headless=False,
        args=["--disable-blink-features=AutomationControlled"],
        viewport={"width": 1280, "height": 900},
        locale="en-US",
    )
    page = browser.pages[0] if browser.pages else browser.new_page()

    # Navigate to Google sign-in
    print("Navigating to Google sign-in page...")
    page.goto("https://accounts.google.com/signin", wait_until="domcontentloaded")
    time.sleep(3)

    # Enter email
    print("Entering email...")
    email_input = page.locator('input[type="email"]')
    email_input.wait_for(state="visible", timeout=15000)
    email_input.fill(GOOGLE_EMAIL)
    time.sleep(1)

    # Click Next
    page.locator("#identifierNext").click()
    time.sleep(4)

    # Enter password
    print("Entering password...")
    pw_input = page.locator('input[type="password"]')
    pw_input.wait_for(state="visible", timeout=15000)
    pw_input.fill(GOOGLE_PASSWORD)
    time.sleep(1)

    # Click Next
    page.locator("#passwordNext").click()
    time.sleep(5)

    # Wait for sign-in to complete
    print("Waiting for sign-in to complete...")
    time.sleep(5)

    current_url = page.url
    print(f"Current URL after sign-in: {current_url}")

    if "challenge" in current_url or "signin" in current_url:
        print("Sign-in may require manual intervention (2FA, captcha, etc.)")
        print("Please complete the login in the browser window.")
        print("Press ENTER in this terminal once you are fully signed in...")
        input()

    # Navigate to Google Maps to confirm it works
    print("Testing Google Maps access...")
    page.goto("https://www.google.com/maps", wait_until="domcontentloaded")
    time.sleep(5)
    print(f"Maps URL: {page.url}")

    # Check tabs
    tabs = page.evaluate("""
        Array.from(document.querySelectorAll('button[role="tab"]')).map(t => t.innerText.trim())
    """)
    print(f"Tabs visible: {tabs}")

    # Close — profile is automatically saved to the user_data_dir
    browser.close()
    pw.stop()
    print(f"\nProfile saved to: {PROFILE_DIR}")
    print("The Google scraper will now use this profile automatically.")


if __name__ == "__main__":
    setup_google_profile()
