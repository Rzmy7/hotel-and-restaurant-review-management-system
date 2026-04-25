import json
import os
from datetime import datetime
from core.config import setup_logger

logger = setup_logger("google_storage")

def save_to_json(reviews, org_name: str):
    """Saves extracted Google reviews to a timestamped JSON file."""
    output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "output")
    os.makedirs(output_dir, exist_ok=True)

    safe_name = org_name.replace("/", "_").replace("\\", "_").replace(" ", "_")[:50]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"google_{safe_name}_{timestamp}.json"
    filepath = os.path.join(output_dir, filename)

    data = [r.model_dump() if hasattr(r, 'model_dump') else r for r in reviews]

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    logger.info(f"Saved {len(reviews)} Google reviews to {filepath}")
    return filepath
