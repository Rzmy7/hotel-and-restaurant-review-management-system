import time
from typing import Dict
from core.config import config, setup_logger

logger = setup_logger("throttler")

class Throttler:
    """
    Manages platform-specific delays to prevent IP bans.
    Tracks the last time a scrape job started for each platform.
    """
    def __init__(self):
        # Platform name -> Timestamp of last run start
        self._last_run: Dict[str, float] = {}

    def get_delay_for_platform(self, platform: str) -> float:
        """Returns the configured delay in seconds for the given platform."""
        delays = {
            "google": config.delay_google,
            "agoda": config.delay_agoda,
            "booking": config.delay_booking,
            "tripadvisor": config.delay_tripadvisor
        }
        return delays.get(platform.lower(), 10.0) # Default 10s if unknown

    def can_run(self, platform: str) -> bool:
        """
        Checks if enough time has passed since the last run of this platform.
        """
        now = time.time()
        last_time = self._last_run.get(platform.lower(), 0.0)
        delay = self.get_delay_for_platform(platform)
        
        passed = now - last_time
        if passed >= delay:
            return True
        
        return False

    def mark_run(self, platform: str):
        """Updates the last run timestamp for a platform."""
        self._last_run[platform.lower()] = time.time()
        logger.debug(f"Throttler: {platform} marked as running.")

# Global singleton
throttler = Throttler()
