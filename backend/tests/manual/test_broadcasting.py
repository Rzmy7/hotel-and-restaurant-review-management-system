#!/usr/bin/env python
"""Test script to verify broadcasting routes are properly registered."""

import sys
import traceback


def test_imports():
    """Test that all required modules can be imported."""
    try:
        print("Testing imports...")

        from app.services.broadcasting_service import (
            BroadcastCreate,
            StatisticsResponse,
            EstimatedRecipientsResponse,
            send_broadcast,
            get_broadcast_history,
            get_broadcast_by_id,
            resend_broadcast,
            cancel_broadcast,
            get_broadcast_statistics,
            get_estimated_recipients,
        )

        print("  ✓ All broadcasting_service imports successful")

        from app.auth.broadcasting_routes import router

        print("  ✓ Broadcasting router imported successfully")
        print(f"  ✓ Router has {len(router.routes)} routes:")

        for route in router.routes:
            methods = ", ".join(sorted(route.methods or ["GET"]))
            print(f"     - {route.path} [{methods}]")

        return True
    except Exception as e:
        print(f"  ✗ Import failed:")
        traceback.print_exc()
        return False


def test_models():
    """Test that models can be imported."""
    try:
        print("\nTesting models...")
        from app.models import BroadcastEvent, Notification

        print("  ✓ BroadcastEvent model imported")
        print("  ✓ Notification model imported")
        return True
    except Exception as e:
        print(f"  ✗ Model import failed:")
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_imports() and test_models()
    sys.exit(0 if success else 1)
