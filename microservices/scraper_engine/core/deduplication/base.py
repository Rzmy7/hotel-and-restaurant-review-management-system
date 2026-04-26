import logging
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Type

from core.models import Review

logger = logging.getLogger(__name__)


def find_duplicate_review_ids(
    session: Session, detail_model: Type, source_id: str, grouping_columns: List
) -> List[str]:
    """
    Finds duplicate review_ids by grouping by the specified columns.
    Returns a list of review_ids that are considered duplicates (keeping the oldest one by created_at).
    """
    # 1. For each group of columns, we find the earliest created_at
    # 2. We then identify the 'original' review_id for that min(created_at)
    # 3. Any review_id not in that set (but matching the source_id) is a duplicate

    # Using a subquery to find contextually 'first' ID per group
    # Note: If multiple reviews have the exact same created_at, min(review_id) will break ties.
    from sqlalchemy import and_

    subq = (
        session.query(
            *grouping_columns, func.min(Review.created_at).label("min_created")
        )
        .join(Review, Review.review_id == detail_model.review_id)
        .filter(Review.source_id == source_id)
        .group_by(*grouping_columns)
        .subquery()
    )

    # Match back to get the one "representative" review_id for each group
    min_ids_query = (
        session.query(func.min(detail_model.review_id))
        .join(Review, Review.review_id == detail_model.review_id)
        .join(
            subq,
            and_(
                *[
                    getattr(detail_model, col.name) == getattr(subq.c, col.name)
                    for col in grouping_columns
                ],
                Review.created_at == subq.c.min_created
            ),
        )
        .filter(Review.source_id == source_id)
        .group_by(*grouping_columns)
    )

    all_ids_query = (
        session.query(detail_model.review_id)
        .join(Review, Review.review_id == detail_model.review_id)
        .filter(Review.source_id == source_id)
    )

    min_ids = {r[0] for r in min_ids_query.all() if r[0] is not None}
    all_ids = {r[0] for r in all_ids_query.all() if r[0] is not None}

    duplicate_ids = list(all_ids - min_ids)
    return duplicate_ids


def remove_duplicate_reviews(session: Session, duplicate_ids: List[str]) -> int:
    """
    Given a list of duplicate review_ids, deletes them from the central Review table
    (which cascades deletion to the detail tables).
    """
    if not duplicate_ids:
        return 0

    count = 0
    batch_size = 500
    for i in range(0, len(duplicate_ids), batch_size):
        batch = duplicate_ids[i : i + batch_size]
        deleted_count = (
            session.query(Review)
            .filter(Review.review_id.in_(batch))
            .delete(synchronize_session=False)
        )
        count += deleted_count
        session.flush()

    return count
