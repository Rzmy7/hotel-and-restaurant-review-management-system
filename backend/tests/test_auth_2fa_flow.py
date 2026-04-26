from types import SimpleNamespace
import unittest
from unittest.mock import patch

from app.modules.auth.services.auth_service import login_user
from app.modules.user.services.profile_service import disable_2fa


class FakeQuery:
    def __init__(self, db):
        self.db = db

    def filter(self, *args, **kwargs):
        return self

    def delete(self):
        self.db.delete_calls += 1


class FakeDB:
    def __init__(self):
        self.delete_calls = 0
        self.commit_calls = 0
        self.add_calls = 0

    def query(self, *args, **kwargs):
        return FakeQuery(self)

    def add(self, obj):
        self.add_calls += 1

    def commit(self):
        self.commit_calls += 1


def _build_user(is_2fa_enabled: bool = True):
    return SimpleNamespace(
        user_id="user-1",
        email="alice@example.com",
        is_active=True,
        password_hash="hashed-password",
        is_2fa_enabled=is_2fa_enabled,
        last_login_at=None,
        first_name="Alice",
        last_name="Example",
        full_name="Alice Example",
    )


class TestAuth2FAFlow(unittest.TestCase):
    def test_login_requires_2fa_before_disable_and_skips_after_disable(self):
        db = FakeDB()
        user = _build_user(is_2fa_enabled=True)

        with patch(
            "app.modules.auth.services.auth_service.get_user_by_email",
            return_value=user,
        ), patch(
            "app.modules.auth.services.auth_service.verify_password", return_value=True
        ), patch(
            "app.modules.auth.services.auth_service.get_user_primary_role",
            return_value="Admin",
        ), patch(
            "app.modules.auth.services.auth_service.random.randint", return_value=123456
        ), patch(
            "app.modules.auth.services.auth_service.send_2fa_email"
        ) as send_2fa_email_mock, patch(
            "app.modules.auth.services.auth_service._generate_login_response",
            return_value={"access_token": "ok"},
        ), patch(
            "app.modules.user.services.profile_service.get_user_profile",
            return_value=user,
        ):
            before_disable = login_user(db, user.email, "password123")
            self.assertTrue(before_disable.get("require_2fa"))
            send_2fa_email_mock.assert_called_once_with(user.email, "123456")

            disable_result = disable_2fa(db, user.user_id)
            self.assertEqual(
                disable_result["message"], "2FA has been successfully disabled"
            )
            self.assertFalse(user.is_2fa_enabled)

            after_disable = login_user(db, user.email, "password123")
            self.assertEqual(after_disable, {"access_token": "ok"})
            self.assertNotIn("require_2fa", after_disable)
            self.assertEqual(send_2fa_email_mock.call_count, 1)

    def test_disable_2fa_revokes_tokens_and_commits(self):
        db = FakeDB()
        user = _build_user(is_2fa_enabled=True)

        with patch(
            "app.modules.user.services.profile_service.get_user_profile",
            return_value=user,
        ):
            result = disable_2fa(db, user.user_id)

        self.assertEqual(result["message"], "2FA has been successfully disabled")
        self.assertFalse(user.is_2fa_enabled)
        self.assertEqual(db.delete_calls, 1)
        self.assertEqual(db.commit_calls, 1)


if __name__ == "__main__":
    unittest.main()
