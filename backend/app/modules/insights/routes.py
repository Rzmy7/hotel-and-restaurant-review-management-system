from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.modules.reviews.models import ProcessedReview
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from app.services.gemini_client import generate_insights
import json

router = APIRouter()


# ── Helpers ─────────────────────────────────────────

def calculate_change(current, previous):
    if previous == 0:
        return "0%" if current == 0 else "+100%"

    change = current - previous
    percent = (change / previous) * 100
    sign = "+" if percent > 0 else ""
    return f"{sign}{round(percent, 1)}%"


def avg_rating_calc(data):
    if not data:
        return 0
    return sum(r.rating or 0 for r in data) / len(data)


# ── API ─────────────────────────────────────────────

@router.get("/insights")
def get_insights(range: str = "30d", db: Session = Depends(get_db)):

    now = datetime.utcnow()

    # 🔹 Range selection
    days = 30
    if range == "7d":
        days = 7
    elif range == "90d":
        days = 90

    start_date = now - timedelta(days=days)
    prev_start = start_date - timedelta(days=days)
    prev_end = start_date

    # 🔹 Fetch reviews
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

    # 🔹 Empty state
    if current_total == 0:
        return {
            "overallScore": 0,
            "overallScoreChange": "0%",
            "totalReviews": "0",
            "totalReviewsChange": "0%",
            "avgRating": "0",
            "avgRatingChange": "0%",
            "responseRate": "0%",
            "responseRateChange": "0%",
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

    avg_rating_change = calculate_change(current_avg, previous_avg)
    total_reviews_change = calculate_change(current_total, previous_total)

    overall_score = int(current_avg * 20)
    overall_score_change = avg_rating_change

    # ── Weekly Sentiment ─────────────────────────────

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

    # ── Rating Distribution ──────────────────────────

    rating_counts = Counter(int(r.rating or 0) for r in current_reviews if r.rating)

    rating_distribution = [
        {
            "rating": i,
            "count": rating_counts.get(i, 0),
            "pct": round((rating_counts.get(i, 0) / current_total) * 100, 1) if current_total > 0 else 0,
        }
        for i in [5, 4, 3, 2, 1]
    ]

    # ── Category Performance (SAFE) ──────────────────

    category_scores = {}
    category_counts = {}

    for r in current_reviews:
        raw = r.categories
        if not raw:
            continue

        try:
            cats = json.loads(raw)
        except:
            continue

        # dict case
        if isinstance(cats, dict):
            for key, value in cats.items():
                if isinstance(value, (int, float)):
                    category_scores[key] = category_scores.get(key, 0) + value
                    category_counts[key] = category_counts.get(key, 0) + 1

        # list case
        elif isinstance(cats, list):
            for item in cats:
                if isinstance(item, dict):
                    key = item.get("name")
                    value = item.get("score")

                    if key and isinstance(value, (int, float)):
                        category_scores[key] = category_scores.get(key, 0) + value
                        category_counts[key] = category_counts.get(key, 0) + 1

                elif isinstance(item, str):
                    category_scores[item] = category_scores.get(item, 0) + 1
                    category_counts[item] = category_counts.get(item, 0) + 1

    category_performance = []

    for key in category_scores:
        avg = category_scores[key] / category_counts[key]
        category_performance.append({
            "name": key,
            "score": round(avg / 20, 1)
        })

    category_performance.sort(key=lambda x: x["score"], reverse=True)

    # ── Keywords ────────────────────────────────────

    pos_words, neg_words = [], []

    for r in current_reviews:
        text = (r.text or "").lower()

        if "good" in text or "tasty" in text:
            pos_words.append("Good")

        if "bad" in text or "slow" in text:
            neg_words.append("Bad")

    positive_keywords = [{"word": k, "count": v} for k, v in Counter(pos_words).items()]
    negative_keywords = [{"word": k, "count": v} for k, v in Counter(neg_words).items()]

    # ── AI Insights ─────────────────────────────────

    review_texts = [(r.text or "") for r in current_reviews if r.text]
    ai_result = generate_insights(review_texts)

    # ── Final Response ─────────────────────────────

    return {
        "overallScore": overall_score,
        "overallScoreChange": overall_score_change,

        "totalReviews": str(current_total),
        "totalReviewsChange": total_reviews_change,

        "avgRating": str(round(current_avg, 1)),
        "avgRatingChange": avg_rating_change,

        "responseRate": "0%",
        "responseRateChange": "0%",

        "sentimentMonths": sentimentMonths,
        "sentimentPositive": sentimentPositive,
        "sentimentNeutral": sentimentNeutral,
        "sentimentNegative": sentimentNegative,

        "categories": category_performance,
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