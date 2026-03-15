from pydantic import BaseModel

class BookingSelectors(BaseModel):
    # Modal and Navigation Selectors
    read_all_reviews: str = '[data-testid="fr-read-all-reviews"]'
    poi_block: str = '[data-testid="poi-block"]'
    next_page_button: str = '[aria-label="Next page"]'

    # Single Review Locators
    review_card: str = '[data-testid="review-card"]'
    review_author: str = '.b08850ce41.f546354b44'
    review_nationality: str = '.fff1944c52.fb14de7f14'
    review_title: str = '[data-testid="review-title"]'
    review_date: str = '[data-testid="review-date"]'
    review_score: str = '[data-testid="review-score"]'
    review_positive_text: str = '[data-testid="review-positive-text"]'
    review_negative_text: str = '[data-testid="review-negative-text"]'
    review_reply: str = '[data-testid="review-partner-reply"]'
    review_stay_date: str = '[data-testid="review-stay-date"]'
    review_num_nights: str = '[data-testid="review-num-nights"]'
    review_traveler_type: str = '[data-testid="review-traveler-type"]'
    review_room_name: str = '[data-testid="review-room-name"]'
    
    # Image Gallery Hooks
    review_photos: str = '[data-testid="review-photos"]'
    review_thumbnail: str = '[data-testid="REVIEW_THUMBNAIL_PROPERTY"]'
    gallery: str = '[data-testid="GALLERY"]'
    gallery_photo: str = '[data-testid="REVIEW_PHOTO_PROPERTY"] img'
    gallery_close: str = '[data-testid="GALLERY_CLOSE"]'

booking_selectors = BookingSelectors()
