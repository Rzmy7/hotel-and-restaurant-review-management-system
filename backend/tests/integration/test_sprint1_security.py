"""
Integration tests for Sprint 1 multi-tenant security changes.
Verifies that CRUD, analytics, scraping, sources, and dashboard endpoints
properly enforce organization ownership and return 403 Forbidden
upon unauthorized cross-tenant parameter manipulation.
"""

import os
import uuid
import pytest
from unittest.mock import MagicMock, patch
from contextlib import asynccontextmanager
from fastapi import status
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "sqlite:///test.db")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests")

TEST_USER_ID = "11111111-1111-1111-1111-111111111111"
TEST_OWNED_ORG_ID = "22222222-2222-2222-2222-222222222222"
TEST_UNOWNED_ORG_ID = "33333333-3333-3333-3333-333333333333"

# Mock current user definitions
RegularUser = {
    "user_id": TEST_USER_ID,
    "role": "Tenant",
    "organization_id": TEST_OWNED_ORG_ID,
}

AdminUser = {
    "user_id": "99999999-9999-9999-9999-999999999999",
    "role": "Admin",
    "organization_id": None,
}


@pytest.fixture(scope="module")
def security_client():
    """Create a TestClient with app, mocking get_db and auth dependencies."""
    @asynccontextmanager
    async def _noop_lifespan(app):
        yield

    with patch("app.database.session.engine", None), \
         patch("app.main.engine", None):

        import app.main as main_module

        # Disable lifespan context
        original_lifespan = main_module.app.router.lifespan_context
        main_module.app.router.lifespan_context = _noop_lifespan

        # Dependency Overrides
        from app.database.session import get_db
        from app.core.dependencies import get_current_user as core_get_user
        from app.modules.auth.utils.auth_utils import get_current_user as auth_get_user

        mock_session = MagicMock()
        
        # Setup DB execute mock for resolve_tenant_scope
        def db_execute_mock(stmt, params=None):
            p = params or {}
            stmt_str = str(stmt).lower()
            
            # Check ownership query (has both org_id and tenant_id parameters)
            if "org_id" in p and "tenant_id" in p:
                org_id = p.get("org_id")
                tenant_id = p.get("tenant_id")
                if str(org_id) == TEST_OWNED_ORG_ID and str(tenant_id) == TEST_USER_ID:
                    mock_row = MagicMock()
                    return mock_row
                else:
                    return MagicMock(fetchone=lambda: None)
            
            # Location query in suggestions
            if "latitude" in stmt_str or "longitude" in stmt_str:
                mock_loc = MagicMock()
                mock_loc.__getitem__ = lambda self, idx: (40.7128 if idx == 0 else -74.0060 if idx == 1 else 1)
                return MagicMock(fetchone=lambda: mock_loc)
            
            # Default fallback (e.g. fallback organization lookup)
            mock_row = MagicMock()
            mock_row.__getitem__ = lambda self, idx: TEST_OWNED_ORG_ID
            return MagicMock(fetchone=lambda: mock_row)

        mock_session.execute = MagicMock(side_effect=db_execute_mock)
        
        # Setup mock queries for Source models with integer stub attributes to satisfy calculate_success_rate
        mock_query = MagicMock()
        mock_source = MagicMock()
        mock_source.organization_id = uuid.UUID(TEST_OWNED_ORG_ID)
        mock_source.source_id = uuid.UUID("44444444-4444-4444-4444-444444444444")
        mock_source.success_sync_count = 0
        mock_source.platform = MagicMock()
        mock_source.platform.num_of_syncs = 0
        
        def filter_side_effect(criterion):
            criterion_str = str(criterion).lower()
            if "source_id" in criterion_str:
                if "55555555" in criterion_str:  # Represents invalid/unowned source ID
                    unowned_source = MagicMock()
                    unowned_source.organization_id = uuid.UUID(TEST_UNOWNED_ORG_ID)
                    unowned_source.success_sync_count = 0
                    unowned_source.platform = MagicMock()
                    unowned_source.platform.num_of_syncs = 0
                    return MagicMock(first=lambda: unowned_source)
                elif "00000000" in criterion_str:  # Non-existent source
                    return MagicMock(first=lambda: None)
                return MagicMock(first=lambda: mock_source)
            return mock_query

        mock_query.filter.side_effect = filter_side_effect
        mock_session.query.return_value = mock_query

        def _override_get_db():
            yield mock_session

        def _override_get_user():
            return RegularUser

        main_module.app.dependency_overrides[get_db] = _override_get_db
        main_module.app.dependency_overrides[core_get_user] = _override_get_user
        main_module.app.dependency_overrides[auth_get_user] = _override_get_user

        with TestClient(main_module.app, raise_server_exceptions=False) as c:
            yield c

        main_module.app.dependency_overrides.clear()
        main_module.app.router.lifespan_context = original_lifespan


