from typing import Optional
from playwright.sync_api import sync_playwright, Browser, Page
from core.config import config, setup_logger

logger = setup_logger(__name__)

class PlaywrightBrowser:
    def __init__(self):
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context = None
        self.page: Optional[Page] = None

    def start(self):
        logger.info(f"Starting Playwright Browser (headless={config.headless})")
        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(headless=config.headless)
        self.context = self.browser.new_context(viewport=config.viewport)
        self.page = self.context.new_page()
        self.page.set_default_timeout(config.timeout_ms)
        self.page.add_init_script("window.open = function(){};")
        return self.page

    def stop(self):
        logger.info("Stopping Playwright Browser")
        if self.context:
            self.context.close()
        if self.browser:
            self.browser.close()
        if self.playwright:
            self.playwright.stop()
