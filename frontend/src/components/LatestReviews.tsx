import { useState } from 'react';

import ReviewDetailModal from './ReviewDetailModal';

const LatestReviews = () => {
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
      reviewText: 'Absolutely wonderful experience! The staff was incredibly friendly and went above and beyond to make our stay memorable. The room was spotless, and the breakfast buffet exceeded all expectations. The location is perfect for exploring the city center.',
      categories: ['Staff', 'Cleanliness', 'Food', 'Location'],
      keyPhrases: ['wonderful experience', 'incredibly friendly', 'spotless', 'perfect location'],
      summary: 'Highly positive review praising staff, cleanliness, food quality, and location. Customer had an exceptional experience.',
      platformReviewId: 'BK-2951273',
      language: 'English',
      replyStatus: 'Replied',
      firstSeen: 'November 15, 2025 at 05:30 AM',
      lastUpdated: 'November 16, 2025 at 05:30 AM',
      scrapedAt: 'November 15, 2025 at 08:52 PM',
      hasReply: 'Yes',
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
      reviewText: 'Very disappointed with our stay. The room was not cleaned properly before check-in, and we found hair in the bathroom. The Wi-Fi was extremely slow, making it impossible to work.',
      categories: ['Cleanliness', 'WiFi'],
      keyPhrases: ['disappointed', 'not cleaned properly', 'extremely slow'],
      summary: 'Negative review highlighting cleanliness issues and poor WiFi connectivity.',
      platformReviewId: 'TA-8451923',
      language: 'English',
      replyStatus: 'Pending',
      firstSeen: 'November 14, 2025 at 10:15 PM',
      lastUpdated: 'November 14, 2025 at 10:15 PM',
      scrapedAt: 'November 14, 2025 at 11:30 PM',
      hasReply: 'No',
    },
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
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex justify-between items-center mb-5">
          <h3 className="m-0 text-base font-bold text-gray-800">Latest Reviews</h3>
          <button className="bg-none border-none text-blue-500 font-semibold text-sm cursor-pointer hover:underline">View All</button>
        </div>

        <div className="flex flex-col gap-4 mt-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="p-4 border border-gray-200 rounded-lg transition-all cursor-pointer hover:border-blue-500 hover:shadow-md hover:-translate-y-0.5"
              onClick={() => handleReviewClick(review)}
            >
              <div className="text-amber-400 text-base mb-2">
                {'★'.repeat(review.rating)}
                {'☆'.repeat(5 - review.rating)}
              </div>
              <p className="m-0 mb-2.5 text-sm font-semibold text-gray-800">{review.title}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-500">{review.source}</span>
                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${review.sentiment === 'Positive' ? 'bg-emerald-100 text-emerald-700' :
                  review.sentiment === 'Negative' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                  {review.sentiment}
                </span>
                <span className="text-xs text-gray-400">{review.time}</span>
              </div>
            </div>
          ))}
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
