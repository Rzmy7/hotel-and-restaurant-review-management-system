import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import ReviewDetailModal from './ReviewDetailModal';

const LatestReviews = () => {
  const navigate = useNavigate();
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const reviews = [
    {
      id: 'REV-001',
      reviewerName: 'Sarah Johnson',
      title: 'Exceptional service and beautiful rooms…',
      source: 'Booking',
      sentiment: 'Positive' as const,
      time: '2h ago',
      rating: 5,
      date: 'November 15, 2025 at 05:30 AM',
      reviewText: 'Absolutely wonderful experience! The staff was incredibly friendly and went above and beyond to make our stay memorable. The room was spotless, and the breakfast buffet exceeded all expectations.',
      categories: ['Staff', 'Cleanliness', 'Food', 'Location'],
    },
    {
      id: 'REV-002',
      reviewerName: 'Michael Chen',
      title: 'Wi-Fi connection was terrible…',
      source: 'TripAdvisor',
      sentiment: 'Negative' as const,
      time: '9h ago',
      rating: 2,
      date: 'November 14, 2025 at 10:15 PM',
      reviewText: 'Very disappointed with our stay. The room was not cleaned properly before check-in, and we found hair in the bathroom. The Wi-Fi was extremely slow.',
      categories: ['Cleanliness', 'WiFi'],
    },
    {
      id: 'REV-003',
      reviewerName: 'Emma Wilson',
      title: 'Perfect location for sightseeing',
      source: 'Google',
      sentiment: 'Positive' as const,
      time: '1d ago',
      rating: 4,
      date: 'November 13, 2025 at 02:20 PM',
      reviewText: 'The hotel is located right in the heart of the city. Most attractions are within walking distance.',
      categories: ['Location'],
    },
    {
      id: 'REV-004',
      reviewerName: 'David Miller',
      title: 'Breakfast was underwhelming',
      source: 'Expedia',
      sentiment: 'Neutral' as const,
      time: '2d ago',
      rating: 3,
      date: 'November 12, 2025 at 08:45 AM',
      reviewText: 'Overall a decent stay, but the breakfast selection was quite limited. Staff were helpful though.',
      categories: ['Food', 'Staff'],
    },
    {
      id: 'REV-005',
      reviewerName: 'Sophia Garcia',
      title: 'Very professional staff',
      source: 'Booking',
      sentiment: 'Positive' as const,
      time: '3d ago',
      rating: 5,
      date: 'November 11, 2025 at 11:30 AM',
      reviewText: 'From the moment we arrived, we were treated like royalty. The concierge was particularly helpful.',
      categories: ['Staff'],
    },
    {
      id: 'REV-006',
      reviewerName: 'James Taylor',
      title: 'Noise issues at night',
      source: 'TripAdvisor',
      sentiment: 'Negative' as const,
      time: '4d ago',
      rating: 2,
      date: 'November 10, 2025 at 01:10 AM',
      reviewText: 'Hard to sleep because of the street noise. The windows aren\'t well soundproofed.',
      categories: ['Comfort'],
    },
    {
      id: 'REV-007',
      reviewerName: 'Olivia Brown',
      title: 'Highly recommended for families',
      source: 'Google',
      sentiment: 'Positive' as const,
      time: '5d ago',
      rating: 5,
      date: 'November 9, 2025 at 10:00 AM',
      reviewText: 'Great amenities for kids. The pool area is safe and clean.',
      categories: ['Facilities'],
    }
  ];

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
                <p className="m-0 mb-3 text-sm font-bold text-gray-800 leading-snug group-hover/item:text-blue-600 transition-colors">{review.title}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100/50">{review.source}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${review.sentiment === 'Positive' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
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
          review={selectedReview}
        />
      )}
    </>
  );
};

export default LatestReviews;
