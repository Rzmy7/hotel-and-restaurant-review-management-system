"""
Competitor scraping trigger route — POST /{competitor_id}/scrape
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.dependencies import get_current_user
from app.core.tenant_context import resolve_tenant_scope
from app.modules.competitors.schemas import ScrapeCompetitorRequest
from app.modules.competitors.services.competitor_service import get_competitor_by_id
from app.modules.competitors.services.scraping_pipeline import process_competitor_scrape

router = APIRouter()


@router.post("/{competitor_id}/scrape")
def scrape_competitor(
    competitor_id: str,
    payload: ScrapeCompetitorRequest,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 1. Resolve organization scope from token context
    resolved_org_id = resolve_tenant_scope(current_user, db, None)

    # 2. Retrieve competitor
    competitor = get_competitor_by_id(competitor_id)
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")

    # 3. Check ownership of competitor
    if competitor.get("tracking_organization_id") != resolved_org_id:
        raise HTTPException(status_code=403, detail="You do not have access to this competitor.")

    # 4. Resolve the Booking.com source URL
    booking_source = db.execute(
        text("""
            SELECT TOP 1 s.source_url
            FROM dbo.source s
            LEFT JOIN dbo.platform p ON p.platform_id = s.platform_id
            WHERE s.organization_id = :comp_org_id
              AND (p.platform_name = 'Booking.com' OR s.source_url LIKE '%booking.com%')
        """),
        {"comp_org_id": competitor["organization_id"]}
    ).fetchone()

    booking_url = booking_source[0] if booking_source else None
    if not booking_url:
        raise HTTPException(status_code=400, detail="Competitor has no Booking.com URL")

    background_tasks.add_task(
        process_competitor_scrape, competitor_id, booking_url, payload.headless
    )
    return {"message": f"Scraping started for {competitor['name']}", "competitorId": competitor_id}
