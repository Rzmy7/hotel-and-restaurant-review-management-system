import sys
import os

# Add the project root and current folder to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from platforms.google.auth import GoogleAuthManager

def main():
    """CLI script for Google login."""
    auth = GoogleAuthManager()
    print("Launching Google login process...")
    if auth.login():
        print("\nSUCCESS: Signed in and profile saved.")
        sys.exit(0)
    else:
        print("\nFAILURE: Failed to sign in.")
        sys.exit(1)

if __name__ == "__main__":
    main()
