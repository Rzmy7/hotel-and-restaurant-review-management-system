from pydantic import BaseModel

class AgodaSelectors(BaseModel):
    # Agoda specific selectors/constants
    review_container_selector: str = ".Review-comment"
    reviewer_name_selector: str = ".Review-comment-reviewer strong"
    review_rating_selector: str = ".Review-comment-leftScore"
    review_text_selector: str = ".Review-comment-bodyText"
    review_heading_selector: str = '[data-testid="review-title"]'
    review_room_type_selector: str = '[data-info-type="room-type"] span'
    review_traveler_type_selector: str = '[data-info-type="group-name"] span'
    review_stay_detail_selector: str = '[data-info-type="stay-detail"] span'
    review_nationality_selector: str = '[data-info-type="reviewer-name"] > span:last-child'
    review_date_xpath: str = "//span[contains(text(), 'Reviewed')]"
    review_images_selector: str = '[data-element-name="review-comment-ugc-thumbnail"] img'
    review_reply_selector: str = ".Review-response"
    review_reply_text_selector: str = ".Review-response-text"
    next_page_button_selector: str = "button[data-element-name='review-paginator-next']"
    dismiss_datepicker_selector: str = "button[data-selenium='searchButton']"
    open_reviews_selector: str = "button:has-text('Read all reviews')"
    open_reviews_selector_alt: str = "button[data-element-name='read-more-reviews-on-recent-review-scores']"

agoda_selectors = AgodaSelectors()
