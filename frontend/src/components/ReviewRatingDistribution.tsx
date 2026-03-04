import React, { useState } from 'react';
import { Star, BarChart2 } from 'lucide-react';
import type { RatingDistributionItem } from '../types/dashboard';
import ReviewDistributionModal from './ReviewDistributionModal';

interface ReviewRatingDistributionProps {
  distribution: RatingDistributionItem[];
}

const ReviewRatingDistribution: React.FC<ReviewRatingDistributionProps> = ({ distribution = [] }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Ensure we always have 5 to 1 even if not in data
  const distMap = new Map(distribution.map(d => [d.rating, d]));
  const fullStats = [5, 4, 3, 2, 1].map(rating => {
    return distMap.get(rating) || { rating, count: 0, percentage: 0 };
  });

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-xl p-6 flex flex-col shadow-sm hover:shadow-md transition-all duration-300 relative group/card">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-xl text-[#5988EF] border border-slate-100/50">
              <BarChart2 size={18} />
            </div>
            <div>
              <h3 className="m-0 text-sm font-black text-[#3E4756] uppercase tracking-widest">Rating Distribution</h3>
              <p className="m-0 text-[10px] text-gray-400 font-bold uppercase tracking-wider">All-time Reviews</p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="text-[11px] font-black text-[#5988EF] hover:text-blue-700 uppercase tracking-widest bg-[#5988EF]/5 hover:bg-[#5988EF]/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
          >
            See Details
          </button>
        </div>

        <div className="flex flex-col gap-3.5">
          {fullStats.map(({ rating, count, percentage }) => (
            <div key={rating} className="flex items-center gap-3 w-full group cursor-default">
              <span className="flex items-center gap-1 min-w-[32px] justify-end">
                <span className="text-sm font-bold text-[#3E4756] group-hover:text-amber-500 transition-colors">{rating}</span>
                <Star size={14} className="text-amber-400 fill-amber-400 group-hover:text-amber-500 group-hover:fill-amber-500 transition-colors" />
              </span>

              <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out bg-[#5988EF] group-hover:opacity-90"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between min-w-[70px]">
                <span className="text-xs text-[#3E4756] font-bold">{percentage}%</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{count.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ReviewDistributionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default ReviewRatingDistribution;
