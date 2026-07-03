import React from 'react';
import Skeleton from '../components/shared/Skeleton';

interface SetupSkeletonProps {
    currentStep?: number;
}

const SetupSkeleton: React.FC<SetupSkeletonProps> = ({ currentStep = 1 }) => {
    const steps = [
        { number: 1, label: 'Organization' },
        { number: 2, label: 'Sources' },
        { number: 3, label: 'Finish' },
    ];

    return (
        <div className="fixed inset-0 z-[50] overflow-y-auto bg-slate-50 dark:bg-slate-950 flex flex-col py-12 px-6">
            {/* Header with logo & Exit button skeleton */}
            <div className="max-w-5xl mx-auto w-full flex justify-between items-center mb-12">
                <div className="flex items-center gap-2.5">
                    <Skeleton className="w-8 h-8 rounded-lg" />
                    <Skeleton className="h-6 w-24 rounded-md" />
                </div>
                <Skeleton className="w-28 h-9 rounded-xl" />
            </div>

            {/* Steps Header Skeleton */}
            <div className="max-w-3xl mx-auto w-full mb-12 relative">
                {/* Progress Line Background */}
                <div className="absolute top-4 left-0 w-full h-[2px] bg-slate-200 dark:bg-slate-800 -z-10" />

                <div className="flex justify-between items-start">
                    {steps.map((step) => {
                        const isActive = currentStep === step.number;
                        const isCompleted = currentStep > step.number;

                        return (
                            <div key={step.number} className="flex flex-col items-center gap-3 relative px-2">
                                <div className={`
                                    w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                                    ${isActive || isCompleted ? 'bg-blue-600/20' : ''}
                                `}>
                                    <Skeleton className={`w-8 h-8 rounded-full ${isActive || isCompleted ? 'border-2 border-blue-500' : ''}`} />
                                </div>
                                <Skeleton className="h-3 w-16 rounded" />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Card Content Skeleton */}
            <div className="flex-1 flex flex-col items-center">
                <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800/80 p-8 md:p-12 rounded-2xl shadow-2xl shadow-blue-500/5 relative overflow-hidden flex flex-col min-h-[450px]">
                    {/* Subtle top accent gradient shimmer */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-30" />

                    <div className="flex-1 space-y-6">
                        {/* Title & Description skeleton */}
                        <div className="space-y-2">
                            <Skeleton className="h-7 w-64 rounded-md" />
                            <Skeleton className="h-4.5 w-full max-w-md rounded" />
                        </div>

                        {/* Middle Content skeleton (flexible layout representation) */}
                        <div className="space-y-4 pt-4">
                            {currentStep === 1 ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Skeleton className="h-28 rounded-xl" />
                                        <Skeleton className="h-28 rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Skeleton className="h-3.5 w-32 rounded" />
                                        <Skeleton className="h-11 w-full rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Skeleton className="h-3.5 w-32 rounded" />
                                        <Skeleton className="h-11 w-full rounded-xl" />
                                    </div>
                                </div>
                            ) : currentStep === 2 ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-10 w-full rounded-xl" />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {[1, 2, 3, 4].map((item) => (
                                            <div key={item} className="p-4 border border-gray-100 dark:border-slate-800 rounded-xl flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Skeleton className="w-9 h-9 rounded-xl" />
                                                    <Skeleton className="h-4 w-24 rounded" />
                                                </div>
                                                <Skeleton className="w-6 h-6 rounded-full" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 flex flex-col items-center py-6">
                                    <Skeleton className="w-16 h-16 rounded-full mb-2" />
                                    <Skeleton className="h-5 w-48 rounded" />
                                    <Skeleton className="h-3.5 w-64 rounded" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Action buttons skeleton */}
                    <div className="flex items-center justify-between pt-8 mt-8 border-t border-slate-100 dark:border-slate-800">
                        <Skeleton className="w-24 h-11 rounded-xl" />
                        <Skeleton className="w-32 h-11 rounded-xl" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SetupSkeleton;
