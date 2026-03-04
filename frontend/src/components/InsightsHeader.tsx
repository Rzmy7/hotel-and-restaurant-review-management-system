import React from 'react';
import { PageHeader } from './ui/PageHeader';

interface InsightsHeaderProps {
    timeRange: string;
    onTimeRangeChange: (range: string) => void;
}

const timeRanges = ['7d', '30d', '90d'];

const InsightsHeader: React.FC<InsightsHeaderProps> = ({ timeRange, onTimeRangeChange }) => {
    const actions = (
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
    );

    return (
        <PageHeader
            title="Insights"
            description="Analytics & review intelligence overview"
            actions={actions}
        />
    );
};

export default InsightsHeader;
