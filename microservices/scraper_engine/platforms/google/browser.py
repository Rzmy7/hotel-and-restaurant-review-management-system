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

    def start(self, job_id: str = None):
        # Use a unique subdirectory within the profile for each job if concurrency is needed,
        # but for persistence we want the same folder. 
        # To avoid "Access is denied" locks from zombie processes, we'll use the job_id if provided.
        profile_path = PROFILE_DIR
        if job_id:
            profile_path = os.path.join(PROFILE_DIR, f"job_{job_id}")

        logger.info(f"Launching Playwright Chromium with persistent profile (headless={config.headless})")
        logger.info(f"Profile dir: {profile_path}")

        os.makedirs(profile_path, exist_ok=True)

        self.playwright = sync_playwright().start()
        try:
            self.context = self.playwright.chromium.launch_persistent_context(
                user_data_dir=profile_path,
                headless=config.headless,
                args=["--disable-blink-features=AutomationControlled"],
                viewport={"width": 1920, "height": 1080},
                locale="en-US",
            )
        except Exception as e:
            logger.error(f"Failed to launch browser with profile {profile_path}: {e}")
            # Fallback to a temporary profile if persistent one is locked
            logger.warning("Falling back to temporary profile...")
            self.context = self.playwright.chromium.launch_persistent_context(
                user_data_dir="", # Temporary
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
