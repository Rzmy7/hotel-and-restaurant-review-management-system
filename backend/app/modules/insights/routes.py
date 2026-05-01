from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.modules.reviews.models import ProcessedReview
from collections import Counter, defaultdict
from app.services.gemini_client import generate_insights
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/insights")
def get_insights(range: str = "30d", db: Session = Depends(get_db)):

    # 🟢 STEP 1 — Get reviews
    now = datetime.utcnow()

    # Determine date range
    if range == "7d":
        start_date = now - timedelta(days=7)
    elif range == "30d":
        start_date = now - timedelta(days=30)
    elif range == "90d":
        start_date = now - timedelta(days=90)
    else:
        start_date = now - timedelta(days=30)

    # Filter reviews by date
    reviews = db.query(ProcessedReview).filter(
        ProcessedReview.reviewDate >= start_date
    ).all()
    
    total_reviews = len(reviews)

    # 🟢 Handle empty case
    if total_reviews == 0:
        return {
            "overallScore": 0,
            "totalReviews": "0",
            "avgRating": "0",
            "sentimentMonths": [],
            "sentimentPositive": [],
            "sentimentNeutral": [],
            "sentimentNegative": [],
            "categories": [],
            "ratingDistribution": [],
            "positiveKeywords": [],
            "negativeKeywords": [],
            "heatmapWeeks": [[1,2,3,4,5,6,7]],
            "sources": [],
            "responseMetrics": {
                "avgTime": "0h",
                "rate": "0%",
                "ratingImpact": "0"
            },
            "aiActions": []
        }

    # 🟢 STEP 2 — Ratings
    avg_rating = sum(r.rating or 0 for r in reviews) / total_reviews

    # 🟢 STEP 3 — Sentiment calculation
    positive = [r for r in reviews if (r.rating or 0) >= 4]
    neutral  = [r for r in reviews if (r.rating or 0) == 3]
    negative = [r for r in reviews if (r.rating or 0) <= 2]

    pos_pct = int(len(positive) / total_reviews * 100)
    neu_pct = int(len(neutral) / total_reviews * 100)
    neg_pct = int(len(negative) / total_reviews * 100)

    # 🟢 STEP 4 — Category analysis
    categories = [
        {"name": "Food", "score": pos_pct, "prev": pos_pct - 5},
        {"name": "Service", "score": pos_pct - 10, "prev": pos_pct - 15},
    ]

    # 🟢 STEP 5 — Rating distribution
    rating_counts = Counter(int(r.rating or 0) for r in reviews if r.rating)

    rating_distribution = [
        {"rating": 5, "count": rating_counts.get(5, 0)},
        {"rating": 4, "count": rating_counts.get(4, 0)},
        {"rating": 3, "count": rating_counts.get(3, 0)},
        {"rating": 2, "count": rating_counts.get(2, 0)},
        {"rating": 1, "count": rating_counts.get(1, 0)},
    ]

    # 🟢 STEP 6 — Keyword extraction
    pos_words = []
    neg_words = []

    for r in reviews:
        text = (r.text or "").lower()

        if "good" in text or "tasty" in text:
            pos_words.append("Good food")

        if "slow" in text or "bad" in text:
            neg_words.append("Slow service")

    positive_keywords = [
        {"word": k, "count": v} for k, v in Counter(pos_words).items()
    ]

    negative_keywords = [
        {"word": k, "count": v} for k, v in Counter(neg_words).items()
    ]

    # 🟢 STEP 7 — Real sentiment timeline
    weekly = defaultdict(lambda: {"pos": 0, "neu": 0, "neg": 0})

    for r in reviews:
        if not r.reviewDate:
            continue

        week = r.reviewDate.strftime("%Y-%W")
        rating = r.rating or 0

        if rating >= 4:
            weekly[week]["pos"] += 1
        elif rating == 3:
            weekly[week]["neu"] += 1
        else:
            weekly[week]["neg"] += 1

    sorted_weeks = sorted(weekly.keys())

    sentimentMonths = sorted_weeks
    sentimentPositive = [weekly[w]["pos"] for w in sorted_weeks]
    sentimentNeutral  = [weekly[w]["neu"] for w in sorted_weeks]
    sentimentNegative = [weekly[w]["neg"] for w in sorted_weeks]

    review_texts = [(r.text or "") for r in reviews if r.text]
    ai_result = generate_insights(review_texts)

    # 🟢 FINAL RESPONSE
    return {
        "overallScore": int(avg_rating * 20),
        "totalReviews": str(total_reviews),
        "avgRating": str(round(avg_rating, 1)),

        "sentimentMonths": sentimentMonths,
        "sentimentPositive": sentimentPositive,
        "sentimentNeutral": sentimentNeutral,
        "sentimentNegative": sentimentNegative,

        "categories": categories,
        "ratingDistribution": rating_distribution,

        "positiveKeywords": positive_keywords,
        "negativeKeywords": negative_keywords,

        "heatmapWeeks": [[1,2,3,4,5,6,7]],

        "sources": [],
        "responseMetrics": {
            "avgTime": "0h",
            "rate": "0%",
            "ratingImpact": "0"
        },

        "aiActions": ai_result.get("actions", [])
    }