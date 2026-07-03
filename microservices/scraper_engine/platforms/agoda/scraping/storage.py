import json
import os
from datetime import datetime
from typing import List
from platforms.agoda.scraping.extractor import Review
from core.config import setup_logger, config

logger = setup_logger(__name__)

def save_to_json(reviews: List[Review], org_name: str) -> str:
    if not os.path.exists(config.output_dir):
        os.makedirs(config.output_dir)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    clean_org_name = "".join([c if c.isalnum() else "_" for c in org_name]).strip("_")
    filename = f"{clean_org_name}_{timestamp}.json"
    filepath = os.path.join(config.output_dir, filename)

    data = [r.model_dump() if hasattr(r, 'model_dump') else r for r in reviews]
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    logger.info(f"Saved {len(reviews)} reviews to {filepath}")
    return filepath
