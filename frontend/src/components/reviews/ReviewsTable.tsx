import { MessageSquareQuote } from 'lucide-react';
import { useReviewsStore } from '../../stores/useReviewsStore';
import { useReviewFilters } from '../../hooks/useReviewFilters';
import ReviewsTableHeader from './ReviewsTableHeader';
import ReviewsTableRow from './ReviewsTableRow';
import ReviewsTablePagination from './ReviewsTablePagination';
import type { Review } from '../../types/reviews';

const ReviewsTable = () => {
    const reviews = useReviewsStore(state => state.reviews);
    const loading = useReviewsStore(state => state.loading);
    const pagination = useReviewsStore(state => state.pagination);
    const openReview = useReviewsStore(state => state.openReview);
    const { setPage } = useReviewFilters();
    const { page, totalPages, limit, total } = pagination;
    const currentReviews = reviews;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col min-h-[500px]">
            <div className="w-full">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                    <ReviewsTableHeader />
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={6} className="px-6 py-6"><div className="h-12 bg-gray-50 dark:bg-slate-700 rounded" /></td>
                                </tr>
                            ))
                        ) : currentReviews.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-20 text-center">
                                    <div className="flex flex-col items-center">
                                        <div className="w-16 h-16 bg-gray-50 dark:bg-slate-700 rounded-full flex items-center justify-center text-gray-300 dark:text-slate-500 mb-4">
                                            <MessageSquareQuote size={32} />
                                        </div>
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1">No Reviews Found</h3>
                                        <p className="text-sm text-gray-500 dark:text-slate-400">Adjust your filters or try a different search term.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            currentReviews.map((review: Review, rowIndex) => {
                                const isLastRows = rowIndex >= currentReviews.length - 3;

                                return (
                                    <ReviewsTableRow
                                        key={review.id}
                                        review={review}
                                        isLastRows={isLastRows}
                                        onClick={openReview}
                                    />
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <ReviewsTablePagination
                page={page}
                limit={limit}
                total={total}
                totalPages={totalPages}
                onPageChange={setPage}
            />
        </div>
    );
};

export default ReviewsTable;
