import { Search, Check, ChevronDown, X } from 'lucide-react';
import { useReviews } from '../contexts/ReviewsContext';
import { useState } from 'react';
import type { FilterState } from '../types/reviews';
const ReviewsToolbar = () => {
    const { filters, setSearchQuery, toggleFilter, pagination, sourceOptions, categoryOptions } = useReviews();
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [menuSearch, setMenuSearch] = useState('');

    // Derived distinct options
    const options = {
        Rating: [5, 4, 3, 2, 1],
        Sentiment: ['Positive', 'Neutral', 'Negative'],
        Source: sourceOptions.length > 0 ? sourceOptions : ['Google Reviews', 'TripAdvisor', 'Booking.com', 'Airbnb', 'Agoda'],
        Category: categoryOptions.length > 0 ? categoryOptions : ['Food', 'Service', 'Cleanliness', 'Location', 'Value'],
        Status: ['Pending', 'Replied', 'AI Draft']
    };

    const handleMenuClick = (menu: string) => {
        setActiveMenu(activeMenu === menu ? null : menu);
        if (activeMenu !== menu) setMenuSearch('');
    };

    const isFilterActive = (type: string) => {
        switch (type) {
            case "Rating": return filters.rating.length > 0;
            case "Sentiment": return filters.sentiment.length > 0;
            case "Source": return filters.source.length > 0;
            case "Category": return filters.category.length > 0;
            case "Status": return filters.status.length > 0;
            default: return false;
        }
    };

    const renderFilterMenu = (menu: string) => {
        if (activeMenu !== menu) return null;

        const menuOptions = options[menu as keyof typeof options];
        let filterType: keyof Omit<FilterState, 'search' | 'hasAiReply'> | '' = '';

        switch (menu) {
            case 'Rating': filterType = 'rating'; break;
            case 'Sentiment': filterType = 'sentiment'; break;
            case 'Source': filterType = 'source'; break;
            case 'Category': filterType = 'category'; break;
            case 'Status': filterType = 'status'; break;
            default: return null;
        }

        const hasSearch = menu === 'Category' || menu === 'Source';

        return (
            <div className={`absolute top-full left-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-lg shadow-gray-200/50 z-50 p-2 min-w-[200px] ${hasSearch ? 'min-w-[240px]' : ''}`}>
                {hasSearch && (
                    <div className="mb-2">
                        <div className="relative mb-2">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                type="text"
                                placeholder={`Search ${menu}...`}
                                value={menuSearch}
                                onChange={(e) => setMenuSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs outline-none focus:border-blue-400 focus:bg-white transition-all"
                            />
                        </div>
                        {filterType && (filters[filterType] as (string | number)[]).length > 0 && (
                            <div className="flex flex-wrap gap-1 border-b border-gray-100 pb-2 mb-2">
                                {(filters[filterType] as (string | number)[]).map((val: string | number) => (
                                    <button
                                        key={val}
                                        onClick={() => toggleFilter(filterType as keyof Omit<FilterState, 'search' | 'hasAiReply'>, val)}
                                        className="flex items-center gap-1 bg-blue-50 text-[#4e80ee] pl-2 pr-1.5 py-1 rounded-md text-[10px] font-bold hover:bg-blue-100 transition-colors"
                                        title={`Remove ${val}`}
                                    >
                                        {val}
                                        <X size={12} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className={hasSearch ? "max-h-56 overflow-y-auto pr-1 space-y-0.5 custom-scrollbar" : "space-y-0.5"}>
                    {menuOptions
                        .filter((opt: string | number) => hasSearch ? String(opt).toLowerCase().includes(menuSearch.toLowerCase()) : true)
                        .map((opt: string | number) => {
                            const isSelected = filterType && (filters[filterType] as (string | number)[]).includes(opt);
                            return (
                                <button
                                    key={opt}
                                    onClick={() => toggleFilter(filterType as keyof Omit<FilterState, 'search' | 'hasAiReply'>, opt)}
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
                {Object.keys(options).map((menu) => (
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
                    Showing <span className="text-[#4e80ee] text-[13px]">{pagination.total}</span> results
                </div>
            </div>
        </div>
    );
};

export default ReviewsToolbar;
