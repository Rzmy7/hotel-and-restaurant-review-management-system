import React from 'react';
import { MessageSquare } from 'lucide-react';

interface ReviewsCollectedCardProps {
    totalReviews: number;
    reviewsGrowth: number;
}

export const ReviewsCollectedCard: React.FC<ReviewsCollectedCardProps> = ({ 
    totalReviews, 
    reviewsGrowth 
}) => {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500 mb-1">Reviews Collected Today</p>
                    <p className="text-2xl font-bold text-gray-900">
                        {totalReviews.toLocaleString()}
                    </p>
                </div>
                <div className="p-3 bg-cyan-100 rounded-lg">
                    <MessageSquare className="text-cyan-600" size={24} />
                </div>
            </div>
            <div className="mt-3">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-green-600">+{reviewsGrowth}%</span>
                    <span className="text-xs text-gray-500">vs last month</span>
                </div>
            </div>
        </div>
    );
};
