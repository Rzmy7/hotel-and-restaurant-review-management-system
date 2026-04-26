import os
import time
from playwright.sync_api import sync_playwright, Page, BrowserContext
from core.config import setup_logger, config
from dotenv import load_dotenv

load_dotenv()

logger = setup_logger("google_auth")

# Path to the persistent Chrome profile
PROFILE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chrome_profile")


class GoogleAuthManager:
    """
    Manages Google Account authentication and session status.
    """

    def __init__(self):
        self.email = os.getenv("GOOGLE_EMAIL")
        self.password = os.getenv("GOOGLE_PASSWORD")
        self.profile_dir = PROFILE_DIR

    def _get_page(
        self, playwright, headless: bool = True
    ) -> tuple[BrowserContext, Page]:
        """Launches a persistent browser context and returns the page."""
        os.makedirs(self.profile_dir, exist_ok=True)
        context = playwright.chromium.launch_persistent_context(
            user_data_dir=self.profile_dir,
            headless=headless,
            args=["--disable-blink-features=AutomationControlled"],
            viewport={"width": 1280, "height": 900},
            locale="en-US",
        )
        page = context.pages[0] if context.pages else context.new_page()
        return context, page

    def _handle_popups(self, page: Page):
        """Checks for and dismisses common Google sign-in pop-ups/overlays."""
        popups = [
            'text="Not now"',
            'text="Skip"',
            'text="Dismiss"',
            'text="No thanks"',
            'button:has-text("Not now")',
            'button:has-text("Skip")',
            'button:has-text("Done")',
        ]

        for selector in popups:
            try:
                # Use a very short timeout for each check to avoid slowing down significantly
                loc = page.locator(selector)
                if loc.is_visible(timeout=2000):
                    logger.info(f"Handling pop-up: {selector}")
                    print(f"Bypassing optional page: {selector}...")
                    loc.click()
                    time.sleep(2)
            except Exception:
                pass

    def login(self):
        """Performs Google Account login and saves the profile."""
        if not self.email or not self.password:
            logger.error("GOOGLE_EMAIL and GOOGLE_PASSWORD must be set in .env")
            print("ERROR: GOOGLE_EMAIL or GOOGLE_PASSWORD missing in .env")
            return False

        logger.info(f"Starting Google login for {self.email}...")
        print(f"\n--- Google Login Process: {self.email} ---")

        with sync_playwright() as pw:
            context, page = self._get_page(pw, headless=False)

            try:
                # Navigate to Google sign-in
                logger.info("Navigating to Google sign-in page...")
                print("Navigating to https://accounts.google.com/signin...")
                page.goto(
                    "https://accounts.google.com/signin", wait_until="domcontentloaded"
                )
                time.sleep(2)

                # Check if already logged in
                if "signin" not in page.url and "accounts.google.com" not in page.url:
                    logger.info("Already logged in or redirected.")
                    print("Already logged in or redirected. Checking session...")
                else:
                    # Enter email
                    print("Entering email...")
                    email_input = page.locator('input[type="email"]')
                    email_input.wait_for(state="visible", timeout=10000)
                    email_input.fill(self.email)

                    print("Clicking Next...")
                    page.locator("#identifierNext").click()
                    time.sleep(3)

                    # Enter password
                    print("Entering password...")
                    pw_input = page.locator('input[type="password"]')
                    # Explicitly wait for visibility as password field is on the next card
                    pw_input.wait_for(state="visible", timeout=15000)
                    pw_input.fill(self.password)

                    print("Clicking Next...")
                    page.locator("#passwordNext").click()
                    time.sleep(5)

                # Handle post-login pop-ups/optional pages
                print("Checking for optional post-login pages (Not now, Skip, etc.)...")
                self._handle_popups(page)

                # Check for manual intervention (e.g., 2FA)
                current_url = page.url
                if "challenge" in current_url or "signin" in current_url:
                    logger.warning("Manual intervention required (2FA, captcha, etc.).")
                    print("\n!!! ACTION REQUIRED !!!")
                    print(f"Current URL: {current_url}")
                    print("Please complete the login/2FA in the opened browser window.")
                    print(
                        "Press ENTER in THIS TERMINAL once you are fully signed in to Google Maps..."
                    )
                    input()

                # Verify login by going to Maps
                logger.info("Verifying login via Google Maps...")
                print("Verifying session on Google Maps...")
                page.goto("https://www.google.com/maps", wait_until="domcontentloaded")
                time.sleep(4)

                # Double check for popups on Maps page (e.g. location permission, etc. if any)
                self._handle_popups(page)

                if "google.com/maps" in page.url:
                    logger.info("Login successful and profile saved.")
                    print("\n========================================")
                    print("  SUCCESS: Google login completed!")
                    print("  Profile has been successfully updated.")
                    print("========================================\n")
                    return True
                else:
                    logger.error(f"Failed to verify login. Current URL: {page.url}")
                    print(f"FAILURE: Verification failed. URL: {page.url}")
                    return False

            except Exception as e:
                logger.error(f"An error occurred during login: {e}")
                print(f"CRITICAL ERROR: {str(e)}")
                return False
            finally:
                context.close()

    def check_login_status(self, headless: bool = True):
        """Checks if the browser is currently logged into Google."""
        logger.info("Checking Google login status...")

        with sync_playwright() as pw:
            context, page = self._get_page(pw, headless=headless)
            try:
                # Navigate to a Google page that reflects auth status
                page.goto(
                    "https://myaccount.google.com/", wait_until="domcontentloaded"
                )
                time.sleep(2)

                # If we are redirected to a sign-in page, we are not logged in
                if "signin" in page.url or "accounts.google.com/v3/signin" in page.url:
                    logger.info("Status: NOT LOGGED IN")
                    return False

                # Check for profile indicator or account name
                # Usually there's an 'Account' header or similar
                if (
                    page.locator('text="Welcome,"').is_visible(timeout=5000)
                    or page.locator('a[href*="SignOut"]').is_visible(timeout=5000)
                    or "myaccount.google.com" in page.url
                ):
                    logger.info("Status: LOGGED IN")
                    return True

                logger.info("Status: COULD NOT DETERMINE (Assuming Not Logged In)")
                return False
            except Exception as e:
                logger.error(f"Error checking status: {e}")
                return False
            finally:
                context.close()


if __name__ == "__main__":
    # Example usage
    auth = GoogleAuthManager()
    if auth.check_login_status():
        print("Browser is logged in.")
    else:
        print("Browser is NOT logged in. Use login() to sign in.")
