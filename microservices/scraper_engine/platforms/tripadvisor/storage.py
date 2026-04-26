"""JSON backup for TripAdvisor reviews."""

import json
import os
from core.config import setup_logger, config

logger = setup_logger("tripadvisor_storage")


def save_to_json(reviews: list, org_name: str):
    os.makedirs(config.output_dir, exist_ok=True)
    filename = os.path.join(config.output_dir, f"tripadvisor_{org_name}.json")
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(reviews, f, ensure_ascii=False, indent=2, default=str)
    logger.info(f"Saved {len(reviews)} TripAdvisor reviews to {filename}")
