from pydantic import BaseModel


class GoogleSelectors(BaseModel):
    # Review container
    review_card: str = ".jftiEf"
    review_id_attr: str = "data-review-id"

    # Reviewer details
    reviewer_name: str = ".d4r55"
    reviewer_badge: str = ".RfnDt"  # e.g. "Local Guide · 14 reviews · 6 photos"

    # Rating & Date
    review_rating: str = ".kvMYJc"  # aria-label contains "X/5" or star count
    review_date: str = ".xRkPPb"  # e.g. "2 months ago"

    # Review text
    review_text: str = ".MyEned"
    expand_review_btn: str = (
        ".w8nwRe.kyuRq"  # "More" button to expand truncated reviews
    )

    # Owner/Property reply
    reply_container: str = ".CDe7pd"
    reply_text: str = ".CDe7pd .MyEned"

    # Photos attached to reviews
    review_photos: str = ".Tya61d"

    # Scrollable container for infinite scroll pagination
    scroll_container: str = ".m6QErb.DxyBCb"

    # Reviews tab button
    reviews_tab: str = "button[aria-label*='Reviews']"

    # Total review count (shown in the reviews tab or header)
    review_count_header: str = ".fontBodySmall"


google_selectors = GoogleSelectors()
