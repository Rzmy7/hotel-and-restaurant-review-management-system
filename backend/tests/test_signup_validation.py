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

    def test_normalize_signup_email_accepts_various_tlds_and_short_domains(self):
        """Email with any valid TLD (.kaa, .ai) or short domain should be accepted."""
        self.assertEqual(normalize_signup_email("kalani@kaa.com"), "kalani@kaa.com")
        self.assertEqual(normalize_signup_email("user@startup.ai"), "user@startup.ai")
        self.assertEqual(normalize_signup_email("user@ab.com"), "user@ab.com")

    def test_normalize_signup_email_rejects_unrealistic_short_domain(self):
        """Email with single-letter domain label should be rejected"""
        with self.assertRaises(HTTPException) as context:
            normalize_signup_email("user@x.z")

        self.assertEqual(context.exception.status_code, 400)

    def test_normalize_signup_email_rejects_single_letter_tld(self):
        """Email with a single-letter TLD should be rejected"""
        with self.assertRaises(HTTPException) as context:
            normalize_signup_email("user@example.c")

        self.assertEqual(context.exception.status_code, 400)

    def test_normalize_signup_email_rejects_consecutive_dots(self):
        """Email with consecutive dots should be rejected"""
        with self.assertRaises(HTTPException) as context:
            normalize_signup_email("user..name@example.com")

        self.assertEqual(context.exception.status_code, 400)

    def test_normalize_signup_email_rejects_leading_dot_in_local(self):
        """Email with leading dot in local part should be rejected"""
        with self.assertRaises(HTTPException) as context:
            normalize_signup_email(".username@example.com")

        self.assertEqual(context.exception.status_code, 400)

    def test_normalize_signup_email_rejects_trailing_dot_in_local(self):
        """Email with trailing dot in local part should be rejected"""
        with self.assertRaises(HTTPException) as context:
            normalize_signup_email("username.@example.com")

        self.assertEqual(context.exception.status_code, 400)

    def test_normalize_signup_email_accepts_valid_realistic_emails(self):
        """Valid emails with recognized domains should be accepted"""
        valid_emails = [
            "john.doe@example.com",
            "user+tag@gmail.com",
            "contact@company.org",
            "support@service.net",
            "student@university.edu",
        ]
        for email in valid_emails:
            result = normalize_signup_email(email)
            self.assertEqual(result, email)


if __name__ == "__main__":
    unittest.main()
