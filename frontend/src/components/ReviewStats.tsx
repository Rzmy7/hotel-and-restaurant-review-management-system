import { Star, MessageSquare, AlertCircle, TrendingUp } from 'lucide-react';
import type { ReviewStats as ReviewStatsType } from '../types/reviews';

interface ReviewStatsProps {
    stats: ReviewStatsType;
    isLoading?: boolean;
}

const ReviewStats = ({ stats, isLoading }: ReviewStatsProps) => {
    const getSentimentColors = (score: number) => {
        if (score >= 70) return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'hover:border-emerald-200' };
        if (score >= 40) return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'hover:border-amber-200' };
        return { color: 'text-rose-600', bg: 'bg-rose-50', border: 'hover:border-rose-200' };
    };

    const sentimentStyle = getSentimentColors(stats.sentimentScore);

    const cards = [
        {
            label: 'Total Reviews',
            value: stats.totalReviews.toLocaleString(),
            icon: MessageSquare,
            color: 'text-[#4e80ee]',
            bg: 'bg-blue-50',
            border: 'hover:border-blue-200'
        },
        {
            label: 'Avg Rating',
            value: `${stats.averageRating} / 5.0`,
            icon: Star,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            border: 'hover:border-amber-200'
        },
        {
            label: 'Pending Action',
            value: stats.pendingReplies.toLocaleString(),
            icon: AlertCircle,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
            border: 'hover:border-rose-200'
        },
        {
            label: 'Overall Sentiment',
            value: `${stats.sentimentScore} / 100`,
            icon: TrendingUp,
            color: sentimentStyle.color,
            bg: sentimentStyle.bg,
            border: sentimentStyle.border
        }
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {cards.map((card, index) => (
                <div
                    key={index}
                    className={`bg-white p-5 rounded-xl border border-gray-100 transition-all duration-300 hover:shadow-lg hover:shadow-gray-200/40 hover:-translate-y-0.5 group ${card.border} relative overflow-hidden`}
                >
                    <div className="flex justify-between items-center mb-4">
                        <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${card.bg} ${card.color} transition-transform duration-300 group-hover:scale-110 shadow-sm border border-transparent`}>
                            <card.icon size={20} />
                        </div>
                        {index === 2 && stats.pendingReplies > 0 && !isLoading && (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100/50">
                                <div className="w-1 h-1 bg-rose-500 rounded-full animate-pulse" />
                                Needs Reply
                            </div>
                        )}
                        {index === 3 && !isLoading && (
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${sentimentStyle.bg} ${sentimentStyle.color} border border-transparent`}>
                                {stats.sentimentScore >= 70 ? 'Excellent' : stats.sentimentScore >= 40 ? 'Average' : 'Needs Attention'}
                            </div>
                        )}
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{card.label}</p>
                        {isLoading ? (
                            <div className="h-8 w-16 bg-gray-50 animate-pulse rounded-lg" />
                        ) : (
                            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{card.value}</h3>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ReviewStats;
