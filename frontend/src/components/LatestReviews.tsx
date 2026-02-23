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
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col h-full shadow-sm">
        <div className="flex justify-between items-center mb-5 shrink-0">
          <h3 className="m-0 text-base font-bold text-gray-800">Latest Reviews</h3>
          <button
            className="bg-none border-none text-blue-500 font-semibold text-sm cursor-pointer hover:underline"
            onClick={() => navigate('/reviews')}
          >
            View All
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar" style={{ maxHeight: '300px' }}>
          <div className="flex flex-col gap-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="p-4 border border-gray-200 rounded-lg transition-all cursor-pointer hover:border-blue-500 hover:shadow-md hover:-translate-y-0.5 bg-white"
                onClick={() => handleReviewClick(review)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="text-amber-400 text-base">
                    {'★'.repeat(review.rating)}
                    {'☆'.repeat(5 - review.rating)}
                  </div>
                  <span className="text-xs text-gray-400 font-medium">{review.time}</span>
                </div>
                <p className="m-0 mb-3 text-sm font-semibold text-gray-800 leading-snug">{review.title}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-500">{review.source}</span>
                  <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${review.sentiment === 'Positive' ? 'bg-emerald-100 text-emerald-700' :
                    review.sentiment === 'Negative' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                    {review.sentiment}
                  </span>
                  <div className="flex-1"></div>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-tight">{review.reviewerName.split(' ')[0]}</span>
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
