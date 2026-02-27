import { Search, Check, ChevronDown } from 'lucide-react';
import { useReviews } from '../contexts/ReviewsContext';
import { useState } from 'react';
import type { Review } from '../types/reviews';

const ReviewsToolbar = () => {
    const { filters, setSearchQuery, toggleFilter, filteredReviews, reviews } = useReviews();
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    // Derived distinct options (could also come from the API/Context)
    // Derived distinct options
    const allCategories = Array.from(new Set(reviews.flatMap((r: Review) => r.categories || [])));
    const options = {
        Rating: [5, 4, 3, 2, 1],
        Sentiment: ['Positive', 'Neutral', 'Negative'],
        Source: ['Google Reviews', 'TripAdvisor', 'Booking.com', 'Airbnb', 'Agoda'],
        Category: allCategories.length > 0 ? allCategories : ['Food', 'Service', 'Cleanliness', 'Location', 'Value'],
        Status: ['Pending', 'Replied', 'AI Draft']
    };

    const handleMenuClick = (menu: string) => {
        setActiveMenu(activeMenu === menu ? null : menu);
    };

    const isFilterActive = (type: string) => {
        switch (type) {
            case "Rating": return filters.rating.length > 0;
            case "Sentiment": return filters.sentiment.length > 0;
            case "Source": return filters.source.length > 0;
            case "Category": return filters.category.length > 0;
            default: return false;
        }
    };

    const renderFilterMenu = (menu: string) => {
        if (activeMenu !== menu) return null;

        const menuOptions = options[menu as keyof typeof options];
        let filterType: any = '';

        switch (menu) {
            case 'Rating': filterType = 'rating'; break;
            case 'Sentiment': filterType = 'sentiment'; break;
            case 'Source': filterType = 'source'; break;
            case 'Category': filterType = 'category'; break;
            default: return null;
        }

        return (
            <div className="absolute top-full left-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-lg shadow-gray-200/50 z-50 p-2 min-w-[180px]">
                {menuOptions.map((opt: unknown) => {
                    const isSelected = (filters as any)[filterType].includes(opt as string | number);
                    return (
                        <button
                            key={opt as string | number}
                            onClick={() => toggleFilter(filterType, opt as string | number)}
                            className={`flex items-center justify-between w-full px-3 py-2 text-[13px] font-bold text-left rounded-lg transition-all ${isSelected
                                ? 'bg-blue-50 text-[#4e80ee]'
                                : 'hover:bg-gray-50 text-gray-600'
                                }`}
                        >
                            <span>{menu === 'Rating' ? `${opt} Stars` : String(opt)}</span>
                            {isSelected && <Check size={14} className="text-[#4e80ee]" />}
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            {/* Search Bar */}
            <div className="relative w-full md:w-96 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#4e80ee] transition-colors" size={16} />
                <input
                    type="text"
                    placeholder="Search reviews..."
                    value={filters.search}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-gray-50/50 border border-gray-100 rounded-xl text-[13px] font-bold text-gray-700 placeholder:text-gray-400 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-[#4e80ee] transition-all outline-none"
                />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
                {Object.keys(options).filter(k => k !== 'Status').map((menu) => (
                    <div key={menu} className="relative">
                        <button
                            onClick={() => handleMenuClick(menu)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-black uppercase tracking-wider transition-all duration-300 border ${isFilterActive(menu) || activeMenu === menu
                                ? 'bg-blue-50 border-blue-200 text-[#4e80ee] shadow-sm'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-blue-400 hover:text-[#4e80ee]'
                                }`}
                        >
                            {menu}
                            <ChevronDown size={14} className={`transition-transform ${activeMenu === menu ? 'rotate-180' : ''}`} />
                        </button>
                        {renderFilterMenu(menu)}
                    </div>
                ))}

                <div className="h-8 w-px bg-gray-200 mx-2 hidden sm:block"></div>

                <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    Showing <span className="text-[#4e80ee] text-[13px]">{filteredReviews.length}</span> results
                </div>
            </div>
        </div>
    );
};

export default ReviewsToolbar;
