import pytest
import smtplib
import uuid
import time
from unittest.mock import MagicMock, patch
from email.mime.multipart import MIMEMultipart

from app.modules.auth.services import email_service
from app.modules.auth.repositories.notifications_repo import create_notification
from app.modules.auth.models import User


def test_send_smtp_tls_port_587():
    """Verify SMTP on standard port 587 uses smtplib.SMTP with timeout and starttls."""
    with patch("app.modules.auth.services.email_service.SMTP_PORT", 587), \
         patch("app.modules.auth.services.email_service.SMTP_HOST", "smtp.gmail.com"), \
         patch("app.modules.auth.services.email_service.SMTP_TIMEOUT", 10), \
         patch("app.modules.auth.services.email_service.SMTP_EMAIL", "test@test.com"), \
         patch("app.modules.auth.services.email_service.SMTP_PASSWORD", "password"), \
         patch("app.modules.auth.services.email_service.SMTP_FROM_EMAIL", "test@test.com"), \
         patch("smtplib.SMTP") as mock_smtp:

        mock_server = MagicMock()
        mock_smtp.return_value = mock_server

        msg = MIMEMultipart()
        email_service._send(msg, "recipient@example.com")

        mock_smtp.assert_called_once_with("smtp.gmail.com", 587, timeout=10)
        assert mock_server.ehlo.call_count == 2
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once_with("test@test.com", "password")
        mock_server.sendmail.assert_called_once()
        mock_server.quit.assert_called_once()


def test_send_smtp_ssl_port_465():
    """Verify SMTP on SSL port 465 uses smtplib.SMTP_SSL with timeout."""
    with patch("app.modules.auth.services.email_service.SMTP_PORT", 465), \
         patch("app.modules.auth.services.email_service.SMTP_HOST", "smtp.gmail.com"), \
         patch("app.modules.auth.services.email_service.SMTP_TIMEOUT", 10), \
         patch("app.modules.auth.services.email_service.SMTP_EMAIL", "test@test.com"), \
         patch("app.modules.auth.services.email_service.SMTP_PASSWORD", "password"), \
         patch("app.modules.auth.services.email_service.SMTP_FROM_EMAIL", "test@test.com"), \
         patch("smtplib.SMTP_SSL") as mock_smtp_ssl:

        mock_server = MagicMock()
        mock_smtp_ssl.return_value = mock_server

        msg = MIMEMultipart()
        email_service._send(msg, "recipient@example.com")

        mock_smtp_ssl.assert_called_once_with("smtp.gmail.com", 465, timeout=10)
        mock_server.ehlo.assert_called_once()
        mock_server.login.assert_called_once_with("test@test.com", "password")
        mock_server.sendmail.assert_called_once()
        mock_server.quit.assert_called_once()


def test_send_in_background_executes_asynchronously():
    """Verify send_in_background offloads function execution to a worker thread."""
    executed = []

    def sample_fn(x, y):
        time.sleep(0.01)
        executed.append(x + y)

    future = email_service.send_in_background(sample_fn, 10, 20)
    assert future is not None
    # Wait for completion
    future.result(timeout=2)
    assert executed == [30]


def test_create_notification_enqueues_email_in_background():
    """Verify create_notification dispatches email via send_in_background without blocking."""
    mock_db = MagicMock()
    user_id = uuid.uuid4()

    mock_user = MagicMock(spec=User)
    mock_user.email = "test@example.com"
    mock_user.is_email_notifications_enabled = True

    mock_db.query().filter().first.return_value = mock_user

    with patch("app.modules.auth.repositories.notifications_repo.send_in_background") as mock_background:
        create_notification(
            db=mock_db,
            user_id=user_id,
            title="New Reviews Received",
            message="You have 5 new reviews",
            notification_type="info",
            send_email=True
        )

        mock_background.assert_called_once()
        args = mock_background.call_args[0]
        # First arg should be the function
        assert args[0] == email_service.send_notification_email
        assert args[1] == "test@example.com"
        assert args[2] == "New Reviews Received"
