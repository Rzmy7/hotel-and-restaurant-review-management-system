import json
import pyodbc
import uvicorn
import os
import datetime  # Import the whole module to avoid naming conflicts
from typing import List, Optional
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException ,BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, AnyHttpUrl ,Field


from scraping.booking import scrape_booking

load_dotenv()  # Load environment variables

# ==========================================
# 1. CONFIGURATION
# ==========================================
DB_CONNECTION_STRING = (
    f"DRIVER={{{os.getenv('DB_DRIVER', 'ODBC Driver 17 for SQL Server')}}};"
    f"SERVER={os.getenv('DB_SERVER')};"
    f"DATABASE={os.getenv('DB_NAME')};"
    f"UID={os.getenv('DB_UID')};"
    f"PWD={os.getenv('DB_PWD')};"
    "TrustServerCertificate=yes;"
)

# ==========================================
# 2. DATA MODELS (Pydantic)
# ==========================================

class PhotoModel(BaseModel):
    src: str
    alt: str = ""

class ReviewModel(BaseModel):
    id: str
    platformReviewId: Optional[str] = None
    rating: int
    userName: str
    reviewerName: Optional[str] = None
    reviewText: Optional[str] = Field(..., validation_alias="text")
    summary: Optional[str] = None
    sentiment: str
    language: Optional[str] = "English"
    
    # Lists
    categories: List[str] = []
    keyPhrases: List[str] = []
    photos: List[PhotoModel] = []
    
    source: str
    
    # FIXED: Explicitly use datetime.date to avoid conflict with the field name "date"
    date: Optional[datetime.date] = None 
    
    # Status flags
    status: str
    replyStatus: Optional[str] = "Pending"
    hasReply: Optional[str] = "No"
    

class BookingScrapeRequest(BaseModel):
    url: AnyHttpUrl
    headless: bool = True

