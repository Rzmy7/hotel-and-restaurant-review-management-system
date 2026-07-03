import { Star, CheckCircle2, Bot, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Review } from '../../types/reviews';

interface ReviewsTableRowProps {
    review: Review;
    isLastRows: boolean;
    onClick: (review: Review) => void;
    index: number;
}

const ReviewsTableRow = ({ review, isLastRows, onClick, index }: ReviewsTableRowProps) => {
    const navigate = useNavigate();
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getSentimentStyles = (sentiment: Review['sentiment']) => {
        switch (sentiment) {
            case 'Positive': return 'text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/40 border-emerald-100 dark:border-emerald-800';
            case 'Negative': return 'text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/40 border-rose-100 dark:border-rose-800';
            case 'Neutral': return 'text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700';
        }
    };

    const getStatusBadge = (status: Review['status'], hasReply: boolean) => {
        if (hasReply) {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-800/50">
                    <CheckCircle2 size={12} /> Replied
                </span>
            );
        }

        switch (status) {
            case 'processed':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 border border-purple-100/50 dark:border-purple-800/50">
                        <Bot size={12} /> AI Ready
                    </span>
                );
            case 'pending':
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 border border-amber-100/50 dark:border-amber-800/50">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" /> Pending
                    </span>
                );
        }
    };

    return (
        <tr
            onClick={() => onClick(review)}
            className="staggered-item premium-row group hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-colors cursor-pointer relative hover:z-50"
            style={{ animationDelay: `${index * 0.05}s` }}
        >
            {/* Rating */}
            <td className="px-6 py-5">
                <div className="flex flex-col gap-1.5">
                    <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                                key={i}
                                size={14}
                                className={i < review.rating ? "fill-amber-400 text-amber-400" : "fill-gray-100 dark:fill-slate-700 text-gray-200 dark:text-slate-600"}
                            />
                        ))}
                    </div>
                    <span className="text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">{formatDate(review.date)}</span>
                </div>
            </td>

            {/* Review Content */}
            <td className="px-6 py-5">
                <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-500 dark:text-slate-300 uppercase">
                        {review.userName.charAt(0)}
                    </div>
                    <div>
                        <p className="text-[13px] font-black text-gray-900 dark:text-white mb-1 tracking-tight">{review.userName}</p>
                        {review.heading && (
                            <p className="text-[12px] font-black text-gray-800 dark:text-gray-200 mb-1 leading-tight line-clamp-1">{review.heading}</p>
                        )}
                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed pr-8">{review.reviewText}</p>
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
                            <span className="text-[10px] font-bold text-gray-500 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                                {review.categories[0]}
                            </span>
                            {review.categories.length > 1 && (
                                <span className="text-[10px] font-bold text-gray-400 bg-gray-50 border-gray-100 hover:text-gray-600 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:hover:text-gray-200 px-1.5 py-0.5 rounded-full cursor-help hover:text-gray-600 transition-colors border">
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

            {/* Platform */}
            <td className="px-6 py-5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-[10px] font-black text-[#4e80ee] dark:text-blue-400 uppercase tracking-widest">
                    {review.source}
                </div>
            </td>

            {/* Status */}
            <td className="px-6 py-5">
                {getStatusBadge(review.status, review.isAiReply ?? false)}
            </td>

            {/* Action */}
            <td className="px-6 py-5">
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // prevent modal trigger
                        navigate(`/reviews/${review.id}`);
                    }}
                    className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-700/50 dark:hover:bg-slate-700 text-gray-400 dark:text-slate-500 hover:scale-105 active:scale-95 transition-all border border-gray-200/50 dark:border-slate-700"
                    title="Open dedicated page"
                >
                    <ExternalLink size={14} />
                </button>
            </td>
        </tr>
    );
};

export default ReviewsTableRow;
