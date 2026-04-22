"""Verify the new score calculation."""
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pyodbc
from app.core.pyodbc_connection import get_connection_string

conn = pyodbc.connect(get_connection_string())
cursor = conn.cursor()

# Simulate the new all-time calculation
cursor.execute("""
    SELECT r.categories, ISNULL(r.sentiment_score, 3.0) as sentiment_score
    FROM dbo.processed_review r
    JOIN dbo.source s ON r.source_id = s.source_id
""")

cat_stats = {}
for row in cursor.fetchall():
    try:
        cats = json.loads(row.categories) if row.categories else []
    except:
        continue
    for cat in cats:
        cat = cat.strip()
        if not cat:
            continue
        if cat not in cat_stats:
            cat_stats[cat] = {"total": 0, "score_sum": 0.0}
        cat_stats[cat]["total"] += 1
        cat_stats[cat]["score_sum"] += float(row.sentiment_score)

print("=== New Score Calculation (avg mapped 1-5 -> 0-100%) ===")
for cat, stats in sorted(cat_stats.items(), key=lambda x: x[1]["total"], reverse=True)[:6]:
    total = stats["total"]
    avg = stats["score_sum"] / total
    score = round(((avg - 1.0) / 4.0) * 100)
    print(f"  {cat:15s}  total={total:3d}  avg_score={avg:.2f}  score={score}%")

conn.close()
