import os
from playwright.sync_api import sync_playwright
from core.config import setup_logger, config

logger = setup_logger("google_browser")

# Path to the persistent Chrome profile (created by tests/setup_google_profile.py)
PROFILE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chrome_profile")


class GooglePlaywrightBrowser:
    """
    Manages a Playwright Chromium browser with a persistent profile for Google Maps.
    Uses launch_persistent_context to reuse cookies and signed-in Google session.
    """

    def __init__(self):
        self.playwright = None
        self.context = None
        self.page = None

    def start(self):
        logger.info(f"Launching Playwright Chromium with persistent profile (headless={config.headless})")
        logger.info(f"Profile dir: {PROFILE_DIR}")

        os.makedirs(PROFILE_DIR, exist_ok=True)

        self.playwright = sync_playwright().start()
        self.context = self.playwright.chromium.launch_persistent_context(
            user_data_dir=PROFILE_DIR,
            headless=config.headless,
            args=["--disable-blink-features=AutomationControlled"],
            viewport={"width": 1920, "height": 1080},
            locale="en-US",
        )
        # Use the default page or create one
        self.page = self.context.pages[0] if self.context.pages else self.context.new_page()
        return self.page

    def stop(self):
        try:
            if self.context:
                self.context.close()
            if self.playwright:
                self.playwright.stop()
            logger.info("Browser closed.")
        except Exception as e:
            logger.warning(f"Error closing browser: {e}")
