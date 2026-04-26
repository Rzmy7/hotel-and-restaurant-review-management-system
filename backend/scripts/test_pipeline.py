"""
Manual Pipeline Test Utility — runs the review processing pipeline synchronously
for a specific source_id and provides detailed feedback in the console.
"""

import asyncio
import sys
import uuid
import logging

# Configure logging to see all levels in console
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("test_pipeline")

from app.modules.reviews.services.review_service import (
    start_ingestion_and_processing_flow,
)


async def main():
    if len(sys.argv) < 2:
        print("Usage: python backend/scripts/test_pipeline.py <source_id>")
        sys.exit(1)

    try:
        source_id = uuid.UUID(sys.argv[1])
    except ValueError:
        print(f"Error: Invalid UUID format: {sys.argv[1]}")
        sys.exit(1)

    print(f"\n{'='*50}")
    print(f"STARTING MANUAL PIPELINE TEST")
    print(f"Source ID: {source_id}")
    print(f"{'='*50}\n")

    try:
        await start_ingestion_and_processing_flow(source_id)
        print(f"\n{'='*50}")
        print(f"TEST RUN FINISHED")
        print(f"Check the logs above for any ERROR or WARNING messages.")
        print(
            f"If successful, you should see 'Pipeline COMPLETED' or 'Saved X reviews' messages."
        )
        print(f"{'='*50}\n")
    except Exception as e:
        logger.error(f"Test script failed with unhandled error: {e}", exc_info=True)


if __name__ == "__main__":
    asyncio.run(main())
