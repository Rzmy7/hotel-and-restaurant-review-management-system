"""
TripAdvisor CSS selectors and configuration.
Update this file when TripAdvisor changes its DOM structure.
"""

class TripAdvisorSelectors:
    # ── Review list container ──
    REVIEW_CARD = 'div[data-automation="reviewCard"], div[data-test-target="HR_CC_CARD"]'

    # ── Within each review card ──
    REVIEWER_NAME    = 'a[href*="/Profile/"] span, span.biGQs, a.BMQDV._F.Gv.wSSLS.SwZTJ.FGwzt.ukgoS'
    REVIEWER_ORIGIN  = 'span.wiI7l, span.qVkLn > span.biGQs'       # e.g.  "Dubai, UAE"
    RATING_SVG       = 'svg[aria-label*="of 5 bubbles"], svg[data-automation="bubbleRatingImage"]'
    REVIEW_DATE      = 'div.RpeCd, div.ZRBpD'        # e.g.  "Reviewed Oct 2025"
    REVIEW_TITLE     = 'span[data-test-target="review-title"], a[href*="ShowUserReviews"] span, span.biGQs._P.SewaP.OgHoE, div[data-test-target="review-title"] span'
    REVIEW_TEXT_FULL = 'div.biGQs._P.pZUbB.KxBGd span.JguWG, div.v_S, div.biGQs._P.pZUbB.KxBGd span, div.fIrGe span.JguWG span'  # expanded text
    REVIEW_TEXT_SPAN = 'span.yCeTE, span.yNoPc'       # truncated text fallback
    READ_MORE_BTN    = 'button.UikNM, span.Vm7mi.DkWqh'        # "Read more" trigger
    TRIP_TYPE        = 'div.TDKzw span, div:has(> div > span:has-text("Trip type:")) > span'   # "Type of trip: ..."
    TRIP_DATE        = 'div.TDKzw, div:has(> div > span:has-text("Date of stay:")) > span'        # block containing Date of stay

    # ── Sub-scores & Metadata ──
    CONTRIBUTION_COUNT = 'span.ydwaE, div.MfnQg, span.qVkLn' # We will use text-based or generic span search
    SUBSCORES        = 'div[data-test-target="review-rating"]'   # Sub-rating rows container (if exists)
    SUBSCORES_ALT    = 'div.b.d.Pd, div.sziqa' # Fallbacks for sub-ratings container

    # Owner / management reply
    MGMT_REPLY       = 'div[data-test-target="management-response"]'
    MGMT_REPLY_TEXT  = 'div[data-test-target="management-response"] div.biGQs'

    # Photos on review cards
    REVIEW_PHOTO     = 'div.listPhoto img[src*="media-cdn.tripadvisor.com"]'

    # ── Page-level ──
    TOTAL_REVIEW_COUNT = 'span.khYLe, a[href*="#REVIEWS"] span'

    # ── Pagination ──
    NEXT_PAGE_BTN    = 'a[aria-label="Next page"]'
    CURRENT_PAGE_TXT = 'div.pageNum'      # fallback

tripadvisor_selectors = TripAdvisorSelectors()
