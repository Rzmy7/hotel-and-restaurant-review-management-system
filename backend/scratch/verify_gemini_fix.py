import sys
import os
from unittest.mock import MagicMock, patch

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from google.genai import errors
from app.modules.reviews.services import gemini_client

def test_gemini_429_simulation():
    print("Starting Gemini 429 Simulation...")
    
    # Mock the resolve_api_key to return a dummy key
    with patch('app.modules.reviews.services.gemini_client._resolve_api_key', return_value="dummy_key"):
        # Mock the client and models.generate_content
        mock_client = MagicMock()
        with patch('google.genai.Client', return_value=mock_client):
            # Simulate 429 error
            mock_error = errors.ClientError("429 RESOURCE_EXHAUSTED. You exceeded your current quota.", {"error": {"code": 429}})
            mock_client.models.generate_content.side_effect = mock_error
            
            # We want to verify that notify_admin_gemini_quota_exceeded is called
            with patch('app.services.notification_helpers.notify_admin_gemini_quota_exceeded') as mock_notify:
                try:
                    # This should NOT retry because of our new logic
                    # and should call the notification helper
                    gemini_client.analyze_reviews_batch([{"id": 1, "text": "test"}])
                except errors.ClientError as e:
                    print(f"Caught expected ClientError: {e}")
                except Exception as e:
                    print(f"Caught unexpected Exception: {type(e)} - {e}")

                if mock_notify.called:
                    print("SUCCESS: Admin notification helper was called!")
                else:
                    print("FAILURE: Admin notification helper was NOT called.")

                # Verify number of calls to generate_content (should be 1, no retries)
                call_count = mock_client.models.generate_content.call_count
                print(f"Gemini API call count: {call_count}")
                if call_count == 1:
                    print("SUCCESS: No retries occurred for 429 error.")
                else:
                    print(f"FAILURE: {call_count} calls detected (retries happened).")

if __name__ == "__main__":
    test_gemini_429_simulation()
