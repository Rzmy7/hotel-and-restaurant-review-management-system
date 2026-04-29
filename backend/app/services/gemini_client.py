def generate_insights(reviews: list[str]):
    # Temporary safe mock (no API needed)
    return {
        "actions": [
            {
                "severity": "warning",
                "title": "Slow service detected",
                "body": "Several customers mentioned delays in service."
            },
            {
                "severity": "info",
                "title": "Positive food feedback",
                "body": "Many customers liked the food quality."
            }
        ]
    }