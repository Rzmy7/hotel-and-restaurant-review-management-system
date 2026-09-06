import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import ReviewDetailModal from '../../reviews/ReviewDetailModal';
import type { Review } from '../../../types/dashboard';
import type { Review as DetailedReview } from '../../../types/reviews';
import { Card } from '../atoms/Card';
import { SectionHeader } from '../molecules/SectionHeader';
import { useReviewsStore } from '../../../stores/useReviewsStore';
import { useReviewerNamesVisibility } from '../../../hooks/useReviewerNamesVisibility';

export interface LatestReviewsProps {
    reviews: Review[];
}

export const LatestReviews: React.FC<LatestReviewsProps> = ({ reviews }) => {
    const isReviewerNamesVisible = useReviewerNamesVisibility();
    const navigate = useNavigate();
    const openReview = useReviewsStore(state => state.openReview);
    const selectedReview = useReviewsStore(state => state.selectedReview);
    const isModalOpen = useReviewsStore(state => state.isModalOpen);
    const closeReview = useReviewsStore(state => state.closeReview);

    const handleReviewClick = (review: Review) => {
        openReview({
            id: review.id,
            rating: review.rating,
            userName: review.reviewerName || 'Anonymous',
            reviewText: review.reviewText,
            heading: review.heading,
            sentiment: review.sentiment,
            categories: review.categories || [],
            source: review.source,
            date: review.date,
            status: 'pending' // Default fallback status
        });
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
                    {reviews.length === 0 ? (
                        <div className="h-full min-h-[240px] flex flex-col items-center justify-center gap-3 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center">
                                <MessageSquare size={20} className="text-gray-300 dark:text-slate-600" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-gray-700 dark:text-white uppercase tracking-wide">No Customer Reviews Available</p>
                                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                                    Reviews will appear here once customer feedback is collected.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {reviews.map((review, index) => (
                                <div
                                    key={review.id}
                                    className="staggered-item p-4 border border-gray-100 dark:border-slate-700 rounded-lg transition-all cursor-pointer hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5 bg-white dark:bg-slate-800/80 group/item"
                                    style={{ animationDelay: `${index * 0.05}s` }}
                                    onClick={() => handleReviewClick(review)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="text-amber-400 text-sm">
                                            {'★'.repeat(review.rating)}
                                            {'☆'.repeat(5 - review.rating)}
                                        </div>
                                        <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider">{review.time}</span>
                                    </div>
                                    <p className="m-0 mb-3 text-sm font-bold text-gray-800 dark:text-gray-200 leading-snug group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors">{review.heading}</p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100/50 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50">{review.source}</span>
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${review.sentiment === 'Positive' ? 'bg-green-50 text-[green] border-green-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50' :
                                            review.sentiment === 'Negative' ? 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/50' : 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                            }`}>
                                            {review.sentiment}
                                        </span>
                                        <div className="flex-1"></div>
                                        <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                                            {isReviewerNamesVisible ? (review.reviewerName || 'Anonymous').split(' ')[0] : 'Anonymous'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Card>

            {selectedReview && (
                <ReviewDetailModal
                    isOpen={isModalOpen}
                    onClose={closeReview}
                    review={selectedReview}
                    allReviews={reviews as any}
                />
            )}
        </>
    );
};

export default LatestReviews;
