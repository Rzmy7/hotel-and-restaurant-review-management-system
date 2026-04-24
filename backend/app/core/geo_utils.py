import re
from typing import Optional, Tuple

def parse_google_maps_url(url: str) -> Optional[Tuple[float, float]]:
    """
    Extracts latitude and longitude from various Google Maps URL formats.
    Returns (lat, lng) if found, otherwise None.
    
    Examples supported:
    - https://www.google.com/maps/place/Some+Place/@6.9271,79.8612,17z/data=...
    - https://maps.google.com/?q=6.9271,79.8612
    - https://www.google.com/maps?ll=6.9271,79.8612
    """
    if not url:
        return None
        
    # Pattern 1: /@lat,lng
    match = re.search(r'@(-?\d+\.\d+),(-?\d+\.\d+)', url)
    if match:
        return float(match.group(1)), float(match.group(2))
        
    # Pattern 2: ?q=lat,lng or &q=lat,lng
    match = re.search(r'[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)', url)
    if match:
        return float(match.group(1)), float(match.group(2))
        
    # Pattern 3: ?ll=lat,lng or &ll=lat,lng
    match = re.search(r'[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)', url)
    if match:
        return float(match.group(1)), float(match.group(2))
        
    return None
