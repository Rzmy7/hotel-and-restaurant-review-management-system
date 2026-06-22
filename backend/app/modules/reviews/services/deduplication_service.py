"""
Deduplication Service — handles identification and removal of duplicate reviews.
"""

import logging
import pyodbc
from app.core.pyodbc_connection import get_connection_string

logger = logging.getLogger(__name__)


def run_review_deduplication() -> int:
    """
    Identifies and removes duplicate reviews from the processed_review table.
    Duplicates are identified by source_id, reviewerName, rating, and text.
    
    Selection Priority ("Completeness" Logic):
    Prioritizes keeping reviews that have:
    1. A heading
    2. Positive/Negative text segments
    3. More associated media
    4. The earliest scrapedAt timestamp (original record)
    
    Returns:
        int: The number of duplicates removed, or -1 if an error occurred.
    """
    logger.info("Starting background review deduplication...")
    
    conn_str = get_connection_string()
    
    # SQL logic for ranking and filtering duplicates.
    # We use CAST(text AS NVARCHAR(4000)) because SQL Server does not allow 
    # PARTITION BY on NVARCHAR(MAX) columns.
    find_duplicates_sql = """
    WITH ReviewQuality AS (
        SELECT 
            r.id,
            r.source_id,
            r.reviewerName,
            r.rating,
            r.text,
            r.scrapedAt,
            CASE WHEN r.heading IS NOT NULL AND r.heading <> '' THEN 1 ELSE 0 END as has_heading,
            CASE WHEN r.positive_text IS NOT NULL AND r.positive_text <> '' THEN 1 ELSE 0 END as has_positive,
            CASE WHEN r.negative_text IS NOT NULL AND r.negative_text <> '' THEN 1 ELSE 0 END as has_negative,
            (SELECT COUNT(*) FROM dbo.review_media m WHERE m.review_id = r.id) as media_count
        FROM dbo.processed_review r
    ),
    RankedReviews AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY 
                    source_id, 
                    ISNULL(reviewerName, ''), 
                    ISNULL(rating, 0), 
                    CAST(ISNULL(text, '') AS NVARCHAR(4000))
                ORDER BY 
                    has_heading DESC, 
                    has_positive DESC, 
                    has_negative DESC, 
                    media_count DESC, 
                    scrapedAt ASC, 
                    id ASC
            ) as rn
        FROM ReviewQuality
    )
    SELECT id FROM RankedReviews WHERE rn > 1
    """
    
    try:
        with pyodbc.connect(conn_str) as conn:
            cursor = conn.cursor()
            
            # 1. Find the duplicates
            cursor.execute(find_duplicates_sql)
            duplicate_ids = [str(row[0]) for row in cursor.fetchall()]
            
            if not duplicate_ids:
                logger.info("Deduplication: No duplicates found.")
                return 0
            
            logger.info(f"Deduplication: Identified {len(duplicate_ids)} records for removal.")
            
            # 2. Delete in batches to avoid SQL expression complexity limits
            batch_size = 1000
            total_deleted = 0
            
            for i in range(0, len(duplicate_ids), batch_size):
                batch = duplicate_ids[i:i + batch_size]
                placeholders = ",".join(["?"] * len(batch))
                delete_sql = f"DELETE FROM dbo.processed_review WHERE id IN ({placeholders})"
                cursor.execute(delete_sql, *batch)
                total_deleted += cursor.rowcount
            
            conn.commit()
            logger.info(f"Deduplication: Successfully removed {total_deleted} duplicate reviews.")
            return total_deleted
            
    except Exception as e:
        logger.error(f"Deduplication CRITICAL FAILURE: {e}", exc_info=True)
        return -1
