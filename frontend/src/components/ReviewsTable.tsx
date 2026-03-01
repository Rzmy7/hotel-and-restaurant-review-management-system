import { useState } from 'react';
import { Star, MessageSquareQuote, CheckCircle2, Bot } from 'lucide-react';
import { useReviews } from '../contexts/ReviewsContext';
import type { Review } from '../types/reviews';

const PAGE_SIZE = 15;

const ReviewsTable = () => {
    const { filteredReviews, loading: isLoading, openReview } = useReviews();
    const [page, setPage] = useState(0);

    const totalPages = Math.max(1, Math.ceil(filteredReviews.length / PAGE_SIZE));
    const currentReviews = filteredReviews.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const renderPageNumbers = () => {
        const pages = [];
        let start = Math.max(0, page - 2);
        let end = Math.min(totalPages - 1, page + 2);

        if (totalPages > 5) {
            if (page <= 2) end = 4;
            if (page >= totalPages - 3) start = totalPages - 5;
        }

        for (let i = start; i <= end; i++) {
            pages.push(
                <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-[13px] font-bold transition-all ${page === i
                            ? 'bg-[#4e80ee] text-white shadow-md shadow-blue-200'
                            : 'text-gray-600 hover:bg-gray-100 border border-transparent hover:border-gray-200'
                        }`}
                >
                    {i + 1}
                </button>
            );
        }
        return pages;
    };

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
                                <tr
                                    key={review.id}
                                    onClick={() => openReview(review)}
                                    className="group hover:bg-blue-50/30 transition-colors cursor-pointer"
                                >
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
                                                <div className="flex gap-1 flex-wrap relative group/cat z-10 w-fit">
                                                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                                        {review.categories[0]}
                                                    </span>
                                                    {review.categories.length > 1 && (
                                                        <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full cursor-help hover:text-gray-600 transition-colors border border-gray-100">
                                                            +{review.categories.length - 1}
                                                        </span>
                                                    )}

                                                    {/* Tooltip for all categories */}
                                                    {review.categories.length > 1 && (
                                                        <div className="absolute top-full left-0 mt-1.5 hidden group-hover/cat:flex flex-col gap-1 w-max p-2 bg-gray-900 border border-gray-800 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200">
                                                            <div className="absolute -top-1.5 left-4 w-3 h-3 bg-gray-900 rotate-45 border-l border-t border-gray-800" />
                                                            {review.categories.map((cat, i) => (
                                                                <span key={i} className="text-[11px] font-bold text-gray-200 relative z-10">
                                                                    {cat}
                                                                </span>
                                                            ))}
                                                        </div>
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
                        className="px-4 py-2 text-[13px] font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-all shadow-sm"
                    >
                        Prev
                    </button>

                    <div className="flex items-center gap-1 mx-2">
                        {renderPageNumbers()}
                    </div>

                    <button
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage(p => p + 1)}
                        className="px-4 py-2 text-[13px] font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-all shadow-sm"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReviewsTable;
