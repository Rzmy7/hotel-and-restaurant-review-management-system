import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReviewDetailModal from '../reviews/ReviewDetailModal';
import type { Review } from '../../types/dashboard';

interface LatestReviewsProps {
  reviews: Review[];
}

const LatestReviews = ({ reviews }: LatestReviewsProps) => {
  const navigate = useNavigate();
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleReviewClick = (review: any) => {
    setSelectedReview(review);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedReview(null);
  };

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-xl p-6 flex flex-col h-full shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div>
            <h3 className="m-0 text-sm font-black text-gray-700 uppercase tracking-widest">Latest Reviews</h3>
            <p className="m-0 text-[10px] text-gray-400 font-bold uppercase tracking-wider">Recent Feedback</p>
          </div>
          <button
            className="flex items-center gap-1 text-blue-600 font-bold text-xs hover:text-blue-700 transition-colors group/btn cursor-pointer bg-transparent border-none"
            onClick={() => navigate('/reviews')}
          >
            View All
            <span className="group-hover/btn:translate-x-0.5 transition-transform">→</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar" style={{ maxHeight: '320px' }}>
          <div className="flex flex-col gap-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="p-4 border border-gray-100 rounded-lg transition-all cursor-pointer hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5 bg-white group/item"
                onClick={() => handleReviewClick(review)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="text-amber-400 text-sm">
                    {'★'.repeat(review.rating)}
                    {'☆'.repeat(5 - review.rating)}
                  </div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{review.time}</span>
                </div>
                <p className="m-0 mb-3 text-sm font-bold text-gray-800 leading-snug group-hover/item:text-blue-600 transition-colors">{review.heading}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100/50">{review.source}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${review.sentiment === 'Positive' ? 'bg-green-50 text-[green] border-green-100' :
                    review.sentiment === 'Negative' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-slate-50 text-slate-700 border-slate-100'
                    }`}>
                    {review.sentiment}
                  </span>
                  <div className="flex-1"></div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{review.reviewerName.split(' ')[0]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedReview && (
        <ReviewDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          review={selectedReview as any}
        />
      )}
    </>
  );
};

export default LatestReviews;
