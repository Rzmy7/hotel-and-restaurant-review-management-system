from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared limiter instance for the scraper engine
# Defaults to in-memory storage as requested
limiter = Limiter(key_func=get_remote_address)
