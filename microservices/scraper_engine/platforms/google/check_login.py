import sys
import os

# Add the project root and current folder to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from platforms.google.auth import GoogleAuthManager

def main():
    """CLI script for checking Google login status."""
    # Check if a headless mode is requested via CLI arg
    headless = True
    if "--no-headless" in sys.argv:
        headless = False

    auth = GoogleAuthManager()
    print(f"Checking Google login status (headless={headless})...")
    
    if auth.check_login_status(headless=headless):
        print("\nSTATUS: Browser is LOGGED IN.")
        sys.exit(0)
    else:
        print("\nSTATUS: Browser is NOT LOGGED IN.")
        sys.exit(1)

if __name__ == "__main__":
    main()
