from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.modules.reviews.models import ProcessedReview
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from app.services.gemini_client import generate_insights

router = APIRouter()


# 🔥 Calculate % change
def calculate_change(current, previous):
    if previous == 0:
        if current == 0:
            return "0%"
        return "+100%"

    change = current - previous
    percent = (change / previous) * 100

    sign = "+" if percent > 0 else ""
    return f"{sign}{round(percent, 1)}%"


# 🔥 Average rating helper
def avg_rating_calc(data):
    if not data:
        return 0
    return sum(r.rating or 0 for r in data) / len(data)


@router.get("/insights")
def get_insights(range: str = "30d", db: Session = Depends(get_db)):

    now = datetime.utcnow()

    # 🔹 Determine range
    if range == "7d":
        days = 7
    elif range == "30d":
        days = 30
    elif range == "90d":
        days = 90
    else:
        days = 30

    # 🔹 Define periods
    start_date = now - timedelta(days=days)
    prev_start = start_date - timedelta(days=days)
    prev_end = start_date

    # 🔹 Fetch data
    current_reviews = db.query(ProcessedReview).filter(
        ProcessedReview.reviewDate >= start_date,
        ProcessedReview.reviewDate < now
    ).all()

    previous_reviews = db.query(ProcessedReview).filter(
        ProcessedReview.reviewDate >= prev_start,
        ProcessedReview.reviewDate < prev_end
    ).all()

    current_total = len(current_reviews)
    previous_total = len(previous_reviews)

    # 🔹 Handle no data
    if current_total == 0:
        return {
            "overallScore": 0,
            "overallScoreChange": "0%",
            "totalReviews": "0",
            "totalReviewsChange": "0%",
            "avgRating": "0",
            "avgRatingChange": "0%",
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

    # 🔹 Ratings
    current_avg = avg_rating_calc(current_reviews)
    previous_avg = avg_rating_calc(previous_reviews)

    # 🔹 Changes
    avg_rating_change = calculate_change(current_avg, previous_avg)
    total_reviews_change = calculate_change(current_total, previous_total)

    overall_score = int(current_avg * 20)
    overall_score_change = avg_rating_change

    # 🔹 Sentiment split
    positive = [r for r in current_reviews if (r.rating or 0) >= 4]
    neutral  = [r for r in current_reviews if (r.rating or 0) == 3]
    negative = [r for r in current_reviews if (r.rating or 0) <= 2]

    # 🔹 Rating distribution
    rating_counts = Counter(int(r.rating or 0) for r in current_reviews if r.rating)

    rating_distribution = [
        {"rating": i, "count": rating_counts.get(i, 0)}
        for i in [5, 4, 3, 2, 1]
    ]

    # 🔹 Weekly sentiment
    weekly = defaultdict(lambda: {"pos": 0, "neu": 0, "neg": 0})

    for r in current_reviews:
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

    # 🔹 Keywords (simple version)
    pos_words = []
    neg_words = []

    for r in current_reviews:
        text = (r.text or "").lower()

        if "good" in text or "tasty" in text:
            pos_words.append("Good")

        if "bad" in text or "slow" in text:
            neg_words.append("Bad")

    positive_keywords = [
        {"word": k, "count": v} for k, v in Counter(pos_words).items()
    ]

    negative_keywords = [
        {"word": k, "count": v} for k, v in Counter(neg_words).items()
    ]

    # 🔹 AI Insights
    review_texts = [(r.text or "") for r in current_reviews if r.text]
    ai_result = generate_insights(review_texts)

    # 🔹 FINAL RESPONSE
    return {
        "overallScore": overall_score,
        "overallScoreChange": overall_score_change,

        "totalReviews": str(current_total),
        "totalReviewsChange": total_reviews_change,

        "avgRating": str(round(current_avg, 1)),
        "avgRatingChange": avg_rating_change,

        "sentimentMonths": sentimentMonths,
        "sentimentPositive": sentimentPositive,
        "sentimentNeutral": sentimentNeutral,
        "sentimentNegative": sentimentNegative,

        "categories": [],
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