import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReviewDetailModal from '../../ReviewDetailModal';
import type { Review } from '../../../types/dashboard';
import type { Review as DetailedReview } from '../../../types/reviews';
import { Card } from '../atoms/Card';
import { SectionHeader } from '../molecules/SectionHeader';

export interface LatestReviewsProps {
    reviews: Review[];
}

export const LatestReviews: React.FC<LatestReviewsProps> = ({ reviews }) => {
    const navigate = useNavigate();
    const [selectedReview, setSelectedReview] = useState<DetailedReview | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleReviewClick = (review: Review) => {
        setSelectedReview({
            id: review.id,
            rating: review.rating,
            userName: review.reviewerName,
            reviewText: review.reviewText,
            sentiment: review.sentiment,
            categories: review.categories || [],
            source: review.source,
            date: review.date,
            status: 'Pending' // Default fallback status
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedReview(null);
    };

    return (
        <>
            <Card hoverEffect className="shadow-sm p-6 flex flex-col h-full">
                <SectionHeader
                    title="Latest Reviews"
                    subtitle="Recent Feedback"
                    className="mb-6 items-center shrink-0"
                >
                    <button
                        className="flex items-center gap-1 text-blue-600 font-bold text-xs hover:text-blue-700 transition-colors group/btn cursor-pointer bg-transparent border-none"
                        onClick={() => navigate('/reviews')}
                    >
                        View All
                        <span className="group-hover/btn:translate-x-0.5 transition-transform">→</span>
                    </button>
                </SectionHeader>

                <div className="flex-1 overflow-y-auto no-scrollbar" style={{ maxHeight: '320px' }}>
                    <div className="flex flex-col gap-4">
                        {reviews.map((review) => (
                            <div
                                key={review.id}
                                className="p-4 border border-gray-100 dark:border-slate-700 rounded-lg transition-all cursor-pointer hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5 bg-white dark:bg-slate-800/80 group/item"
                                onClick={() => handleReviewClick(review)}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="text-amber-400 text-sm">
                                        {'★'.repeat(review.rating)}
                                        {'☆'.repeat(5 - review.rating)}
                                    </div>
                                    <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider">{review.time}</span>
                                </div>
                                <p className="m-0 mb-3 text-sm font-bold text-gray-800 dark:text-gray-200 leading-snug group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors">{review.title}</p>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100/50 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50">{review.source}</span>
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${review.sentiment === 'Positive' ? 'bg-green-50 text-[green] border-green-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50' :
                                        review.sentiment === 'Negative' ? 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/50' : 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                        }`}>
                                        {review.sentiment}
                                    </span>
                                    <div className="flex-1"></div>
                                    <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">{review.reviewerName.split(' ')[0]}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

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
