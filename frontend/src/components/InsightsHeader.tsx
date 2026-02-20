import React from 'react';

interface InsightsHeaderProps {
    timeRange: string;
    onTimeRangeChange: (range: string) => void;
}

const timeRanges = ['7d', '30d', '90d'];

const InsightsHeader: React.FC<InsightsHeaderProps> = ({ timeRange, onTimeRangeChange }) => {
    return (
        <header className="flex justify-between items-center px-8 py-5 bg-white border-b border-gray-200 transition-all max-md:flex-col max-md:items-start max-md:gap-4">
            <div className="flex items-center gap-4">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-semibold text-gray-900 m-0 leading-tight">
                        Insights
                    </h1>
                    <p className="mt-1 text-[13px] text-gray-400 m-0 leading-none">
                        Analytics & review intelligence overview
                    </p>
                </div>
            </div>

            {/* Time range selector */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {timeRanges.map((range) => (
                    <button
                        key={range}
                        onClick={() => onTimeRangeChange(range)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium cursor-pointer border-none transition-all ${timeRange === range
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'bg-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {range === '7d' ? 'Last 7 days' : range === '30d' ? 'Last 30 days' : 'Last 90 days'}
                    </button>
                ))}
            </div>
        </header>
    );
};

export default InsightsHeader;
