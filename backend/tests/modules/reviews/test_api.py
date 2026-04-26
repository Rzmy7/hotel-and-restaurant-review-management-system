"""
Integration tests for the reviews API.
Verifies route accessibility and response formats.
"""

import uuid
import pytest
import traceback
from app.modules.auth.utils.auth_utils import get_current_user
from app.main import app as fastapi_app
from app.modules.source.models import Organization, Tenant


def test_read_reviews_unauthorized(client):
    """Should return 401 if no user is provided."""
    response = client.get("/api/reviews/")
    assert response.status_code == 401


def test_get_options_mocked(client, db_session):
    """Verifies meta/options endpoint with a mocked user and organization."""
    user_id = uuid.uuid4()
    org_id = uuid.uuid4()

    try:
        # Setup: Create tenant and organization
        tenant = Tenant(tenant_id=user_id, plan="pro")
        db_session.add(tenant)
        db_session.commit()

        org = Organization(
            organization_id=org_id, tenant_id=user_id, organization_name="Test Org"
        )
        db_session.add(org)
        db_session.commit()

        mock_user = {
            "user_id": str(user_id),
            "organization_id": str(org_id),
            "role": "admin",
        }

        # Override authentication
        fastapi_app.dependency_overrides[get_current_user] = lambda: mock_user

        response = client.get(f"/api/reviews/meta/options?organization_id={org_id}")

        if response.status_code != 200:
            print(f"\n[TEST_ERROR] Status: {response.status_code}")
            print(f"[TEST_ERROR] Body: {response.text}")

        assert response.status_code == 200
        data = response.json()
        assert "sources" in data
        assert "categories" in data
    except Exception as e:
        print(f"\n[TEST_EXCEPTION] {str(e)}")
        traceback.print_exc()
        raise e
    finally:
        fastapi_app.dependency_overrides.clear()
