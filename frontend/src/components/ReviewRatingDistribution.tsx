import React from 'react';
import { Star, BarChart2 } from 'lucide-react';
import type { RatingDistributionItem } from '../types/dashboard';

interface ReviewRatingDistributionProps {
  distribution: RatingDistributionItem[];
}

const colorMap: Record<number, { bg: string, bar: string, text: string }> = {
  5: { bg: 'bg-emerald-500', bar: 'bg-emerald-500', text: 'text-emerald-700' },
  4: { bg: 'bg-blue-500', bar: 'bg-blue-500', text: 'text-blue-700' },
  3: { bg: 'bg-amber-500', bar: 'bg-amber-500', text: 'text-amber-700' },
  2: { bg: 'bg-orange-500', bar: 'bg-orange-500', text: 'text-orange-700' },
  1: { bg: 'bg-rose-500', bar: 'bg-rose-500', text: 'text-rose-700' },
};

const ReviewRatingDistribution: React.FC<ReviewRatingDistributionProps> = ({ distribution = [] }) => {
  // Ensure we always have 5 to 1 even if not in data
  const distMap = new Map(distribution.map(d => [d.rating, d]));
  const fullStats = [5, 4, 3, 2, 1].map(rating => {
    return distMap.get(rating) || { rating, count: 0, percentage: 0 };
  });

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6 flex flex-col shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center bg-amber-50 rounded-xl text-amber-500 border border-amber-100/50">
            <BarChart2 size={18} />
          </div>
          <div>
            <h3 className="m-0 text-sm font-black text-gray-700 uppercase tracking-widest">Rating Distribution</h3>
            <p className="m-0 text-[10px] text-gray-400 font-bold uppercase tracking-wider">All-time Reviews</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        {fullStats.map(({ rating, count, percentage }) => {
          const colors = colorMap[rating];
          return (
            <div key={rating} className="flex items-center gap-3 w-full group">
              <span className="flex items-center gap-1 min-w-[32px] justify-end">
                <span className="text-sm font-black text-gray-700">{rating}</span>
                <Star size={14} className="text-gray-400 fill-gray-400 group-hover:text-amber-400 group-hover:fill-amber-400 transition-colors" />
              </span>

              <div className="flex-1 h-3 bg-gray-100/80 rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${colors.bar}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between min-w-[70px]">
                <span className="text-xs text-gray-700 font-bold">{percentage}%</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{count.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReviewRatingDistribution;
