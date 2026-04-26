# Playwright browser launch config for TripAdvisor.
# TripAdvisor has moderate anti-bot protection; we override the
# automation-controlled flag and set a real user-agent.

from playwright.sync_api import sync_playwright
from core.config import setup_logger, config

logger = setup_logger("tripadvisor_browser")

TA_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/123.0.0.0 Safari/537.36"
)


class TripAdvisorBrowser:
    def __init__(self):
        self._playwright = None
        self._browser = None
        self._context = None
        self.page = None

    def start(self):
        self._playwright = sync_playwright().start()
        # Reverting to Chromium per user request.
        # Using stealth arguments to minimize detection.
        self._browser = self._playwright.chromium.launch(
            headless=config.headless,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-blink-features=AutomationControlled",
                "--disable-infobars",
            ],
        )
        self._context = self._browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent=TA_USER_AGENT,
            locale="en-US",
            timezone_id="America/New_York",
            java_script_enabled=True,
        )

        # Enhanced Stealth: Mask webdriver and other automation signals
        self._context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            window.chrome = {
                runtime: {}
            };
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en']
            });
        """)

        self.page = self._context.new_page()
        logger.info("TripAdvisor Playwright browser started.")
        return self.page

    def stop(self):
        try:
            if self._browser:
                self._browser.close()
            if self._playwright:
                self._playwright.stop()
            logger.info("TripAdvisor browser stopped.")
        except Exception as e:
            logger.warning(f"Error shutting down browser: {e}")
