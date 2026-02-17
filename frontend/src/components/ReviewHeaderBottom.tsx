import { useReviews } from "../contexts/ReviewsContext";

const ReviewsHeaderBottom = () => {
  const { filteredReviews, toggleFilter, filters } = useReviews();

  // Helper to check if a filter category is active
  const isFilterActive = (type: string) => {
    // This is simplified. In a real app we'd check if specific filters for this category are active.
    if (type === "Rating") return filters.rating.length > 0;
    if (type === "Sentiment") return filters.sentiment.length > 0;
    if (type === "Source") return filters.source.length > 0;
    return false;
  };

  const handleFilterClick = (filter: string) => {
    // For demonstration, these buttons will toggle specific common filters
    // In a real UI, these would open dropdowns
    if (filter === "Rating") toggleFilter("rating", 1); // Toggle 1-star filter
    if (filter === "Sentiment") toggleFilter("sentiment", "Negative"); // Toggle Negative
    if (filter === "Source") toggleFilter("source", "Google"); // Toggle Google
  };

  const filterButtons = [
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
        {filterButtons.map((filter, index) => {
          const active = isFilterActive(filter);
          return (
            <button
              key={index}
              onClick={() => handleFilterClick(filter)}
              className={`border rounded-md px-4 py-2 text-sm cursor-pointer transition-all 
                ${active
                  ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                }`}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {/* The Review Count Text */}
      <div className="text-sm text-gray-500 content-center">
        Showing <span className="font-semibold text-gray-800">{filteredReviews.length}</span> reviews
      </div>

    </div>
  );
};

export default ReviewsHeaderBottom;