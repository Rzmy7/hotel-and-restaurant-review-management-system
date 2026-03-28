"""
TripAdvisor CSS selectors and configuration.
Update this file when TripAdvisor changes its DOM structure.
"""

class TripAdvisorSelectors:
    # ── Page-level ──
    ALL_REVIEWS_BTN    = 'button:has-text("All reviews"), button.biGQs._P.ezezH'
    TOTAL_REVIEW_COUNT = 'span.khYLe, span.qS986, a[href*="#REVIEWS"] span, div.cPgBc span'
    NEXT_PAGE_BTN      = 'a[aria-label="Next page"]'
    
    # ── Review list container ──
    REVIEW_CARD        = 'div[data-automation="reviewCard"]'

    # ── Within each review card ──
    AUTHOR_NAME        = '[data-test-target="cyclops-user-profile-link"], a.BMQDV'
    REVIEW_HEADING     = '[data-automation="reviewTitle"]'
    REVIEW_TEXT        = '[data-automation="reviewText"], span.yCeTE'
    STAYED_DATE        = 'span.jXCrq, div.TDKzw, div:has(> div > span:has-text("Date of stay:")) > span'
    REVIEW_DATE        = 'div.biGQs._P.VImYz, div.RpeCd, div.ZRBpD'
    AUTHOR_NATIONALITY = 'div.biGQs._P.navcl, span.wiI7l'
    LIKES              = 'button[aria-label*="helpful vote"] span, button span.biGQs._P.navcl'
    RATING             = 'svg[data-automation="bubbleRatingImage"], svg[aria-label*="of 5 bubbles"]'
    IMAGES             = 'picture img, img[src*="media-cdn.tripadvisor.com"]'
    REPLY              = 'div:has-text("Response from")'

    # ── Sub-scores & Metadata ──
    CONTRIBUTION_COUNT = 'span.ydwaE, div.MfnQg, span.qVkLn' 
    READ_MORE_BTN      = 'span:has-text("Read more"), button.UikNM, button[aria-expanded="false"]'

tripadvisor_selectors = TripAdvisorSelectors()

