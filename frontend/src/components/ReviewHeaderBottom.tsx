import { useState } from "react";
import { useReviews } from "../contexts/ReviewsContext";
import { Check, ChevronDown, X } from "lucide-react";

const ReviewsHeaderBottom = () => {
  const { reviews, filteredReviews, toggleFilter, toggleAiReplyFilter, filters } = useReviews();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Derive unique options from reviews (mock data or real)
  const availableCategories = Array.from(new Set(reviews.flatMap(r => r.categories || [])));
  const availableLanguages = Array.from(new Set(reviews.map(r => r.language || 'English')));
  const availableSources = Array.from(new Set(reviews.map(r => r.source)));

  const handleMenuClick = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const isFilterActive = (type: string) => {
    switch (type) {
      case "Rating": return filters.rating.length > 0;
      case "Sentiment": return filters.sentiment.length > 0;
      case "Source": return filters.source.length > 0;
      case "Category": return filters.category.length > 0;
      case "Language": return filters.language.length > 0;
      case "Has AI Reply": return filters.hasAiReply;
      default: return false;
    }
  };

  const renderFilterMenu = () => {
    if (!activeMenu) return null;

    let options: { label: string; value: string | number; type: any }[] = [];

    switch (activeMenu) {
      case "Rating":
        options = [5, 4, 3, 2, 1].map(r => ({ label: `${r} Stars`, value: r, type: 'rating' }));
        break;
      case "Sentiment":
        options = ['Positive', 'Neutral', 'Negative'].map(s => ({ label: s, value: s, type: 'sentiment' }));
        break;
      case "Source":
        options = availableSources.map(s => ({ label: s, value: s, type: 'source' }));
        break;
      case "Category":
        options = availableCategories.map(c => ({ label: c, value: c, type: 'category' }));
        break;
      case "Language":
        options = availableLanguages.map(l => ({ label: l, value: l, type: 'language' }));
        break;
      default:
        return null;
    }

    return (
      <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-2 min-w-[200px]">
        {options.map((opt) => {
          // Check if selected
          const isSelected = (filters as any)[opt.type].includes(opt.value);
          return (
            <button
              key={opt.value}
              onClick={() => toggleFilter(opt.type, opt.value)}
              className={`flex items-center justify-between w-full px-3 py-2 text-sm text-left rounded-md transition-colors ${isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
                }`}
            >
              <span>{opt.label}</span>
              {isSelected && <Check size={14} />}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white px-8 pb-4 pt-4 border-b border-gray-200 flex flex-col gap-4">

      {/* Top Row: Filter Buttons */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2 flex-wrap relative">
          {["Rating", "Sentiment", "Source", "Category", "Language"].map((menu) => (
            <div key={menu} className="relative">
              <button
                onClick={() => handleMenuClick(menu)}
                className={`flex items-center gap-1.5 border rounded-md px-3 py-1.5 text-sm font-medium transition-all ${isFilterActive(menu) || activeMenu === menu
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
              >
                {menu}
                <ChevronDown size={14} className={`transition-transform ${activeMenu === menu ? 'rotate-180' : ''}`} />
              </button>
              {activeMenu === menu && renderFilterMenu()}
            </div>
          ))}

          {/* AI Reply Toggle */}
          <button
            onClick={toggleAiReplyFilter}
            className={`flex items-center gap-1.5 border rounded-md px-3 py-1.5 text-sm font-medium transition-all ${filters.hasAiReply
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
          >
            Has AI Reply
            {filters.hasAiReply && <Check size={14} />}
          </button>
        </div>

        <div className="text-sm text-gray-500">
          Showing <span className="font-semibold text-gray-900">{filteredReviews.length}</span> reviews
        </div>
      </div>

      {/* Active Filters Display (optional but helpful) */}
      {(filters.rating.length > 0 || filters.sentiment.length > 0 || filters.category.length > 0 || filters.source.length > 0 || filters.language.length > 0) && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Active:</span>

          {filters.rating.map(r => (
            <span key={`r-${r}`} className="bg-gray-100 border border-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
              {r} Stars <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => toggleFilter('rating', r)} />
            </span>
          ))}

          {filters.sentiment.map(s => (
            <span key={`s-${s}`} className="bg-gray-100 border border-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
              {s} <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => toggleFilter('sentiment', s)} />
            </span>
          ))}

          {filters.category.map(c => (
            <span key={`c-${c}`} className="bg-gray-100 border border-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
              {c} <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => toggleFilter('category', c)} />
            </span>
          ))}

          {filters.language.map(l => (
            <span key={`l-${l}`} className="bg-gray-100 border border-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
              {l} <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => toggleFilter('language', l)} />
            </span>
          ))}

        </div>
      )}

    </div>
  );
};

export default ReviewsHeaderBottom;