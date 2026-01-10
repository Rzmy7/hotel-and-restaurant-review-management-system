


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
    <div className="bg-white px-8 pb-6 pt-4 flex justify-between border-b border-gray-200">

      {/* The Row of Filter Pills */}
      <div className="flex gap-2.5 flex-wrap">
        {filters.map((filter, index) => (
          <button key={index} className="bg-white border border-gray-200 rounded-md px-4 py-2 text-sm text-gray-700 cursor-pointer transition-all hover:bg-gray-50 hover:border-gray-300">
            {filter}
          </button>
        ))}
      </div>

      {/* The Review Count Text */}
      <div className="text-sm text-gray-500 content-center">
        Showing <span className="font-semibold text-gray-800">12</span> reviews
      </div>

    </div>
  );
};

export default ReviewsHeaderBottom;