import pyodbc
import os
import uuid
from dotenv import load_dotenv
from app.core.db_utils import get_connection_string
from app.modules.reviews.services.processor import _update_review_success

load_dotenv()

def verify():
    conn_str = get_connection_string()
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    
    try:
        # 1. Fetch a review to test with
        cursor.execute("SELECT TOP 1 id FROM processed_review WHERE status = 'processed'")
        row = cursor.fetchone()
        if not row:
            print("No processed reviews found to test with.")
            # Try any review
            cursor.execute("SELECT TOP 1 id FROM processed_review")
            row = cursor.fetchone()
            if not row:
                print("No reviews at all in DB.")
                return

        review_id = row[0]
        print(f"Testing with review ID: {review_id}")
        
        # 2. Mock analysis data
        mock_analysis = {
            "categories": [
                {"name": "Test Category 1", "score": 85},
                {"name": "Test Category 2", "value": 92}, # Testing 'value' key support
                "Test Category 3" # Testing string support
            ],
            "sentiment_score": 0.8
        }
        
        mock_original_review = {"id": review_id}
        
        # 3. Call the processor function
        print("Calling _update_review_success...")
        _update_review_success(cursor, mock_original_review, mock_analysis)
        conn.commit()
        
        # 4. Verify results
        cursor.execute("SELECT name, score FROM dbo.review_category WHERE review_id = ?", review_id)
        results = cursor.fetchall()
        
        print(f"Found {len(results)} categories for this review:")
        for r in results:
            print(f" - {r.name}: {r.score}")
            
        if len(results) == 3:
            print("\nSUCCESS: All test categories persisted correctly!")
        else:
            print(f"\nFAILURE: Expected 3 categories, found {len(results)}.")
            
    except Exception as e:
        print(f"An error occurred during verification: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    verify()