class TestCompetitorSecurity:
    """Security tests for the Competitor router endpoints."""

    def test_list_competitors_success(self, security_client):
        with patch("app.modules.competitors.routes.crud.get_tracked_competitors", return_value=[]), \
             patch("app.modules.competitors.routes.crud.get_available_competitors", return_value=[]):
            response = security_client.get(f"/api/competitors/?organization_id={TEST_OWNED_ORG_ID}")
            assert response.status_code == status.HTTP_200_OK

    def test_list_competitors_unauthorized(self, security_client):
        response = security_client.get(f"/api/competitors/?organization_id={TEST_UNOWNED_ORG_ID}")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_suggestions_success(self, security_client):
        response = security_client.get(f"/api/competitors/suggestions?organization_id={TEST_OWNED_ORG_ID}")
        assert response.status_code == status.HTTP_200_OK

    def test_suggestions_unauthorized(self, security_client):
        response = security_client.get(f"/api/competitors/suggestions?organization_id={TEST_UNOWNED_ORG_ID}")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_competitor_success(self, security_client):
        payload = {
            "name": "Test Competitor",
            "organization_type_id": 1,
            "location_url": "https://maps.google.com/test",
            "sources": [{"platform_id": 1, "source_url": "https://www.booking.com/hotel/test"}]
        }
        with patch("app.modules.competitors.routes.crud.register_competitor", return_value={}):
            response = security_client.post(f"/api/competitors/?organization_id={TEST_OWNED_ORG_ID}", json=payload)
            assert response.status_code == status.HTTP_200_OK

    def test_create_competitor_unauthorized(self, security_client):
        payload = {
            "name": "Test Competitor",
            "organization_type_id": 1,
            "location_url": "https://maps.google.com/test",
            "sources": [{"platform_id": 1, "source_url": "https://www.booking.com/hotel/test"}]
        }
        response = security_client.post(f"/api/competitors/?organization_id={TEST_UNOWNED_ORG_ID}", json=payload)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_track_competitor_success(self, security_client):
        payload = {"competitorId": "44444444-4444-4444-4444-444444444444"}
        mock_competitor = {
            "id": "44444444-4444-4444-4444-444444444444",
            "tracking_organization_id": TEST_OWNED_ORG_ID,
            "organization_id": "55555555-5555-5555-5555-555555555555"
        }
        with patch("app.modules.competitors.routes.crud.get_competitor_by_id", return_value=mock_competitor), \
             patch("app.modules.competitors.routes.crud.track_competitor", return_value=mock_competitor):
            response = security_client.post(f"/api/competitors/track?organization_id={TEST_OWNED_ORG_ID}", json=payload)
            assert response.status_code == status.HTTP_200_OK

    def test_track_competitor_unauthorized(self, security_client):
        payload = {"competitorId": "44444444-4444-4444-4444-444444444444"}
        mock_competitor = {
            "id": "44444444-4444-4444-4444-444444444444",
            "tracking_organization_id": TEST_OWNED_ORG_ID,
            "organization_id": "55555555-5555-5555-5555-555555555555"
        }
        with patch("app.modules.competitors.routes.crud.get_competitor_by_id", return_value=mock_competitor):
            response = security_client.post(f"/api/competitors/track?organization_id={TEST_UNOWNED_ORG_ID}", json=payload)
            assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_scrape_competitor_success(self, security_client):
        mock_competitor = {
            "id": "44444444-4444-4444-4444-444444444444",
            "name": "Test Competitor",
            "tracking_organization_id": TEST_OWNED_ORG_ID,
            "organization_id": "55555555-5555-5555-5555-555555555555"
        }
        payload = {"headless": True}
        
        # We mock db.execute for resolving Booking.com url
        mock_db_res = MagicMock()
        mock_db_res.fetchone.return_value = ("https://www.booking.com/hotel/test",)
        
        with patch("app.modules.competitors.routes.scraping.get_competitor_by_id", return_value=mock_competitor), \
             patch("app.modules.competitors.routes.scraping.process_competitor_scrape") as mock_scrape, \
             patch("sqlalchemy.orm.Session.execute", return_value=mock_db_res):
            response = security_client.post(f"/api/competitors/44444444-4444-4444-4444-444444444444/scrape", json=payload)
            assert response.status_code == status.HTTP_200_OK

    def test_scrape_competitor_unauthorized(self, security_client):
        # Tracking org differs
        mock_competitor = {
            "id": "44444444-4444-4444-4444-444444444444",
            "name": "Test Competitor",
            "tracking_organization_id": TEST_UNOWNED_ORG_ID,
            "organization_id": "55555555-5555-5555-5555-555555555555"
        }
        payload = {"headless": True}
        with patch("app.modules.competitors.routes.scraping.get_competitor_by_id", return_value=mock_competitor):
            response = security_client.post(f"/api/competitors/44444444-4444-4444-4444-444444444444/scrape", json=payload)
            assert response.status_code == status.HTTP_403_FORBIDDEN


