"""
AI prompt templates for the competitors module.
"""

COMPETITOR_PROMPT = """Role: You are an Advanced Review Data Processor and Sentiment Analyst.

Task: Analyze the provided raw review JSON data from a competitor hotel and transform it into a structured JSON array.

Input Data: {hotel_data}

---

### TRANSFORMATION LOGIC

For each review object, generate an output object:

1. **platformReviewId**: Format as "BK-" followed by the original `review_id`.
2. **rating**: Input `score` is out of 10. Divide by 2, round to nearest integer (1-5 scale).
3. **userName**: Extract name from `raw_review`. Use first 1-2 words before room type. If unclear, use "Guest".
4. **text**: Combine `title`, `positive_txt`, `negative_txt` into one paragraph.
5. **reviewText**: Same as `text`.
6. **sentiment**: Based on rating. 4-5 = "Positive", 3 = "Neutral", 1-2 = "Negative".
7. **categories**: Select 1-3 from: ["Cleanliness", "Staff", "Location", "Facilities", "Comfort", "Value", "Noise", "Food", "Privacy", "WiFi", "Room Size"].
8. **keyPhrases**: Extract 3-5 short keywords/phrases from the text.
9. **summary**: One-sentence professional summary.
10. **date**: Format `reviewer_stay_date` to "MMM DD, YYYY" (e.g., "Nov 15, 2025").
11. **language**: Detect language, default "English".
12. **source**: Always "Booking.com".

### OUTPUT FORMAT
Return ONLY a valid JSON array. No markdown formatting.

[
  {{
    "platformReviewId": "BK-1",
    "rating": 4,
    "userName": "John",
    "text": "Great location and friendly staff...",
    "reviewText": "Great location and friendly staff...",
    "sentiment": "Positive",
    "categories": ["Location", "Staff"],
    "keyPhrases": ["Great location", "Friendly staff"],
    "summary": "Guest praised the location and staff service.",
    "date": "Nov 15, 2025",
    "language": "English",
    "source": "Booking.com"
  }}
]
"""

COMPARISON_INSIGHT_PROMPT = """You are an AI hospitality analyst. Given the comparison data between "My Hotel" and a competitor hotel "{competitor_name}", generate competitive insights.

Data:
- My Hotel: avg rating {my_rating}, {my_reviews} reviews, {my_positive}% positive, {my_negative}% negative
- {competitor_name}: avg rating {comp_rating}, {comp_reviews} reviews, {comp_positive}% positive, {comp_negative}% negative

My Hotel category scores: {my_categories}
Competitor category scores: {comp_categories}

Generate EXACTLY this JSON structure:
{{
  "strengths": ["list of 2-3 areas where My Hotel is stronger"],
  "weaknesses": ["list of 2-3 areas where the competitor is stronger"],
  "recommendations": ["list of 2-3 actionable recommendations to improve"],
  "tags": [
    {{"label": "strength area", "type": "positive"}},
    {{"label": "weakness area", "type": "warning"}}
  ]
}}

Return ONLY valid JSON. No markdown.
"""