# ==========================================
# 3. APP INITIALIZATION
# ==========================================
app = FastAPI(title="Review Management API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

# ==========================================
# 4. DATABASE HELPERS
# ==========================================
def get_all_reviews_from_db():
    try:
        conn = pyodbc.connect(DB_CONNECTION_STRING)
        cursor = conn.cursor()

        # 1. Fetch the PROCESSED data
        sql_reviews = """
            SELECT 
                id, platformReviewId, rating, userName, reviewerName,
                reviewText, summary, sentiment, language, categories, 
                keyPhrases, reviewDate, status, replyStatus, hasReply, source
            FROM dbo.ProcessedReviews
        """
        rows = cursor.execute(sql_reviews).fetchall()
        
        # 2. Fetch Photos (Link via platformReviewId -> raw review_id)
        original_ids = []
        id_map = {} # Maps original_int_id -> new_system_id (REV-XXX)
        
        for r in rows:
            try:
                # Extract ID from "BK-101" -> 101
                if r.platformReviewId and "-" in r.platformReviewId:
                    orig_id = int(r.platformReviewId.split('-')[1])
                    original_ids.append(orig_id)
                    id_map[orig_id] = r.id
            except (ValueError, IndexError):
                continue

        # Bulk fetch photos
        photo_map = {}
        if original_ids:
            placeholders = ','.join('?' * len(original_ids))
            sql_photos = f"SELECT review_id, src, alt FROM review_photos WHERE review_id IN ({placeholders})"
            pics = cursor.execute(sql_photos, original_ids).fetchall()
            
            for pid, src, alt in pics:
                sys_id = id_map.get(pid)
                if sys_id:
                    photo_map.setdefault(sys_id, []).append({"src": src, "alt": alt})

        # 3. Build the Result List
        results = []
        for row in rows:
            # Parse JSON Lists
            try:
                cat_list = json.loads(row.categories) if row.categories else []
            except json.JSONDecodeError:
                cat_list = []

            try:
                phrase_list = json.loads(row.keyPhrases) if row.keyPhrases else []
            except json.JSONDecodeError:
                phrase_list = []

            results.append({
                "id": row.id,
                "platformReviewId": row.platformReviewId,
                "rating": row.rating or 0,
                "userName": row.userName or "Anonymous",
                "reviewerName": row.reviewerName,
                "text": row.reviewText, 
                "summary": row.summary,
                "sentiment": row.sentiment,
                "language": row.language,
                "categories": cat_list,
                "keyPhrases": phrase_list,
                "date": row.reviewDate, 
                "status": row.status,
                "replyStatus": row.replyStatus,
                "hasReply": row.hasReply,
                "source": row.source,
                "photos": photo_map.get(row.id, []) 
            })

        conn.close()
        return results

    except Exception as e:
        print(f"Database Error: {e}")
        raise e 
    
    
def remove_all_reviews_from_db():
    try:
        conn = pyodbc.connect(DB_CONNECTION_STRING)
        cursor = conn.cursor()

        # Delete all records from ProcessedReviews
        cursor.execute("DELETE FROM dbo.reviews")
        conn.commit()

        # Delete all records from ReviewPhotos
        cursor.execute("DELETE FROM dbo.review_photos")
        conn.commit()
        
        # Delete all records from RawReviews
        cursor.execute("DELETE FROM dbo.ProcessedReviews")
        conn.commit()


        conn.close()
        return True
    except Exception as e:
        print(f"Database Error: {e}")
        raise e 


# ==========================================
# 5. API ROUTES
# ==========================================

@app.get("/")
def read_root():
    return {"status": "Active", "message": "Visit /docs to see the API"}



@app.get("/reviews", response_model=List[ReviewModel])
def read_reviews():
    """
    Fetch all processed reviews from the database.
    """
    try:
        reviews = get_all_reviews_from_db()
        return reviews
    except Exception as e:
        # Log the full error to console for debugging
        print(f"API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/reviews_count")
def count_reviews():
    """
    Returns the total number of reviews in the database.
    """
    try:
        conn = pyodbc.connect(DB_CONNECTION_STRING)
        cursor = conn.cursor()

        # FIXED: Updated table name to dbo.ProcessedReviews
        query = "SELECT COUNT(*) FROM dbo.ProcessedReviews"

        cursor.execute(query)
        count = cursor.fetchone()[0] 

        conn.close()
        return {"total_reviews": count}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    
@app.delete("/delete_reviews")
def delete_all_reviews():
    """
    Deletes all reviews from the database.
    """
    try:
        success = remove_all_reviews_from_db()
        if success:
            return {"status": "success", "message": "All reviews deleted."}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete reviews.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    
@app.post("/scrape/booking", tags=["Scraping"])
async def start_booking_scrape(payload: BookingScrapeRequest, background_tasks: BackgroundTasks):
    """Kick off a Booking.com scrape from the front end.

    Runs in a background task so the HTTP request returns immediately.
    """
    # try:
    #     remove_all_reviews_from_db()
    # except Exception as exc: 
    #     raise HTTPException(status_code=500, detail=f"Unable to clear existing reviews: {exc}")
        
    try:
        background_tasks.add_task(scrape_booking, str(payload.url), payload.headless)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Unable to start scrape: {exc}")

    return {
        "message": "Booking.com scrape started",
        "url": str(payload.url),
        "headless": payload.headless,
    }



class BookingScrapeRequest(BaseModel):
    url: AnyHttpUrl
    headless: bool = True


@app.post("/scrape/booking", tags=["Scraping"])
async def start_booking_scrape(payload: BookingScrapeRequest, background_tasks: BackgroundTasks):
    """Kick off a Booking.com scrape from the front end.

    Runs in a background task so the HTTP request returns immediately.
    """
    
    try:
        remove_all_reviews_from_db()
    except Exception as e:
        print(e)
    
    try:
        background_tasks.add_task(scrape_booking, str(payload.url), payload.headless)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Unable to start scrape: {exc}")

    return {
        "message": "Booking.com scrape started",
        "url": str(payload.url),
        "headless": payload.headless,
    }


# ==========================================
# 6. RUNNER
# ==========================================
if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)