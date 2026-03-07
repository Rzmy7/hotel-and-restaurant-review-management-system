import React, { useState } from 'react';
import { Star, BarChart2 } from 'lucide-react';
import type { RatingDistributionItem } from '../../../types/dashboard';
import ReviewDistributionModal from '../../ReviewDistributionModal';
import { Card } from '../atoms/Card';
import { SectionHeader } from '../molecules/SectionHeader';

export interface ReviewRatingDistributionProps {
    distribution: RatingDistributionItem[];
}

export const ReviewRatingDistribution: React.FC<ReviewRatingDistributionProps> = ({ distribution = [] }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Ensure we always have 5 to 1 even if not in data
    const distMap = new Map(distribution.map(d => [d.rating, d]));
    const fullStats = [5, 4, 3, 2, 1].map(rating => {
        return distMap.get(rating) || { rating, count: 0, percentage: 0 };
    });

    return (
        <>
            <Card hoverEffect className="shadow-sm p-6 flex flex-col group/card">
                <SectionHeader
                    title="Rating Distribution"
                    subtitle="All-time Reviews"
                    icon={<BarChart2 size={18} />}
                    iconClassName="bg-slate-50 text-[#5988EF] border border-slate-100/50"
                    className="mb-6 shrink-0 items-center"
                >
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="text-[11px] font-black text-[#5988EF] hover:text-blue-700 uppercase tracking-widest bg-[#5988EF]/5 hover:bg-[#5988EF]/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer border-none"
                    >
                        See Details
                    </button>
                </SectionHeader>

                <div className="flex flex-col gap-3.5">
                    {fullStats.map(({ rating, count, percentage }) => (
                        <div key={rating} className="flex items-center gap-3 w-full group cursor-default">
                            <span className="flex items-center gap-1 min-w-[32px] justify-end">
                                <span className="text-sm font-bold text-[#3E4756] dark:text-slate-300 group-hover:text-amber-500 transition-colors">{rating}</span>
                                <Star size={14} className="text-amber-400 fill-amber-400 group-hover:text-amber-500 group-hover:fill-amber-500 transition-colors" />
                            </span>

                            <div className="flex-1 h-2.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden relative">
                                <div
                                    className="h-full rounded-full transition-all duration-700 ease-out bg-[#5988EF] group-hover:opacity-90"
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>

                            <div className="flex items-center justify-between min-w-[70px]">
                                <span className="text-xs text-[#3E4756] dark:text-slate-300 font-bold">{percentage}%</span>
                                <span className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">{count.toLocaleString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            <ReviewDistributionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
};

export default ReviewRatingDistribution;
