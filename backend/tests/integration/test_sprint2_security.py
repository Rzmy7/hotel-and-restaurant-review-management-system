"""
Integration tests for Sprint 2 security hardening.
Verifies that all Reviews, Groups, and Organization endpoints
properly validate tenant scope using resolve_tenant_scope.
"""

import os
import uuid
import pytest
from unittest.mock import MagicMock, patch
from contextlib import asynccontextmanager
from fastapi import status, HTTPException
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "sqlite:///test.db")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests")

TEST_USER_ID = "11111111-1111-1111-1111-111111111111"
TEST_OWNED_ORG_ID = "22222222-2222-2222-2222-222222222222"
TEST_UNOWNED_ORG_ID = "33333333-3333-3333-3333-333333333333"

RegularUser = {
    "user_id": TEST_USER_ID,
    "role": "Tenant",
    "organization_id": TEST_OWNED_ORG_ID,
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
        
        # Setup mock DB execution and fetchone outcomes
        def db_execute_mock(stmt, params=None):
            p = params or {}
            stmt_str = str(stmt).lower()

            if "org_id" in p:
                org_id = p.get("org_id")
                if str(org_id) == TEST_OWNED_ORG_ID:
                    return MagicMock(fetchone=lambda: (1,))
                return MagicMock(fetchone=lambda: None)

            if "tenant_id" in p:
                return MagicMock(fetchone=lambda: (TEST_OWNED_ORG_ID,))

            if "user_id" in p:
                return MagicMock(fetchone=lambda: (TEST_OWNED_ORG_ID,))

            # Review ID lookup check
            if "select organization_id from dbo.processed_review" in stmt_str:
                review_id = p.get("review_id")
                if "44444444" in str(review_id):
                    return MagicMock(fetchone=lambda: (TEST_OWNED_ORG_ID,))
                elif "55555555" in str(review_id):
                    return MagicMock(fetchone=lambda: (TEST_UNOWNED_ORG_ID,))
                return MagicMock(fetchone=lambda: None)

            # Default fallback mock row
            mock_row = MagicMock()
            mock_row.__getitem__ = lambda self, idx: TEST_OWNED_ORG_ID
            return MagicMock(fetchone=lambda: mock_row)

        mock_session.execute = MagicMock(side_effect=db_execute_mock)

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


class TestReviewsSecurity:
    """Security tests for the Reviews router endpoints."""

    def test_read_reviews_success(self, security_client):
        mock_result = {"data": [], "total": 0}
        with patch("app.modules.reviews.routes.reviews.get_all_reviews_from_db", return_value=mock_result):
            response = security_client.get(f"/api/reviews/?organization_id={TEST_OWNED_ORG_ID}")
            assert response.status_code == status.HTTP_200_OK

    def test_read_reviews_unauthorized(self, security_client):
        response = security_client.get(f"/api/reviews/?organization_id={TEST_UNOWNED_ORG_ID}")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_meta_options_success(self, security_client):
        with patch("app.modules.reviews.routes.reviews.get_review_options", return_value={}):
            response = security_client.get(f"/api/reviews/meta/options?organization_id={TEST_OWNED_ORG_ID}")
            assert response.status_code == status.HTTP_200_OK

    def test_meta_options_unauthorized(self, security_client):
        response = security_client.get(f"/api/reviews/meta/options?organization_id={TEST_UNOWNED_ORG_ID}")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_meta_stats_success(self, security_client):
        with patch("app.modules.reviews.routes.reviews.get_review_stats", return_value={}):
            response = security_client.get(f"/api/reviews/meta/stats?organization_id={TEST_OWNED_ORG_ID}")
            assert response.status_code == status.HTTP_200_OK

    def test_meta_stats_unauthorized(self, security_client):
        response = security_client.get(f"/api/reviews/meta/stats?organization_id={TEST_UNOWNED_ORG_ID}")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_meta_distribution_success(self, security_client):
        with patch("app.modules.reviews.routes.reviews.get_full_distribution", return_value={}):
            response = security_client.get(f"/api/reviews/meta/distribution?organization_id={TEST_OWNED_ORG_ID}")
            assert response.status_code == status.HTTP_200_OK

    def test_meta_distribution_unauthorized(self, security_client):
        response = security_client.get(f"/api/reviews/meta/distribution?organization_id={TEST_UNOWNED_ORG_ID}")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_read_reviews_legacy_success(self, security_client):
        mock_result = {"data": [], "total": 0}
        with patch("app.modules.reviews.routes.reviews.get_all_reviews_from_db", return_value=mock_result):
            response = security_client.get(f"/api/reviews/{TEST_OWNED_ORG_ID}")
            assert response.status_code == status.HTTP_200_OK

    def test_read_reviews_legacy_unauthorized(self, security_client):
        response = security_client.get(f"/api/reviews/{TEST_UNOWNED_ORG_ID}")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_trigger_sync_success(self, security_client):
        mock_source = MagicMock()
        mock_source.organization_id = uuid.UUID(TEST_OWNED_ORG_ID)
        with patch("app.modules.reviews.routes.reviews.get_source_by_id", return_value=mock_source), \
             patch("app.modules.reviews.routes.reviews.start_ingestion_and_processing_flow"):
            response = security_client.post(f"/api/reviews/trigger/44444444-4444-4444-4444-444444444444")
            assert response.status_code == status.HTTP_200_OK

    def test_trigger_sync_unauthorized(self, security_client):
        mock_source = MagicMock()
        mock_source.organization_id = uuid.UUID(TEST_UNOWNED_ORG_ID)
        with patch("app.modules.reviews.routes.reviews.get_source_by_id", return_value=mock_source):
            response = security_client.post(f"/api/reviews/trigger/55555555-5555-5555-5555-555555555555")
            assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_trigger_ingest_success(self, security_client):
        mock_source = MagicMock()
        mock_source.organization_id = uuid.UUID(TEST_OWNED_ORG_ID)
        mock_source.platform_id = 1
        with patch("app.modules.reviews.routes.reviews.get_source_by_id", return_value=mock_source), \
             patch("app.modules.reviews.routes.reviews.ingest_from_scraper", return_value=1):
            response = security_client.post(f"/api/reviews/ingest/44444444-4444-4444-4444-444444444444")
            assert response.status_code == status.HTTP_200_OK

    def test_trigger_ingest_unauthorized(self, security_client):
        mock_source = MagicMock()
        mock_source.organization_id = uuid.UUID(TEST_UNOWNED_ORG_ID)
        mock_source.platform_id = 1
        with patch("app.modules.reviews.routes.reviews.get_source_by_id", return_value=mock_source):
            response = security_client.post(f"/api/reviews/ingest/55555555-5555-5555-5555-555555555555")
            assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_trigger_single_review_processing_success(self, security_client):
        with patch("app.modules.reviews.routes.reviews.process_single_review", return_value={}):
            response = security_client.post(f"/api/reviews/process/44444444-4444-4444-4444-444444444444")
            assert response.status_code == status.HTTP_200_OK

    def test_trigger_single_review_processing_unauthorized(self, security_client):
        response = security_client.post(f"/api/reviews/process/55555555-5555-5555-5555-555555555555")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_generate_reply_success(self, security_client):
        payload = {
            "reviewId": "44444444-4444-4444-4444-444444444444",
            "reviewText": "Excellent service!",
            "userName": "John Doe",
        }
        mock_reply = {
            "reply": "Thank you!",
            "provider": "Mock",
            "similarReviewsUsed": 0,
            "rulesUsed": 0,
        }
        with patch("app.modules.reviews.routes.reviews.generate_review_reply", return_value=mock_reply), \
             patch("app.modules.admin.services.subscription_service.check_feature_limit", return_value={"allowed": True, "feature_name": "reply_generations", "used": 0, "limit": 100}), \
             patch("app.modules.reviews.routes.reviews.increment_feature_usage"):
            response = security_client.post("/api/reviews/generate-reply", json=payload)
            assert response.status_code == status.HTTP_200_OK

    def test_generate_reply_unauthorized(self, security_client):
        payload = {
            "reviewId": "55555555-5555-5555-5555-555555555555",
            "reviewText": "Excellent service!",
            "userName": "John Doe",
        }
        response = security_client.post("/api/reviews/generate-reply", json=payload)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_reviews_by_source_success(self, security_client):
        mock_source = MagicMock()
        mock_source.organization_id = uuid.UUID(TEST_OWNED_ORG_ID)
        with patch("app.modules.reviews.routes.reviews.get_source_by_id", return_value=mock_source), \
             patch("app.modules.reviews.routes.reviews.delete_reviews_by_source_id", return_value=5), \
             patch("app.modules.reviews.routes.reviews.delete_embeddings_for_source"):
            response = security_client.delete("/api/reviews/source/44444444-4444-4444-4444-444444444444")
            assert response.status_code == status.HTTP_200_OK

    def test_delete_reviews_by_source_unauthorized(self, security_client):
        mock_source = MagicMock()
        mock_source.organization_id = uuid.UUID(TEST_UNOWNED_ORG_ID)
        with patch("app.modules.reviews.routes.reviews.get_source_by_id", return_value=mock_source):
            response = security_client.delete("/api/reviews/source/55555555-5555-5555-5555-555555555555")
            assert response.status_code == status.HTTP_403_FORBIDDEN


class TestGroupsSecurity:
    """Security tests for the Groups router endpoints."""

    def test_list_groups_success(self, security_client):
        with patch("app.modules.groups.repository.list_org_groups", return_value=[]):
            response = security_client.get(f"/api/groups?organization_id={TEST_OWNED_ORG_ID}")
            assert response.status_code == status.HTTP_200_OK

    def test_list_groups_unauthorized(self, security_client):
        response = security_client.get(f"/api/groups?organization_id={TEST_UNOWNED_ORG_ID}")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_group_success(self, security_client):
        payload = {
            "group_name": "Test Group",
            "organization_id": TEST_OWNED_ORG_ID,
        }
        mock_group = MagicMock()
        mock_group.group_id = uuid.UUID("44444444-4444-4444-4444-444444444444")
        mock_group.group_name = "Test Group"
        with patch("app.modules.groups.repository.create_group", return_value=mock_group), \
             patch("app.modules.groups.repository.add_member"):
            response = security_client.post("/api/groups", json=payload)
            assert response.status_code == status.HTTP_200_OK

    def test_create_group_unauthorized(self, security_client):
        payload = {
            "group_name": "Test Group",
            "organization_id": TEST_UNOWNED_ORG_ID,
        }
        response = security_client.post("/api/groups", json=payload)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_group_success(self, security_client):
        with patch("app.modules.groups.repository.get_group_detail", return_value={"id": "group-1"}):
            response = security_client.get(f"/api/groups/44444444-4444-4444-4444-444444444444?organization_id={TEST_OWNED_ORG_ID}")
            assert response.status_code == status.HTTP_200_OK

    def test_get_group_unauthorized(self, security_client):
        response = security_client.get(f"/api/groups/44444444-4444-4444-4444-444444444444?organization_id={TEST_UNOWNED_ORG_ID}")
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestOrganizationSecurity:
    """Security tests for the Organization and onboarding routes."""

    def test_update_organization_success(self, security_client):
        payload = {
            "organization_name": "Updated Org Name",
        }
        with patch("sqlalchemy.orm.Session.execute"):
            response = security_client.patch(f"/api/organizations/{TEST_OWNED_ORG_ID}", json=payload)
            assert response.status_code == status.HTTP_200_OK

    def test_update_organization_unauthorized(self, security_client):
        payload = {
            "organization_name": "Updated Org Name",
        }
        response = security_client.patch(f"/api/organizations/{TEST_UNOWNED_ORG_ID}", json=payload)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_upload_logo_success(self, security_client):
        files = {"file": ("logo.png", b"filecontent", "image/png")}
        with patch("app.modules.organization.services.organization_service.upload_organization_logo", return_value={"logo_url": "http://logo.png", "message": "Uploaded successfully"}):
            response = security_client.post(f"/api/organizations/{TEST_OWNED_ORG_ID}/upload-logo", files=files)
            assert response.status_code == status.HTTP_200_OK

    def test_upload_logo_unauthorized(self, security_client):
        files = {"file": ("logo.png", b"filecontent", "image/png")}
        response = security_client.post(f"/api/organizations/{TEST_UNOWNED_ORG_ID}/upload-logo", files=files)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_organization_success(self, security_client):
        with patch("sqlalchemy.orm.Session.execute"):
            response = security_client.delete(f"/api/organizations/{TEST_OWNED_ORG_ID}")
            assert response.status_code == status.HTTP_200_OK

    def test_delete_organization_unauthorized(self, security_client):
        response = security_client.delete(f"/api/organizations/{TEST_UNOWNED_ORG_ID}")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_discard_setup_success(self, security_client):
        with patch("sqlalchemy.orm.Session.execute"):
            response = security_client.delete(f"/api/setup/organizations/{TEST_OWNED_ORG_ID}/discard")
            assert response.status_code == status.HTTP_200_OK

    def test_discard_setup_unauthorized(self, security_client):
        response = security_client.delete(f"/api/setup/organizations/{TEST_UNOWNED_ORG_ID}/discard")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_upload_rules_success(self, security_client):
        files = {"file": ("rules.txt", b"rules content", "text/plain")}
        with patch("app.modules.organization.services.rules_service.process_rules_upload", return_value={"status": "success"}):
            response = security_client.post(f"/api/organizations/{TEST_OWNED_ORG_ID}/upload-rules", files=files)
            assert response.status_code == status.HTTP_200_OK

    def test_upload_rules_unauthorized(self, security_client):
        files = {"file": ("rules.txt", b"rules content", "text/plain")}
        response = security_client.post(f"/api/organizations/{TEST_UNOWNED_ORG_ID}/upload-rules", files=files)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_rules_success(self, security_client):
        with patch("app.modules.organization.services.rules_service.get_organization_rules", return_value=[]):
            response = security_client.get(f"/api/organizations/{TEST_OWNED_ORG_ID}/rules")
            assert response.status_code == status.HTTP_200_OK

    def test_get_rules_unauthorized(self, security_client):
        response = security_client.get(f"/api/organizations/{TEST_UNOWNED_ORG_ID}/rules")
        assert response.status_code == status.HTTP_403_FORBIDDEN

