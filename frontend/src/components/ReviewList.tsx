import { useReviews } from "../contexts/ReviewsContext";
import ReviewItem from "./ReviewItem";
import ReviewDetailModal from "./ReviewDetailModal";

const ReviewList = () => {
  const {
    filteredReviews,
    loading,
    error,
    selectedReview,
    isModalOpen,
    openReview,
    closeReview
  } = useReviews();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-sm text-gray-500">Loading reviews...</span>
      </div>
    );
  }

  // Render Error State
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 mx-6 my-4">
        <p className="text-red-700 text-sm font-medium m-0">{error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* HEADER ROW */}
        <div className="grid grid-cols-[60px_3fr_1fr_1.2fr_1fr_1fr_1fr_80px] gap-4 items-start px-6 py-4 bg-gray-50 border-b border-gray-200 rounded-t-lg">
          <div className="text-[11px] font-semibold text-gray-500 tracking-[0.5px] uppercase">RATING</div>
          <div className="text-[11px] font-semibold text-gray-500 tracking-[0.5px] uppercase">REVIEW SNIPPET</div>
          <div className="text-[11px] font-semibold text-gray-500 tracking-[0.5px] uppercase">SENTIMENT</div>
          <div className="text-[11px] font-semibold text-gray-500 tracking-[0.5px] uppercase">CATEGORY</div>
          <div className="text-[11px] font-semibold text-gray-500 tracking-[0.5px] uppercase">SOURCE</div>
          <div className="text-[11px] font-semibold text-gray-500 tracking-[0.5px] uppercase">DATE</div>
          <div className="text-[11px] font-semibold text-gray-500 tracking-[0.5px] uppercase">REPLY STATUS</div>
          <div className="text-[11px] font-semibold text-gray-500 tracking-[0.5px] uppercase">ACTIONS</div>
        </div>

        {/* DATA ROWS */}
        <div>
          {filteredReviews.length > 0 ? (
            filteredReviews.map((review) => (
              <ReviewItem
                key={review.id}
                review={review as any}
                onOpen={() => openReview(review)}
              />
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              No reviews found matching your filters.
            </div>
          )}
        </div>
      </div>

      {selectedReview && (
        <ReviewDetailModal
          isOpen={isModalOpen}
          onClose={closeReview}
          review={selectedReview as any}
        />
      )}
    </>
  );
};

export default ReviewList;
