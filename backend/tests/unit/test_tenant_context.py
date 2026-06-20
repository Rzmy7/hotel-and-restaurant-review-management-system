import pytest
from unittest.mock import MagicMock
from fastapi import HTTPException
from app.core.tenant_context import resolve_tenant_scope

class TestResolveTenantScope:
    def test_missing_user_id_raises_401(self):
        """If user_id is missing/empty, it should raise a 401 Unauthorized exception."""
        db = MagicMock()
        with pytest.raises(HTTPException) as exc_info:
            resolve_tenant_scope({}, db)
        assert exc_info.value.status_code == 401
        assert "user identifier" in exc_info.value.detail.lower()

    def test_admin_override_returns_supplied_org_id(self):
        """Admins can access any supplied organization_id directly."""
        db = MagicMock()
        user = {"user_id": "admin-1", "role": "Admin"}
        supplied_org = "custom-org-123"
        result = resolve_tenant_scope(user, db, client_supplied_org_id=supplied_org)
        assert result == supplied_org
        db.execute.assert_not_called()

    def test_system_admin_override_returns_supplied_org_id(self):
        """SYSTEM_ADMINs can access any supplied organization_id directly."""
        db = MagicMock()
        user = {"user_id": "admin-2", "role": "SYSTEM_ADMIN"}
        supplied_org = "custom-org-456"
        result = resolve_tenant_scope(user, db, client_supplied_org_id=supplied_org)
        assert result == supplied_org
        db.execute.assert_not_called()

    def test_user_supplies_owned_org_id_succeeds(self):
        """If user owns the supplied organization, it should succeed and return the ID."""
        db = MagicMock()
        # Mock DB execute response for ownership check
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = (1,)
        db.execute.return_value = mock_cursor

        user = {"user_id": "user-1", "role": "TENANT"}
        supplied_org = "org-1"
        result = resolve_tenant_scope(user, db, client_supplied_org_id=supplied_org)
        
        assert result == supplied_org
        # Verify ownership check SQL was executed
        assert db.execute.call_count == 1

    def test_user_supplies_unowned_org_id_raises_403(self):
        """If user does not own the supplied organization, raise 403 Forbidden."""
        db = MagicMock()
        # Mock DB execute response showing no ownership match
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = None
        db.execute.return_value = mock_cursor

        user = {"user_id": "user-1", "role": "TENANT"}
        supplied_org = "org-2"
        with pytest.raises(HTTPException) as exc_info:
            resolve_tenant_scope(user, db, client_supplied_org_id=supplied_org)
        
        assert exc_info.value.status_code == 403
        assert "do not have access" in exc_info.value.detail.lower()

    def test_omitted_param_uses_jwt_org_id(self):
        """If organization_id is omitted, resolve via user's JWT organization_id context."""
        db = MagicMock()
        user = {"user_id": "user-1", "role": "TENANT", "organization_id": "org-jwt-789"}
        result = resolve_tenant_scope(user, db)
        assert result == "org-jwt-789"
        db.execute.assert_not_called()

    def test_omitted_param_fallback_to_tenant_org(self):
        """If omitted and JWT has no org context, resolve via primary tenant organization in DB."""
        db = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchone.side_effect = [("org-db-fallback-1",), None]
        db.execute.return_value = mock_cursor

        user = {"user_id": "user-1", "role": "TENANT"}
        result = resolve_tenant_scope(user, db)
        assert result == "org-db-fallback-1"
        assert db.execute.call_count == 1

    def test_omitted_param_fallback_to_user_organizations_junction(self):
        """If fallback tenant org search returns nothing, resolve via user_organizations junction table."""
        db = MagicMock()
        mock_cursor_1 = MagicMock()
        mock_cursor_1.fetchone.return_value = None  # No tenant owned orgs
        
        mock_cursor_2 = MagicMock()
        mock_cursor_2.fetchone.return_value = ("org-db-fallback-junction",)
        
        db.execute.side_effect = [mock_cursor_1, mock_cursor_2]

        user = {"user_id": "user-1", "role": "TENANT"}
        result = resolve_tenant_scope(user, db)
        assert result == "org-db-fallback-junction"
        assert db.execute.call_count == 2

    def test_omitted_param_no_memberships_raises_400(self):
        """If omitted, JWT lacks context, and DB lookups find no organizations, raise 400 Bad Request."""
        db = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = None
        db.execute.return_value = mock_cursor

        user = {"user_id": "user-1", "role": "TENANT"}
        with pytest.raises(HTTPException) as exc_info:
            resolve_tenant_scope(user, db)
        
        assert exc_info.value.status_code == 400
        assert "no organization found" in exc_info.value.detail.lower()

    def test_orm_model_instance_input(self):
        """Verify the utility correctly extracts properties from SQLAlchemy ORM models."""
        db = MagicMock()
        mock_role = MagicMock()
        mock_role.role_name = "TENANT"
        
        mock_user = MagicMock()
        mock_user.user_id = "user-orm-id"
        mock_user.role = mock_role
        mock_user.organization_id = "org-orm-context"

        # Omitted client org param, should resolve via mock_user.organization_id
        result = resolve_tenant_scope(mock_user, db)
        assert result == "org-orm-context"
        db.execute.assert_not_called()
