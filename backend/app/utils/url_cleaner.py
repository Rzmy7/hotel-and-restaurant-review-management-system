"""
URL Cleaner Utility for Backend
Strips tracking query parameters (?aid=...&label=...) and hash fragments (#map...).
"""

from urllib.parse import urlparse, urlunparse

def clean_tracking_url(url: str) -> str:
    """
    Cleans a given URL by removing query string parameters and hash fragments.
    Example:
      Input:  'https://www.booking.com/hotel/lk/hotel.html?aid=123&label=456#map'
      Output: 'https://www.booking.com/hotel/lk/hotel.html'
    """
    if not url or not url.strip():
        return ""
    
    url_str = url.strip()
    if not url_str.startswith(("http://", "https://")):
        url_str = f"https://{url_str}"
        
    try:
        parsed = urlparse(url_str)
        # Keep scheme, netloc (domain), path; clear params, query, and fragment
        cleaned = urlunparse((parsed.scheme.lower(), parsed.netloc.lower(), parsed.path, '', '', ''))
        return cleaned.rstrip('/') if cleaned.count('/') > 2 and cleaned.endswith('/') else cleaned
    except Exception:
        # Fallback simple split if urlparse encounters unexpected formatting
        return url_str.split('?')[0].split('#')[0]
