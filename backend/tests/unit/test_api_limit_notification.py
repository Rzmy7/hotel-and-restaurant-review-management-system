import uuid
from unittest.mock import MagicMock, patch
from app.services.notification_helpers import notify_admin_gemini_quota_exceeded
from app.modules.auth.constants.roles import ADMIN_ROLE_ID, TENANT_ROLE_ID

class MockUser:
    def __init__(self, user_id, role_id, is_active=True):
        self.user_id = user_id
        self.role_id = role_id
        self.is_active = is_active

@patch("app.database.session.SessionLocal")
@patch("app.modules.auth.repositories.notifications_repo.create_notification")
def test_notify_admin_gemini_quota_exceeded_flag_disabled(mock_create_notification, mock_session_local):
    # Mock DB Session
    db_session = MagicMock()
    mock_session_local.return_value = db_session

    admin_user = MockUser(uuid.uuid4(), ADMIN_ROLE_ID)
    normal_user = MockUser(uuid.uuid4(), TENANT_ROLE_ID)

    # Use call count to return admin for the first query, and normal user for the second
    call_count = 0
    def query_mock(cls):
        nonlocal call_count
        call_count += 1
        mock_query = MagicMock()
        if call_count == 1:
            mock_query.filter.return_value.all.return_value = [admin_user]
        else:
            mock_query.filter.return_value.all.return_value = [normal_user]
        return mock_query

    db_session.query.side_effect = query_mock

    # Mock DB execute for the system settings feature flag check (disabled)
    db_session.execute.return_value.fetchone.return_value = ("Disabled",)

    # Call target function
    notify_admin_gemini_quota_exceeded()

    # Assertions:
    # Admin should be notified
    # Normal user should NOT be notified (since feature flag is disabled)
    mock_create_notification.assert_any_call(
        db=db_session,
        user_id=admin_user.user_id,
        title="Gemini API Quota Exceeded",
        message="The Gemini API quota has been exceeded for review processing. Please check the API billing or plan limits.",
        notification_type="error",
    )

    # Ensure no warning notification was sent to normal user
    for call_args in mock_create_notification.call_args_list:
        kwargs = call_args.kwargs
        assert kwargs.get("user_id") != normal_user.user_id


@patch("app.database.session.SessionLocal")
@patch("app.modules.auth.repositories.notifications_repo.create_notification")
def test_notify_admin_gemini_quota_exceeded_flag_enabled(mock_create_notification, mock_session_local):
    # Mock DB Session
    db_session = MagicMock()
    mock_session_local.return_value = db_session

    admin_user = MockUser(uuid.uuid4(), ADMIN_ROLE_ID)
    normal_user = MockUser(uuid.uuid4(), TENANT_ROLE_ID)

    # Use call count to return admin for the first query, and normal user for the second
    call_count = 0
    def query_mock(cls):
        nonlocal call_count
        call_count += 1
        mock_query = MagicMock()
        if call_count == 1:
            mock_query.filter.return_value.all.return_value = [admin_user]
        else:
            mock_query.filter.return_value.all.return_value = [normal_user]
        return mock_query

    db_session.query.side_effect = query_mock

    # Mock DB execute for the system settings feature flag check (enabled)
    db_session.execute.return_value.fetchone.return_value = ("Enabled",)

    # Call target function
    notify_admin_gemini_quota_exceeded()

    # Assertions:
    # Admin should be notified (error)
    mock_create_notification.assert_any_call(
        db=db_session,
        user_id=admin_user.user_id,
        title="Gemini API Quota Exceeded",
        message="The Gemini API quota has been exceeded for review processing. Please check the API billing or plan limits.",
        notification_type="error",
    )

    # Normal user should be notified (warning) with custom message
    mock_create_notification.assert_any_call(
        db=db_session,
        user_id=normal_user.user_id,
        title="API Limit Reached",
        message="The review processing API limit has been reached. Review processing and reply generation are temporarily paused.",
        notification_type="warning",
    )


@patch("app.database.session.SessionLocal")
@patch("app.modules.auth.repositories.notifications_repo.create_notification")
def test_notify_admin_custom_model_quota_exceeded_flag_enabled(mock_create_notification, mock_session_local):
    # Mock DB Session
    db_session = MagicMock()
    mock_session_local.return_value = db_session

    admin_user = MockUser(uuid.uuid4(), ADMIN_ROLE_ID)
    normal_user = MockUser(uuid.uuid4(), TENANT_ROLE_ID)

    call_count = 0
    def query_mock(cls):
        nonlocal call_count
        call_count += 1
        mock_query = MagicMock()
        if call_count == 1:
            mock_query.filter.return_value.all.return_value = [admin_user]
        else:
            mock_query.filter.return_value.all.return_value = [normal_user]
        return mock_query

    db_session.query.side_effect = query_mock
    db_session.execute.return_value.fetchone.return_value = ("Enabled",)

    # Call target function with a custom model name
    notify_admin_gemini_quota_exceeded(model_name="GPT-4")

    # Assertions:
    # Admin should be notified with custom model name in title and message
    mock_create_notification.assert_any_call(
        db=db_session,
        user_id=admin_user.user_id,
        title="GPT-4 API Quota Exceeded",
        message="The GPT-4 API quota has been exceeded for review processing. Please check the API billing or plan limits.",
        notification_type="error",
    )


def test_is_billing_error_keywords():
    from app.modules.reviews.services.gemini_client import _is_billing_error
    
    # Test valid billing/quota errors for various providers
    assert _is_billing_error("Error code: 429 - {'error': {'message': 'You exceeded your current quota, please check your plan and billing details.'}}") is True
    assert _is_billing_error("rate limit reached") is True
    assert _is_billing_error("insufficient credits") is True
    assert _is_billing_error("RESOURCE_EXHAUSTED") is True
    assert _is_billing_error("out of credits") is True
    assert _is_billing_error("billing limit reached") is True
    assert _is_billing_error("payment required") is True
    
    # Test non-billing errors
    assert _is_billing_error("Internal server error") is False
    assert _is_billing_error("Validation failed: input text is too long") is False
