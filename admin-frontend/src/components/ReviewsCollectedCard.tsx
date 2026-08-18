import React from 'react';
import { MessageSquare } from 'lucide-react';
import { formatTrend } from '../utils/format';

interface ReviewsCollectedCardProps {
    reviewsCollectedToday: number;
    reviewsGrowth: number;
}

export const ReviewsCollectedCard: React.FC<ReviewsCollectedCardProps> = ({ 
    reviewsCollectedToday, 
    reviewsGrowth 
}) => {
    const { text: formattedGrowth, isPositive } = formatTrend(reviewsGrowth);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-5 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">Reviews Collected Today</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {reviewsCollectedToday.toLocaleString()}
                    </p>
                </div>
                <div className="p-3 bg-cyan-100 rounded-lg">
                    <MessageSquare className="text-cyan-600" size={24} />
                </div>
            </div>
            <div className="mt-3">
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formattedGrowth}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-slate-400">vs last month</span>
                </div>
            </div>
        </div>
    );
};

