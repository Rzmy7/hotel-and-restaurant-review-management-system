from typing import Optional
from playwright.sync_api import sync_playwright, Browser, Page
from core.config import config, setup_logger

logger = setup_logger("booking_browser")


class BookingPlaywrightBrowser:
    def __init__(self):
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context = None
        self.page: Optional[Page] = None

    def start(self):
        logger.info(
            f"Starting Playwright Browser for Booking.com (headless={config.headless})"
        )
        self.playwright = sync_playwright().start()

        # Booking.com heavily gates bots; requiring specific blink overrides
        self.browser = self.playwright.chromium.launch(
            headless=config.headless,
            args=["--disable-blink-features=AutomationControlled"],
        )

        # Mimic standard OS fingerprint
        self.context = self.browser.new_context(
            viewport=config.viewport,
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        )
        self.page = self.context.new_page()
        self.page.set_default_timeout(config.timeout_ms)
        return self.page

    def stop(self):
        logger.info("Stopping Booking Playwright Browser")
        if self.context:
            self.context.close()
        if self.browser:
            self.browser.close()
        if self.playwright:
            self.playwright.stop()
