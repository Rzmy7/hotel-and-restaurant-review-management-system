import logging
import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class BaseScraperConfig(BaseModel):
    headless: bool = False
    timeout_ms: int = 30000
    viewport: dict = {"width": 1920, "height": 1080}
    output_dir: str = "output"
    
    # Database Configuration
    db_driver: str = "ODBC Driver 18 for SQL Server"
    db_server: str = ""
    db_name: str = ""
    db_uid: str = ""
    db_pwd: str = ""
    db_encrypt: str = "yes"
    trust_server_certificate: str = "yes"
    backend_url: str = "http://127.0.0.1:8000"
    internal_api_key: str = "dev-internal-secret"
    
    # Service-to-Service API Keys (Phase 1: Backward Compatible)
    scraper_api_keys: list[str] = []
    backend_api_key: str = ""
    
    # Rate Limiting & Queue Protection
    max_queue_size: int = 100
    rate_limit_scrape: str = "10/minute"
    rate_limit_global: str = "100/minute"
    
    # Platform-Specific Delays (Seconds between scrapes)
    delay_google: float = 30.0
    delay_agoda: float = 20.0
    delay_booking: float = 20.0
    delay_tripadvisor: float = 40.0
    
def setup_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    is_prod = os.getenv("PROD_MODE", "false").lower() == "true"
    level = logging.WARNING if is_prod else logging.INFO
    logger.setLevel(level)
    fmt = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    ch = logging.StreamHandler()
    ch.setFormatter(fmt)
    ch.setLevel(level)
    logger.addHandler(ch)

    fh = logging.FileHandler('scraper_debug.log', mode='a', encoding='utf-8')
    fh.setFormatter(fmt)
    logger.addHandler(fh)
    
    return logger

config = BaseScraperConfig(
    db_driver=os.getenv("DB_DRIVER", "ODBC Driver 18 for SQL Server"),
    db_server=os.getenv("DB_SERVER", ""),
    db_name=os.getenv("DB_NAME", ""),
    db_uid=os.getenv("DB_UID", ""),
    db_pwd=os.getenv("DB_PWD", ""),
    db_encrypt=os.getenv("DB_ENCRYPT", "yes"),
    trust_server_certificate=os.getenv("DB_TRUST_CERT", "yes"),
    backend_url=os.getenv("BACKEND_API_URL", "http://127.0.0.1:8000"),
    internal_api_key=os.getenv("INTERNAL_API_KEY", "dev-internal-secret"),
    scraper_api_keys=[k.strip() for k in os.getenv("SCRAPER_API_KEYS", os.getenv("INTERNAL_API_KEY", "dev-internal-secret")).split(",") if k.strip()],
    backend_api_key=os.getenv("BACKEND_API_KEY", os.getenv("INTERNAL_API_KEY", "dev-internal-secret")),
    max_queue_size=int(os.getenv("MAX_QUEUE_SIZE", "100")),
    rate_limit_scrape=os.getenv("RATE_LIMIT_SCRAPE", "10/minute"),
    rate_limit_global=os.getenv("RATE_LIMIT_GLOBAL", "100/minute"),
    delay_google=float(os.getenv("DELAY_GOOGLE", "30.0")),
    delay_agoda=float(os.getenv("DELAY_AGODA", "20.0")),
    delay_booking=float(os.getenv("DELAY_BOOKING", "20.0")),
    delay_tripadvisor=float(os.getenv("DELAY_TRIPADVISOR", "40.0"))
)
