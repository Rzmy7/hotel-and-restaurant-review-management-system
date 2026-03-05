import React, { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

interface ReviewsTablePaginationProps {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const ReviewsTablePagination = ({ page, limit, total, totalPages, onPageChange }: ReviewsTablePaginationProps) => {
    const [jumpPage, setJumpPage] = useState('');

    const renderPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxPagesToShow = 5;

        if (totalPages <= maxPagesToShow + 2) {
            for (let i = 0; i < totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(0);

            let start = Math.max(1, page - 1);
            let end = Math.min(totalPages - 2, page + 1);

            if (page <= 2) {
                end = 3;
            } else if (page >= totalPages - 3) {
                start = totalPages - 4;
            }

            if (start > 1) {
                pages.push('...');
            }

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (end < totalPages - 2) {
                pages.push('...');
            }

            pages.push(totalPages - 1);
        }

        return pages.map((p, index) => {
            if (p === '...') {
                return (
                    <div key={`ellipsis-${index}`} className="w-8 h-8 flex items-center justify-center text-gray-400">
                        <MoreHorizontal size={16} />
                    </div>
                );
            }

            const pageNum = p as number;
            return (
                <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-[13px] font-bold transition-all ${page === pageNum
                        ? 'bg-[#4e80ee] text-white shadow-md shadow-blue-200 dark:shadow-none'
                        : 'text-gray-600 hover:bg-gray-100 border border-transparent hover:border-gray-200 dark:text-gray-300 dark:hover:bg-slate-700 dark:hover:border-slate-600'
                        }`}
                >
                    {pageNum + 1}
                </button>
            );
        });
    };

    const handleJumpPage = (e: React.FormEvent) => {
        e.preventDefault();
        const pageNum = parseInt(jumpPage) - 1;
        if (!isNaN(pageNum) && pageNum >= 0 && pageNum < totalPages) {
            onPageChange(pageNum);
            setJumpPage('');
        }
    };

    return (
        <div className="mt-auto px-6 py-4 bg-gray-50/50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">
                Showing <span className="text-gray-900 dark:text-white">{total === 0 ? 0 : page * limit + 1}</span> to <span className="text-gray-900 dark:text-white">{Math.min((page + 1) * limit, total)}</span> of <span className="text-gray-900 dark:text-white">{total}</span> reviews
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mt-4 sm:mt-0">
                {totalPages > 5 && (
                    <form onSubmit={handleJumpPage} className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest">Go to:</span>
                        <input
                            type="text"
                            value={jumpPage}
                            onChange={(e) => setJumpPage(e.target.value)}
                            placeholder="Pg"
                            className="w-12 h-8 px-2 text-center text-[12px] font-bold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:border-[#4e80ee] focus:ring-2 focus:ring-blue-50 transition-all text-gray-700 dark:text-gray-200 dark:focus:bg-slate-700"
                        />
                    </form>
                )}

                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    <button
                        disabled={page === 0}
                        onClick={() => onPageChange(page - 1)}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 text-[12px] sm:text-[13px] font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-slate-800 transition-all shadow-sm"
                    >
                        Prev
                    </button>

                    <div className="flex items-center gap-1 mx-1 sm:mx-2">
                        {renderPageNumbers()}
                    </div>

                    <button
                        disabled={page >= totalPages - 1}
                        onClick={() => onPageChange(page + 1)}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 text-[12px] sm:text-[13px] font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-slate-800 transition-all shadow-sm"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReviewsTablePagination;
