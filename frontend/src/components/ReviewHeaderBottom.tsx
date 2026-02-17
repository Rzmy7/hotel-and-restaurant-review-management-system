import React from 'react';

const ReviewsHeaderBottom = () => {
  const filters = [
    "Rating", 
    "Sentiment", 
    "Source", 
    "Category", 
    "Language", 
    "Has AI Reply"
  ];

  return (
    <div className="bg-white px-8 pt-4 pb-6 flex border-b border-gray-200 justify-between">
      
      {/* The Row of Filter Pills */}
      <div className="flex gap-2.5 flex-wrap">
        {filters.map((filter, index) => (
          <button key={index} className="bg-white border border-gray-200 rounded-md px-4 py-2 text-sm text-gray-700 cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:border-gray-300">
            {filter}
          </button>
        ))}
      </div>

      {/* The Review Count Text */}
      <div className="text-sm text-gray-500 flex items-center">
        Showing <span className="font-semibold text-gray-800 mx-1">12</span> reviews
      </div>

    </div>
  );
};

export default ReviewsHeaderBottom;