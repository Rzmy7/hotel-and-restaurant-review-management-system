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
    
    # Rate Limiting & Queue Protection
    max_queue_size: int = 100
    rate_limit_scrape: str = "10/minute"
    rate_limit_global: str = "100/minute"
    
def setup_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    fmt = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    ch = logging.StreamHandler()
    ch.setFormatter(fmt)
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
    max_queue_size=int(os.getenv("MAX_QUEUE_SIZE", "100")),
    rate_limit_scrape=os.getenv("RATE_LIMIT_SCRAPE", "10/minute"),
    rate_limit_global=os.getenv("RATE_LIMIT_GLOBAL", "100/minute")
)
