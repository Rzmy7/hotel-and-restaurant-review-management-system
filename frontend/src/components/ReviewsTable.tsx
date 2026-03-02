import { useState } from 'react';
import { Star, MessageSquareQuote, CheckCircle2, Bot, MoreHorizontal } from 'lucide-react';
import { useReviews } from '../contexts/ReviewsContext';
import type { Review } from '../types/reviews';

const PAGE_SIZE = 15;

const ReviewsTable = () => {
    const { filteredReviews, loading: isLoading, openReview } = useReviews();
    const [page, setPage] = useState(0);
    const [jumpPage, setJumpPage] = useState('');

    const totalPages = Math.max(1, Math.ceil(filteredReviews.length / PAGE_SIZE));
    const currentReviews = filteredReviews.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const renderPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxPagesToShow = 5;

        if (totalPages <= maxPagesToShow + 2) {
            for (let i = 0; i < totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(0);

            let start = Math.max(1, page - 1);
            let end = Math.min(totalPages - 2, page + 1);

            // Adjust start/end to always show roughly the same number of keys
            if (page <= 2) {
                end = 3;
            } else if (page >= totalPages - 3) {
                start = totalPages - 4;
            }

            if (start > 1) {
                pages.push('...');
            }

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (end < totalPages - 2) {
                pages.push('...');
            }

            // Always show last page
            pages.push(totalPages - 1);
        }

        return pages.map((p, index) => {
            if (p === '...') {
                return (
                    <div key={`ellipsis-${index}`} className="w-8 h-8 flex items-center justify-center text-gray-400">
                        <MoreHorizontal size={16} />
                    </div>
                );
            }

            const pageNum = p as number;
            return (
                <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-[13px] font-bold transition-all ${page === pageNum
                        ? 'bg-[#4e80ee] text-white shadow-md shadow-blue-200'
                        : 'text-gray-600 hover:bg-gray-100 border border-transparent hover:border-gray-200'
                        }`}
                >
                    {pageNum + 1}
                </button>
            );
        });
    };

    const handleJumpPage = (e: React.FormEvent) => {
        e.preventDefault();
        const pageNum = parseInt(jumpPage) - 1;
        if (!isNaN(pageNum) && pageNum >= 0 && pageNum < totalPages) {
            setPage(pageNum);
            setJumpPage('');
        }
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col min-h-[500px]">
            <div className="w-full">
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
                            currentReviews.map((review: Review, rowIndex) => {
                                const isLastRows = rowIndex >= currentReviews.length - 3;

                                return (
                                    <tr
                                        key={review.id}
                                        onClick={() => openReview(review)}
                                        className="group hover:bg-blue-50/30 transition-colors cursor-pointer relative hover:z-50"
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
                                                            <div className={`absolute ${isLastRows ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 hidden group-hover/cat:flex flex-col gap-1 w-max p-2 z-[60] bg-gray-900 border border-gray-800 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200`}>
                                                                <div className={`absolute ${isLastRows ? '-bottom-1.5' : '-top-1.5'} left-4 w-3 h-3 bg-gray-900 rotate-45 ${isLastRows ? 'border-r border-b' : 'border-l border-t'} border-gray-800`} />
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
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="mt-auto px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">
                    Showing <span className="text-gray-900">{filteredReviews.length === 0 ? 0 : page * PAGE_SIZE + 1}</span> to <span className="text-gray-900">{Math.min((page + 1) * PAGE_SIZE, filteredReviews.length)}</span> of <span className="text-gray-900">{filteredReviews.length}</span> reviews
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mt-4 sm:mt-0">
                    {/* Jump to Page */}
                    {totalPages > 5 && (
                        <form onSubmit={handleJumpPage} className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Go to:</span>
                            <input
                                type="text"
                                value={jumpPage}
                                onChange={(e) => setJumpPage(e.target.value)}
                                placeholder="Pg"
                                className="w-12 h-8 px-2 text-center text-[12px] font-bold bg-white border border-gray-200 rounded-lg outline-none focus:border-[#4e80ee] focus:ring-2 focus:ring-blue-50 transition-all text-gray-700"
                            />
                        </form>
                    )}

                    {/* Controls */}
                    <div className="flex items-center gap-1.5 flex-wrap justify-center">
                        <button
                            disabled={page === 0}
                            onClick={() => setPage(p => p - 1)}
                            className="px-3 sm:px-4 py-1.5 sm:py-2 text-[12px] sm:text-[13px] font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-all shadow-sm"
                        >
                            Prev
                        </button>

                        <div className="flex items-center gap-1 mx-1 sm:mx-2">
                            {renderPageNumbers()}
                        </div>

                        <button
                            disabled={page >= totalPages - 1}
                            onClick={() => setPage(p => p + 1)}
                            className="px-3 sm:px-4 py-1.5 sm:py-2 text-[12px] sm:text-[13px] font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-all shadow-sm"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewsTable;
