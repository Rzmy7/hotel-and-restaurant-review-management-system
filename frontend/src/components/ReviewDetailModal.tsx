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

  const getSentimentClasses = (sentiment: string) => {
    switch (sentiment) {
      case "Positive":
        return "bg-emerald-500 text-white";
      case "Negative":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  console.log("Review Details:", review);
  for (const photo of review.photos || []) {
    console.log("Photo URL:", photo.src);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-stretch justify-end z-[1000] overflow-x-hidden overflow-y-auto" onClick={onClose}>
      <div className="bg-white w-full max-w-[600px] h-full flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.15)] overflow-hidden animate-[slideInRight_0.3s_ease-out] max-md:max-w-full" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 px-6 pb-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold text-gray-800 m-0">{review.reviewerName}</h2>
            <button className="bg-transparent border-none cursor-pointer p-1 text-gray-500 flex items-center justify-center rounded-md hover:bg-gray-100 hover:text-gray-800 transition-colors" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-amber-400 text-base tracking-widest">
              {"★".repeat(review.rating)}
              {"☆".repeat(5 - review.rating)}
            </div>
            <span className="text-gray-500 text-sm">{review.date}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6">
          {/* Review Text */}
          <div className="mb-6 last:mb-0">
            <h3 className="text-sm font-semibold text-gray-700 m-0 mb-3">Review</h3>
            {/* <p className="review-text">{review.reviewText}</p> */}
            <p className="text-gray-800 text-[15px] leading-relaxed m-0 break-words italic">{review.reviewText}</p>
          </div>

          {review.photos && review.photos.length > 0 && (
            <div className="mb-6 last:mb-0">
              <h3 className="text-sm font-semibold text-gray-700 m-0 mb-3">Images</h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 mt-3">
                {review.photos?.map((photo) => (
                  <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 cursor-pointer transition-all hover:scale-105 hover:shadow-lg">
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
          <div className="mb-6 last:mb-0">
            <h3 className="text-sm font-semibold text-gray-700 m-0 mb-3">AI Analysis</h3>

            <div className="flex gap-3 mb-4 items-start overflow-x-hidden last:mb-0">
              <span className="text-sm font-medium text-gray-500 min-w-[100px] shrink-0">Sentiment</span>
              <span
                className={`px-3 py-1 rounded-md text-[13px] font-medium ${getSentimentClasses(review.sentiment)}`}
              >
                {review.sentiment}
              </span>
            </div>

            <div className="flex gap-3 mb-4 items-start overflow-x-hidden last:mb-0">
              <span className="text-sm font-medium text-gray-500 min-w-[100px] shrink-0">Categories</span>
              <div className="flex flex-wrap gap-2 flex-1">
                {review.categories.map((category, index) => (
                  <span key={index} className="px-3 py-1.5 rounded-md text-[13px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
                    {category}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mb-4 items-start overflow-x-hidden last:mb-0">
              <span className="text-sm font-medium text-gray-500 min-w-[100px] shrink-0">Key Phrases</span>
              <div className="flex flex-wrap gap-2 flex-1">
                {review.keyPhrases.map((phrase, index) => (
                  <span key={index} className="px-3 py-1.5 rounded-md text-[13px] font-normal bg-blue-50 text-blue-800 border border-blue-100 break-words">
                    "{phrase}"
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mb-4 items-start overflow-x-hidden last:mb-0">
              <span className="text-sm font-medium text-gray-500 min-w-[100px] shrink-0">Summary</span>
              <p className="text-gray-700 text-sm leading-relaxed m-0 flex-1 break-words">{review.summary}</p>
            </div>
          </div>

          {/* AI Reply Generator */}
          <div className="mb-6 last:mb-0">
            <h3 className="text-sm font-semibold text-gray-700 m-0 mb-3">AI Reply Generator</h3>
            <div className="flex flex-col gap-3">
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg text-sm min-h-[100px] focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 box-border resize-y font-inherit"
                placeholder="AI generated response will appear here..."
                rows={4}
              />
              <div className="flex gap-2 flex-wrap max-md:flex-col">
                <button className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 text-sm font-medium cursor-pointer flex items-center gap-1.5 transition-all hover:bg-gray-50 hover:border-gray-400 max-md:w-full max-md:justify-center">
                  <span>🔄</span> Regenerate Reply
                </button>
                <button className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 text-sm font-medium cursor-pointer flex items-center gap-1.5 transition-all hover:bg-gray-50 hover:border-gray-400 max-md:w-full max-md:justify-center">
                  <span>✨</span> Improve Tone
                </button>
                <button className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 text-sm font-medium cursor-pointer flex items-center gap-1.5 transition-all hover:bg-gray-50 hover:border-gray-400 max-md:w-full max-md:justify-center">
                  <span>✂️</span> Shorten
                </button>
                <button className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 text-sm font-medium cursor-pointer flex items-center gap-1.5 transition-all hover:bg-gray-50 hover:border-gray-400 max-md:w-full max-md:justify-center">
                  <span>📋</span> Copy Reply
                </button>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="mb-6 last:mb-0">
            <h3 className="text-sm font-semibold text-gray-700 m-0 mb-3">Metadata</h3>
            <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
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
        <div className="p-4 px-6 border-t border-gray-200 flex gap-3 justify-end max-md:flex-col">
          <button className="px-5 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm font-medium cursor-pointer transition-all hover:bg-gray-50 hover:border-gray-400 max-md:w-full" onClick={onClose}>
            Cancel
          </button>
          <button className="px-5 py-2.5 border-none rounded-lg bg-blue-500 text-white text-sm font-medium cursor-pointer transition-all hover:bg-blue-600 max-md:w-full">Mark as Replied</button>
          <button className="px-5 py-2.5 border-none rounded-lg bg-blue-500 text-white text-sm font-medium cursor-pointer transition-all hover:bg-blue-600 max-md:w-full">Save Changes</button>
        </div>
      </div>
    </div>
  );
};

export default ReviewDetailModal;
