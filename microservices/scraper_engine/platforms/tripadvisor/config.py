"""
TripAdvisor CSS selectors and configuration.
Update this file when TripAdvisor changes its DOM structure.
"""

class TripAdvisorSelectors:
    # ── Page-level ──
    ALL_REVIEWS_BTN    = 'button:has-text("All reviews"), button[data-test-target="HR_CC_CARD"] button, span:has-text("All reviews")'
    TOTAL_REVIEW_COUNT = 'span.khYLe, span.qS986, a[href*="#REVIEWS"] span, div.cPgBc span, span:has-text("reviews")'
    NEXT_PAGE_BTN      = 'a[aria-label="Next page"], button[aria-label="Next page"]'
    
    # ── Review list container ──
    REVIEW_CARD        = 'div[data-test-target="HR_CC_CARD"], div[data-automation="reviewCard"]'

    # ── Within each review card ──
    AUTHOR_NAME        = 'span.RUZll, a.BMQDV, [data-test-target="cyclops-user-profile-link"]'
    REVIEW_HEADING     = '[data-test-target="review-title"] a, [data-automation="reviewTitle"] a, a[href*="/ShowUserReviews-"]'
    REVIEW_TEXT        = 'div.fIrGe._T.bgMZj, [data-automation="reviewText"], span.yCeTE'
    STAYED_DATE        = 'span:has-text("Date of stay:"), div:has-text("Date of stay:")'
    REVIEW_DATE        = 'div.biGQs._P.VImYz, div.RpeCd, div.ZRBpD, div.cFpHO'
    AUTHOR_AREA        = 'div.Mi, div.cFpHO' # Container for location and contributions
    LIKES              = 'button[aria-label*="helpful vote"] span, button span.biGQs._P.navcl'
    RATING             = 'svg[data-automation="bubbleRatingImage"], svg[aria-label*="bubbles"]'
    IMAGES             = 'img[data-mediaid]' # Strictly user-uploaded photos
    REPLY              = 'div:has-text("Response from"), div:has-text("Management response"), div.WvSsn'

    # ── Sub-scores & Metadata ──
    SUB_RATING_LABELS  = ["Value", "Rooms", "Location", "Cleanliness", "Service", "Sleep Quality"]
    CONTRIBUTION_COUNT = 'span.qVkLn, span.ydwaE, div.MfnQg' 
    READ_MORE_BTN      = 'span:has-text("Read more"), button.UikNM, button[aria-expanded="false"]'

tripadvisor_selectors = TripAdvisorSelectors()