class TestSourceSecurity:
    """Security tests for the Source router endpoints."""

    def test_get_sync_logs_success(self, security_client):
        with patch("app.modules.source.services.source_service.get_sync_logs", return_value=[]):
            response = security_client.get(f"/api/source/organizations/{TEST_OWNED_ORG_ID}/sync-logs")
            assert response.status_code == status.HTTP_200_OK

    def test_get_sync_logs_unauthorized(self, security_client):
        response = security_client.get(f"/api/source/organizations/{TEST_UNOWNED_ORG_ID}/sync-logs")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_source_owned_passes_auth(self, security_client):
        """Owned source passes auth check (non-403 means auth check passed — service may fail due to mock DB)."""
        payload = {"source_url": "https://www.booking.com/hotel/updated"}
        with patch("app.modules.source.services.source_service.update_source") as mock_update:
            mock_update.side_effect = Exception("service_not_tested")
            response = security_client.patch(f"/api/source/44444444-4444-4444-4444-444444444444", json=payload)
            # Auth check passed if we didn't get 403 (service exception became 500)
            assert response.status_code != status.HTTP_403_FORBIDDEN

    def test_update_source_unauthorized(self, security_client):
        """resolve_tenant_scope raises 403 → update_source never called."""
        from fastapi import HTTPException as _HTTPException
        payload = {"source_url": "https://www.booking.com/hotel/updated"}
        with patch(
            "app.modules.source.routers.source_router.resolve_tenant_scope",
            side_effect=_HTTPException(status_code=403, detail="No access"),
        ):
            response = security_client.patch(
                f"/api/source/44444444-4444-4444-4444-444444444444", json=payload
            )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_source_unauthorized(self, security_client):
        """resolve_tenant_scope raises 403 → delete_source never called."""
        from fastapi import HTTPException as _HTTPException
        with patch(
            "app.modules.source.routers.source_router.resolve_tenant_scope",
            side_effect=_HTTPException(status_code=403, detail="No access"),
        ):
            response = security_client.delete(
                f"/api/source/44444444-4444-4444-4444-444444444444"
            )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_sync_trigger_unauthorized(self, security_client):
        """resolve_tenant_scope raises 403 → trigger_sync never called."""
        from fastapi import HTTPException as _HTTPException
        with patch(
            "app.modules.source.routers.source_router.resolve_tenant_scope",
            side_effect=_HTTPException(status_code=403, detail="No access"),
        ):
            response = security_client.post(
                f"/api/source/44444444-4444-4444-4444-444444444444/sync"
            )
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestDashboardSecurity:
    """Security tests for the Unified Dashboard endpoints."""

    def test_unified_dashboard_success(self, security_client):
        mock_db_conn = MagicMock()
        mock_metrics = {
            "avgRating": {"value": 4.5},
            "sentimentScore": {"value": 85.0},
            "reviewCount": {"value": 150},
        }
        with patch("pyodbc.connect", return_value=mock_db_conn), \
             patch("app.modules.dashboard.routes.unified_dashboard.get_dashboard_metrics", return_value=mock_metrics), \
             patch("app.modules.dashboard.routes.unified_dashboard.get_sentiment_distribution", return_value={}), \
             patch("app.modules.dashboard.routes.unified_dashboard.get_daily_review_trends", return_value=[]), \
             patch("app.modules.dashboard.routes.unified_dashboard.get_weekly_review_trends", return_value=[]), \
             patch("app.modules.dashboard.routes.unified_dashboard.get_category_performance", return_value=[]), \
             patch("app.modules.dashboard.routes.unified_dashboard.get_source_comparison_metrics", return_value={}), \
             patch("app.modules.dashboard.routes.unified_dashboard.get_recent_reviews", return_value={"reviews": []}), \
             patch("app.modules.dashboard.routes.unified_dashboard.get_alerts", return_value={"alerts": []}):
            response = security_client.get(f"/api/organizations/{TEST_OWNED_ORG_ID}/dashboard")
            assert response.status_code == status.HTTP_200_OK

    def test_unified_dashboard_unauthorized(self, security_client):
        response = security_client.get(f"/api/organizations/{TEST_UNOWNED_ORG_ID}/dashboard")
        assert response.status_code == status.HTTP_403_FORBIDDEN
