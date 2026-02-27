import { useState } from 'react';
import { Star, MessageSquareQuote, CheckCircle2, Bot, ArrowRight } from 'lucide-react';
import { useReviews } from '../contexts/ReviewsContext';
import type { Review } from '../types/reviews';

const PAGE_SIZE = 8;

const ReviewsTable = () => {
    const { filteredReviews, loading: isLoading, openReview } = useReviews();
    const [page, setPage] = useState(0);

    const totalPages = Math.max(1, Math.ceil(filteredReviews.length / PAGE_SIZE));
    const currentReviews = filteredReviews.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const getStatusBadge = (status: Review['status']) => {
        switch (status) {
            case 'Replied':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100/50">
                        <CheckCircle2 size={12} /> Replied
                    </span>
                );
            case 'AI Draft':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-600 border border-purple-100/50">
                        <Bot size={12} /> AI Draft
                    </span>
                );
            case 'Pending':
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100/50">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" /> Pending
                    </span>
                );
        }
    };

    const getSentimentStyles = (sentiment: Review['sentiment']) => {
        switch (sentiment) {
            case 'Positive': return 'text-emerald-500 bg-emerald-50 border-emerald-100';
            case 'Negative': return 'text-rose-500 bg-rose-50 border-rose-100';
            case 'Neutral': return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100/50">
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-[120px]">Rating</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest min-w-[300px]">Review Content</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-[140px]">Insights</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-[140px]">Source</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-[140px]">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-[100px] text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={6} className="px-6 py-6"><div className="h-12 bg-gray-50 rounded" /></td>
                                </tr>
                            ))
                        ) : currentReviews.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-20 text-center">
                                    <div className="flex flex-col items-center">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                                            <MessageSquareQuote size={32} />
                                        </div>
                                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-1">No Reviews Found</h3>
                                        <p className="text-sm text-gray-500">Adjust your filters or try a different search term.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            currentReviews.map((review: Review) => (
                                <tr key={review.id} className="group hover:bg-blue-50/30 transition-colors">
                                    {/* Rating */}
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex gap-0.5">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        size={14}
                                                        className={i < review.rating ? "fill-amber-400 text-amber-400" : "fill-gray-100 text-gray-200"}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{formatDate(review.date)}</span>
                                        </div>
                                    </td>

                                    {/* Review Content */}
                                    <td className="px-6 py-5">
                                        <div className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-500 uppercase">
                                                {review.userName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-[13px] font-black text-gray-900 mb-1 tracking-tight">{review.userName}</p>
                                                <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed pr-8">{review.reviewText}</p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Insights (Sentiment/Categories) */}
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col gap-2 items-start">
                                            <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${getSentimentStyles(review.sentiment)}`}>
                                                {review.sentiment}
                                            </span>
                                            {review.categories && review.categories.length > 0 && (
                                                <div className="flex gap-1 flex-wrap">
                                                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                                        {review.categories[0]}
                                                    </span>
                                                    {review.categories.length > 1 && (
                                                        <span className="text-[10px] font-bold text-gray-400">+{review.categories.length - 1}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* Source */}
                                    <td className="px-6 py-5">
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/50 border border-blue-100 text-[10px] font-black text-[#4e80ee] uppercase tracking-widest">
                                            {review.source}
                                        </div>
                                    </td>

                                    {/* Status */}
                                    <td className="px-6 py-5">
                                        {getStatusBadge(review.status)}
                                    </td>

                                    {/* Action */}
                                    <td className="px-6 py-5 text-right">
                                        <button
                                            onClick={() => openReview(review)}
                                            className="w-8 h-8 inline-flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-[#4e80ee] hover:border-blue-300 hover:shadow-sm transition-all group-hover:bg-blue-500 group-hover:text-white group-hover:border-blue-600"
                                            title="View Details"
                                        >
                                            <ArrowRight size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="mt-auto px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">
                    Showing <span className="text-gray-900">{filteredReviews.length === 0 ? 0 : page * PAGE_SIZE + 1}</span> to <span className="text-gray-900">{Math.min((page + 1) * PAGE_SIZE, filteredReviews.length)}</span> of <span className="text-gray-900">{filteredReviews.length}</span> reviews
                </p>
                <div className="flex items-center gap-2">
                    <button
                        disabled={page === 0}
                        onClick={() => setPage(p => p - 1)}
                        className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-all shadow-xs"
                    >
                        Previous
                    </button>
                    <button
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage(p => p + 1)}
                        className="px-4 py-2 text-[13px] font-black text-white bg-[#4e80ee] rounded-xl hover:bg-blue-600 disabled:opacity-40 disabled:hover:bg-[#4e80ee] transition-all shadow-lg shadow-blue-200 uppercase tracking-wider"
                    >
                        Next Page
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReviewsTable;
