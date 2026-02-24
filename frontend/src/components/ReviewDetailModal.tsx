import { X, Image as ImageIcon } from "lucide-react";
import "./ReviewDetailModal.css";

interface ReviewDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: {
    id: string | number;
    reviewerName?: string;
    userName?: string;
    rating: number;
    date: string;
    reviewText: string;
    sentiment: "Positive" | "Negative" | "Neutral";
    categories: string[];
    keyPhrases?: string[];
    summary?: string;
    platformReviewId?: string;
    language?: string;
    replyStatus?: string;
    firstSeen?: string;
    lastUpdated?: string;
    scrapedAt?: string;
    hasReply?: string;
    photos?: { id: number; src: string; alt: string }[];
  };
}

const ReviewDetailModal = ({
  isOpen,
  onClose,
  review,
}: ReviewDetailModalProps) => {
  if (!isOpen) return null;

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "Positive":
        return "#10b981";
      case "Negative":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  console.log("Review Details:", review);
  for (const photo of review.photos || []) {
    console.log("Photo URL:", photo.src);
  }

  return (
    <div className="review-modal-overlay" onClick={onClose}>
      <div className="review-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="review-modal-header">
          <div className="review-modal-title">
            <h2>{review.reviewerName || review.userName || "Guest"}</h2>
            <button className="close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          <div className="review-rating-date">
            <div className="stars">
              {"★".repeat(review.rating)}
              {"☆".repeat(5 - review.rating)}
            </div>
            <span className="review-date">{review.date}</span>
          </div>
        </div>

        {/* Content */}
        <div className="review-modal-content">
          {/* Review Text */}
          <div className="review-section">
            <h3 className="section-label">Review</h3>
            {/* <p className="review-text">{review.reviewText}</p> */}
            <p className="raw-review">{review.reviewText}</p>
          </div>

          {review.photos && review.photos.length > 0 && (
            <div className="review-section">
              <h3 className="section-label">Images</h3>
              <div className="review-images-grid">
                {review.photos.map((photo) => (
                  <div key={photo.id} className="review-image-item">
                    {photo.src ? (
                      <img
                        src={photo.src}
                        alt={photo.alt}
                        className="review-image"
                      />
                    ) : (
                      <div className="review-image-placeholder">
                        <ImageIcon size={24} className="placeholder-icon" />
                        <span className="placeholder-text">
                          Image {photo.id}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Analysis */}
          <div className="review-section">
            <h3 className="section-label">AI Analysis</h3>

            <div className="analysis-item">
              <span className="analysis-label">Sentiment</span>
              <span
                className="sentiment-badge"
                style={{
                  backgroundColor: getSentimentColor(review.sentiment),
                  color: "white",
                }}
              >
                {review.sentiment}
              </span>
            </div>

            <div className="analysis-item">
              <span className="analysis-label">Categories</span>
              <div className="categories-badges">
                {review.categories.map((category, index) => (
                  <span key={index} className="category-badge">
                    {category}
                  </span>
                ))}
              </div>
            </div>

            <div className="analysis-item">
              <span className="analysis-label">Key Phrases</span>
              <div className="key-phrases">
                {(review.keyPhrases ?? []).map((phrase, index) => (
                  <span key={index} className="key-phrase">
                    "{phrase}"
                  </span>
                ))}
              </div>
            </div>

            <div className="analysis-item">
              <span className="analysis-label">Summary</span>
              <p className="summary-text">{review.summary || "No summary available."}</p>
            </div>
          </div>

          {/* AI Reply Generator */}
          <div className="review-section">
            <h3 className="section-label">AI Reply Generator</h3>
            <div className="reply-generator">
              <textarea
                className="reply-textarea"
                placeholder="AI generated response will appear here..."
                rows={4}
              />
              <div className="reply-actions">
                <button className="action-btn">
                  <span>🔄</span> Regenerate Reply
                </button>
                <button className="action-btn">
                  <span>✨</span> Improve Tone
                </button>
                <button className="action-btn">
                  <span>✂️</span> Shorten
                </button>
                <button className="action-btn">
                  <span>📋</span> Copy Reply
                </button>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="review-section">
            <h3 className="section-label">Metadata</h3>
            <div className="metadata-grid">
              <div className="metadata-item">
                <span className="metadata-label">Review ID</span>
                <span className="metadata-value">{review.id}</span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Platform Review ID</span>
                <span className="metadata-value">
                  {review.platformReviewId || "-"}
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Language</span>
                <span className="metadata-value">{review.language || "-"}</span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Reply Status</span>
                <span className="metadata-value">{review.replyStatus || "-"}</span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">First Seen</span>
                <span className="metadata-value">{review.firstSeen || "-"}</span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Last Updated</span>
                <span className="metadata-value">{review.lastUpdated || "-"}</span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Scraped At</span>
                <span className="metadata-value">{review.scrapedAt || "-"}</span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Has AI Reply</span>
                <span className="metadata-value">{review.hasReply || "-"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="review-modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn-primary">Mark as Replied</button>
          <button className="btn-primary">Save Changes</button>
        </div>
      </div>
    </div>
  );
};

export default ReviewDetailModal;
