import React from 'react';
import Skeleton from './Skeleton';

const MetricCardSkeleton: React.FC = () => (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4">
        <Skeleton variant="circle" className="w-12 h-12 flex-shrink-0" />
        <div className="flex-1 space-y-3">
            <Skeleton variant="text" className="w-1/2" />
            <Skeleton variant="text" className="h-8 w-1/3" />
            <Skeleton variant="text" className="w-2/3 h-3" />
        </div>
    </div>
);

const ChartSkeleton: React.FC = () => (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-[380px] flex flex-col gap-4">
        <div className="flex justify-between items-center">
            <Skeleton variant="text" className="w-1/3 h-6" />
            <Skeleton variant="text" className="w-24 h-6" />
        </div>
        <Skeleton className="flex-1 w-full" />
        <div className="flex justify-between gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} variant="text" className="h-4 flex-1" />
            ))}
        </div>
    </div>
);

const ListSkeleton: React.FC = () => (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <Skeleton variant="text" className="w-1/4 h-6 mb-6" />
        {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4 items-center py-3 border-b border-gray-50 last:border-0">
                <Skeleton variant="circle" className="w-10 h-10 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                    <Skeleton variant="text" className="w-1/3" />
                    <Skeleton variant="text" className="w-2/3 h-3" />
                </div>
            </div>
        ))}
    </div>
);

const DashboardSkeleton: React.FC = () => {
    return (
        <>
            {/* Header Skeleton Mock */}
            <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Skeleton variant="circle" className="w-12 h-12" />
                    <div className="space-y-2">
                        <Skeleton variant="text" className="w-48 h-6" />
                        <Skeleton variant="text" className="w-32 h-4" />
                    </div>
                </div>
                <div className="flex gap-3">
                    <Skeleton className="w-32 h-10 rounded-xl" />
                    <Skeleton className="w-10 h-10 rounded-xl" />
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-6 p-4 md:px-8 md:py-6 bg-gray-50">
                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 min-[1200px]:grid-cols-4 gap-4">
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 min-[1200px]:grid-cols-2 gap-5">
                    <ChartSkeleton />
                    <ChartSkeleton />
                </div>

                {/* Reviews and Category Row */}
                <div className="grid grid-cols-1 min-[1200px]:grid-cols-2 gap-5">
                    <ListSkeleton />
                    <ListSkeleton />
                </div>

                {/* AI Insights and Alerts Row */}
                <div className="grid grid-cols-1 min-[1200px]:grid-cols-2 gap-5">
                    <ListSkeleton />
                    <ListSkeleton />
                </div>

                {/* Source Comparison */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-64">
                    <Skeleton variant="text" className="w-1/6 h-6 mb-6" />
                    <div className="space-y-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between">
                                    <Skeleton variant="text" className="w-24 h-4" />
                                    <Skeleton variant="text" className="w-12 h-4" />
                                </div>
                                <Skeleton className="w-full h-3" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default DashboardSkeleton;
