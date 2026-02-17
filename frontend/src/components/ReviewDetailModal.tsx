import { X, Image as ImageIcon } from "lucide-react";

interface ReviewDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: {
    id: string;
    reviewerName: string;
    rating: number;
    date: string;
    reviewText: string;
    sentiment: "Positive" | "Negative" | "Neutral";
    categories: string[];
    keyPhrases: string[];
    summary: string;
    platformReviewId: string;
    language: string;
    replyStatus: string;
    firstSeen: string;
    lastUpdated: string;
    scrapedAt: string;
    hasReply: string;
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
    <div className="fixed inset-0 bg-black/50 flex items-stretch justify-end z-[1000] overflow-x-hidden overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-none w-full max-w-[600px] h-screen flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.15)] overflow-hidden animate-slideInRight" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold text-gray-800 m-0">{review.reviewerName}</h2>
            <button className="bg-transparent border-none cursor-pointer p-1 text-gray-500 flex items-center justify-center rounded-md transition-colors duration-200 hover:bg-gray-100 hover:text-gray-800" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-yellow-400 text-base tracking-[2px]">
              {"★".repeat(review.rating)}
              {"☆".repeat(5 - review.rating)}
            </div>
            <span className="text-gray-500 text-sm">{review.date}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-6">
          {/* Review Text */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 m-0 mb-3">Review</h3>
            <p className="text-gray-800 text-[15px] leading-relaxed m-0 break-words italic">{review.reviewText}</p>
          </div>

          {review.photos && review.photos.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 m-0 mb-3">Images</h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 mt-3">
                {review.photos.map((photo) => (
                  <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
                    {photo.src ? (
                      <img
                        src={photo.src}
                        alt={photo.alt}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 text-gray-400 gap-1.5">
                        <ImageIcon size={24} className="text-gray-300" />
                        <span className="text-[11px] font-medium text-gray-400">
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
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 m-0 mb-3">AI Analysis</h3>

            <div className="flex gap-3 mb-4 items-start overflow-x-hidden">
              <span className="text-sm font-medium text-gray-500 min-w-[100px] flex-shrink-0">Sentiment</span>
              <span
                className="px-3 py-1 rounded-md text-[13px] font-medium"
                style={{
                  backgroundColor: getSentimentColor(review.sentiment),
                  color: "white",
                }}
              >
                {review.sentiment}
              </span>
            </div>

            <div className="flex gap-3 mb-4 items-start overflow-x-hidden">
              <span className="text-sm font-medium text-gray-500 min-w-[100px] flex-shrink-0">Categories</span>
              <div className="flex flex-wrap gap-2 flex-1">
                {review.categories.map((category, index) => (
                  <span key={index} className="px-3 py-1.5 rounded-md text-[13px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
                    {category}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mb-4 items-start overflow-x-hidden">
              <span className="text-sm font-medium text-gray-500 min-w-[100px] flex-shrink-0">Key Phrases</span>
              <div className="flex flex-wrap gap-2 flex-1">
                {review.keyPhrases.map((phrase, index) => (
                  <span key={index} className="px-3 py-1.5 rounded-md text-[13px] font-normal bg-blue-50 text-blue-800 border border-blue-200 break-words">
                    "{phrase}"
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-3 items-start overflow-x-hidden">
              <span className="text-sm font-medium text-gray-500 min-w-[100px] flex-shrink-0">Summary</span>
              <p className="text-gray-700 text-sm leading-relaxed m-0 flex-1 break-words">{review.summary}</p>
            </div>
          </div>

          {/* AI Reply Generator */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 m-0 mb-3">AI Reply Generator</h3>
            <div className="flex flex-col gap-3">
              <textarea
                className="w-full max-w-full px-3 py-3 border border-gray-300 rounded-lg text-sm resize-y min-h-[100px] box-border focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                placeholder="AI generated response will appear here..."
                rows={4}
              />
              <div className="flex gap-2 flex-wrap">
                <button className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 text-sm font-medium cursor-pointer flex items-center gap-1.5 transition-all duration-200 hover:bg-gray-50 hover:border-gray-400">
                  <span>🔄</span> Regenerate Reply
                </button>
                <button className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 text-sm font-medium cursor-pointer flex items-center gap-1.5 transition-all duration-200 hover:bg-gray-50 hover:border-gray-400">
                  <span>✨</span> Improve Tone
                </button>
                <button className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 text-sm font-medium cursor-pointer flex items-center gap-1.5 transition-all duration-200 hover:bg-gray-50 hover:border-gray-400">
                  <span>✂️</span> Shorten
                </button>
                <button className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 text-sm font-medium cursor-pointer flex items-center gap-1.5 transition-all duration-200 hover:bg-gray-50 hover:border-gray-400">
                  <span>📋</span> Copy Reply
                </button>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="mb-0">
            <h3 className="text-sm font-semibold text-gray-700 m-0 mb-3">Metadata</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-500">Review ID</span>
                <span className="text-sm text-gray-800">{review.id}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-500">Platform Review ID</span>
                <span className="text-sm text-gray-800">
                  {review.platformReviewId}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-500">Language</span>
                <span className="text-sm text-gray-800">{review.language}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-500">Reply Status</span>
                <span className="text-sm text-gray-800">{review.replyStatus}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-500">First Seen</span>
                <span className="text-sm text-gray-800">{review.firstSeen}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-500">Last Updated</span>
                <span className="text-sm text-gray-800">{review.lastUpdated}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-500">Scraped At</span>
                <span className="text-sm text-gray-800">{review.scrapedAt}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-500">Has AI Reply</span>
                <span className="text-sm text-gray-800">{review.hasReply}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
          <button className="px-5 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:border-gray-400" onClick={onClose}>
            Close
          </button>
          <button className="px-5 py-2.5 border-none rounded-lg bg-gray-800 text-white text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-gray-900">Mark as Replied</button>
          <button className="px-5 py-2.5 border-none rounded-lg bg-gray-800 text-white text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-gray-900">Save Changes</button>
        </div>
      </div>
    </div>
  );
};

export default ReviewDetailModal;
