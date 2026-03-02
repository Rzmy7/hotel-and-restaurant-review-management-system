import React from 'react';
import { Star as StarIcon } from 'lucide-react';

interface ReviewRatingDistributionProps {
  reviews: Array<{ rating: number }>;
}

const ReviewRatingDistribution: React.FC<ReviewRatingDistributionProps> = ({ reviews }) => {
  const total = reviews.length;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6 mt-4 shadow-sm hover:shadow-md transition-all duration-300">
      <h3 className="m-0 text-sm font-black text-gray-700 uppercase tracking-widest mb-2">Review Rating Distribution</h3>
      <div className="flex flex-col gap-3">
        {[5, 4, 3, 2, 1].map(star => {
          const count = reviews.filter(r => r.rating === star).length;
          const pct = total ? Math.round((count / total) * 100) : 0;
          return (
            <div key={star} className="flex items-center gap-2 w-full">
              <span className="flex items-center min-w-[90px]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon
                    key={i}
                    size={18}
                    className={i < star ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-100'}
                    style={{ marginRight: 2 }}
                  />
                ))}
              </span>
              <span className="text-xs text-gray-700 font-bold min-w-[60px]">{count} review{count !== 1 ? 's' : ''}</span>
              <span className="text-xs text-gray-400 font-bold min-w-[32px]">{pct}%</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: '#3D4656' }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReviewRatingDistribution;
