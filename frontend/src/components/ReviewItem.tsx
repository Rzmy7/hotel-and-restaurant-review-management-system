import React from 'react';
import { Star, ArrowRight } from 'lucide-react';


// Define the shape of a Review Object
interface ReviewProps {
  review: {
    id: number | string;
    rating: number;
    userName: string;
    reviewText: string;
    sentiment: 'Positive' | 'Negative' | 'Neutral';
    categories: string[];
    source: string;
    date: string;
    status: 'Replied' | 'AI Draft' | 'Pending';
  };
  onOpen: () => void;
}

const ReviewItem = ({ review, onOpen }: ReviewProps) => {
  const sentimentStyles = {
    Positive: "bg-green-50 text-green-700 border border-green-200",
    Negative: "bg-red-50 text-red-700 border border-red-200",
    Neutral: "bg-neutral-100 text-neutral-700 border border-neutral-400"
  };

  return (
    <div className="grid grid-cols-[60px_3fr_1fr_1.2fr_1fr_1fr_1fr_80px] gap-4 items-start px-6 py-4 border-b border-gray-100 transition-colors bg-white hover:bg-gray-50">

      {/* 1. Rating */}
      <div className="flex items-center gap-1 font-semibold text-gray-800">
        <span>{review.rating}</span>
        <Star size={14} fill="#fbbf24" color="#fbbf24" /> {/* Gold Star */}
      </div>

      {/* 2. Snippet */}
      <div className="flex flex-col gap-1">
        <div className="text-xs text-gray-500">{review.userName}</div>
        <div className="text-sm text-gray-700 leading-snug line-clamp-2">{review.reviewText}</div>
      </div>

      {/* 3. Sentiment */}
      <div>
        <span className={`inline-block text-xs px-3 py-1 rounded-md font-medium ${sentimentStyles[review.sentiment]}`}>
          {review.sentiment}
        </span>
      </div>

      {/* 4. Category */}
      <div>
        <div className="flex flex-wrap gap-1.5">
          {review.categories.slice(0, 2).map((cat, i) => (
            <span key={i} className="border border-blue-500 text-gray-800 text-[11px] px-2 py-0.5 rounded-xl bg-blue-50">{cat}</span>
          ))}
          {review.categories.length > 2 && (
            <span className="text-[11px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-xl">+{review.categories.length - 2}</span>
          )}
        </div>
      </div>

      {/* 5. Source */}
      <div>
        <span className="bg-black text-white text-[11px] px-2.5 py-1 rounded-md">{review.source}</span>
      </div>

      {/* 6. Date */}
      <div className="text-[13px] text-gray-600">
        {review.date}
      </div>

      {/* 7. Status */}
      <div>
        <span className="text-xs px-2.5 py-1 rounded-md font-medium text-white bg-black">
          {review.status}
        </span>
      </div>

      {/* 8. Actions */}
      <div>
        <button className="flex items-center gap-1 text-blue-500 bg-transparent border-none text-[13px] cursor-pointer p-0 hover:underline" onClick={onOpen}>
          Open <ArrowRight size={14} />
        </button>
      </div>

    </div>
  );
};

export default ReviewItem;