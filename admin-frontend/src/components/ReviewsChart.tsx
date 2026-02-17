import React from 'react';
import type { ChartDataPoint } from '../types';

interface ReviewsChartProps {
    data: ChartDataPoint[];
}

export const ReviewsChart: React.FC<ReviewsChartProps> = ({ data }) => {
    const maxVal = Math.max(...data.map(d => d.value));
    const xAxisValues = [0, 1, 2, 3, 4, 5, 6, 7];

    // Reverse data to show from bottom to top as in the image
    const reversedData = [...data].reverse();

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
            <div className="mb-4">
                <h3 className="text-base font-semibold text-gray-900">Reviews by Organization</h3>
                <p className="text-sm text-gray-500">Total reviews collected</p>
            </div>
            <div className="flex-1">
                <div className="space-y-3">
                    {reversedData.map((item, index) => (
                        <div key={index} className="flex items-center gap-3">
                            <div className="w-28 text-right text-sm text-gray-600 truncate">
                                {item.label}
                            </div>
                            <div className="flex-1 bg-gray-100 rounded-sm h-4 overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 rounded-sm transition-all"
                                    style={{ width: `${(item.value / maxVal) * 100}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
                {/* X Axis */}
                <div className="flex justify-between mt-4 pl-32 text-xs text-gray-400">
                    {xAxisValues.map((val) => (
                        <span key={val}>{val}</span>
                    ))}
                </div>
            </div>
        </div>
    );
};
