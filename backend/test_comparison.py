from app.modules.source.services.comparison_service import get_source_comparison
import uuid

# Dummy Org ID for testing
dummy_org_id = "00000000-0000-0000-0000-000000000000"

try:
    results = get_source_comparison(dummy_org_id)
    print(f"Comparison results count: {len(results)}")
    for res in results:
        print(res.model_dump())
except Exception as e:
    print(f"Error during test: {e}")
