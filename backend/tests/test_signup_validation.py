import unittest

from fastapi import HTTPException
from pydantic import ValidationError

from app.core.validations.signup_validator import (
    normalize_signup_email,
    validate_signup_name,
    validate_signup_payload,
)
from app.modules.auth.schemas.auth_schemas import SignupModel


class TestSignupValidation(unittest.TestCase):
    def test_validate_signup_payload_normalizes_name_and_email(self):
        result = validate_signup_payload(
            name="  John Doe  ",
            email="  JOHN.DOE@Example.COM  ",
            password="ValidPass1!",
        )

        self.assertEqual(result["name"], "John Doe")
        self.assertEqual(result["email"], "john.doe@example.com")

    def test_validate_signup_name_rejects_invalid_symbols(self):
        with self.assertRaises(HTTPException) as context:
            validate_signup_name("John123")

        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("letters", context.exception.detail)

    def test_validate_signup_payload_rejects_weak_password(self):
        with self.assertRaises(HTTPException) as context:
            validate_signup_payload("John Doe", "john@example.com", "weak")

        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("Password", context.exception.detail)

    def test_normalize_signup_email_rejects_empty(self):
        with self.assertRaises(HTTPException) as context:
            normalize_signup_email("   ")

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.detail, "Email is required.")

    def test_signup_model_rejects_blank_name(self):
        with self.assertRaises(ValidationError):
            SignupModel(name="   ", email="john@example.com", password="ValidPass1!")


if __name__ == "__main__":
    unittest.main()
