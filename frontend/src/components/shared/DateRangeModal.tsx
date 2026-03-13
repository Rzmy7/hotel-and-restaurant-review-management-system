import { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';

interface DateRangeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (dateFrom: string, dateTo: string) => void;
    initialDateFrom?: string;
    initialDateTo?: string;
}

const DateRangeModal = ({ isOpen, onClose, onApply, initialDateFrom, initialDateTo }: DateRangeModalProps) => {
    const [dateFrom, setDateFrom] = useState(initialDateFrom || '');
    const [dateTo, setDateTo] = useState(initialDateTo || '');
    const [selectedQuickRange, setSelectedQuickRange] = useState<'today' | 'week' | 'month' | 'quarter' | 'year' | null>(null);

    // Sync local state with filter values when modal opens
    useEffect(() => {
        if (isOpen) {
            setDateFrom(initialDateFrom || '');
            setDateTo(initialDateTo || '');
            setSelectedQuickRange(null);
        }
    }, [isOpen, initialDateFrom, initialDateTo]);

    if (!isOpen) return null;

    const handleApply = () => {
        if (dateFrom && dateTo) {
            onApply(dateFrom, dateTo);
            onClose();
        }
    };

    const handleClear = () => {
        onApply('', '');
        onClose();
    };

    const handleQuickSelect = (range: 'today' | 'week' | 'month' | 'quarter' | 'year') => {
        const today = new Date();
        const to = today.toISOString().split('T')[0];
        let from = '';

        switch (range) {
            case 'today':
                from = to;
                break;
            case 'week':
                const weekAgo = new Date(today);
                weekAgo.setDate(today.getDate() - 7);
                from = weekAgo.toISOString().split('T')[0];
                break;
            case 'month':
                const monthAgo = new Date(today);
                monthAgo.setMonth(today.getMonth() - 1);
                from = monthAgo.toISOString().split('T')[0];
                break;
            case 'quarter':
                const quarterAgo = new Date(today);
                quarterAgo.setMonth(today.getMonth() - 3);
                from = quarterAgo.toISOString().split('T')[0];
                break;
            case 'year':
                const yearAgo = new Date(today);
                yearAgo.setFullYear(today.getFullYear() - 1);
                from = yearAgo.toISOString().split('T')[0];
                break;
        }

        setDateFrom(from);
        setDateTo(to);
        setSelectedQuickRange(range);
    };

    const handleDateFromChange = (value: string) => {
        setDateFrom(value);
        setSelectedQuickRange(null);
    };

    const handleDateToChange = (value: string) => {
        setDateTo(value);
        setSelectedQuickRange(null);
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto transform transition-all"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/40 rounded-xl grid place-items-center">
                                <Calendar size={20} className="text-[#4e80ee] dark:text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                    Date Range Filter
                                </h2>
                                <p className="text-[11px] text-gray-400 dark:text-slate-400 font-semibold uppercase tracking-wider">
                                    Select review date range
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 grid place-items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-6">
                        {/* Quick Select Buttons */}
                        <div>
                            <label className="block text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-3">
                                Quick Select
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => handleQuickSelect('today')}
                                    className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors border ${selectedQuickRange === 'today'
                                            ? 'bg-[#4e80ee] text-white border-[#4e80ee] shadow-md'
                                            : 'text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-900/50 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-[#4e80ee] dark:hover:text-blue-400 border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-600'
                                        }`}
                                >
                                    Today
                                </button>
                                <button
                                    onClick={() => handleQuickSelect('week')}
                                    className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors border ${selectedQuickRange === 'week'
                                            ? 'bg-[#4e80ee] text-white border-[#4e80ee] shadow-md'
                                            : 'text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-900/50 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-[#4e80ee] dark:hover:text-blue-400 border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-600'
                                        }`}
                                >
                                    Last 7 Days
                                </button>
                                <button
                                    onClick={() => handleQuickSelect('month')}
                                    className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors border ${selectedQuickRange === 'month'
                                            ? 'bg-[#4e80ee] text-white border-[#4e80ee] shadow-md'
                                            : 'text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-900/50 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-[#4e80ee] dark:hover:text-blue-400 border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-600'
                                        }`}
                                >
                                    Last Month
                                </button>
                                <button
                                    onClick={() => handleQuickSelect('quarter')}
                                    className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors border ${selectedQuickRange === 'quarter'
                                            ? 'bg-[#4e80ee] text-white border-[#4e80ee] shadow-md'
                                            : 'text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-900/50 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-[#4e80ee] dark:hover:text-blue-400 border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-600'
                                        }`}
                                >
                                    Last Quarter
                                </button>
                                <button
                                    onClick={() => handleQuickSelect('year')}
                                    className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors border ${selectedQuickRange === 'year'
                                            ? 'bg-[#4e80ee] text-white border-[#4e80ee] shadow-md'
                                            : 'text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-900/50 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-[#4e80ee] dark:hover:text-blue-400 border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-600'
                                        }`}
                                >
                                    Last Year
                                </button>
                            </div>
                        </div>

                        {/* Date Inputs */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="dateFrom" className="block text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                                    From Date
                                </label>
                                <input
                                    type="date"
                                    id="dateFrom"
                                    value={dateFrom}
                                    onChange={(e) => handleDateFromChange(e.target.value)}
                                    max={dateTo || undefined}
                                    className="w-full px-3 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                                />
                            </div>
                            <div>
                                <label htmlFor="dateTo" className="block text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                                    To Date
                                </label>
                                <input
                                    type="date"
                                    id="dateTo"
                                    value={dateTo}
                                    onChange={(e) => handleDateToChange(e.target.value)}
                                    min={dateFrom || undefined}
                                    className="w-full px-3 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        {/* Active Range Display */}
                        {dateFrom && dateTo && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <p className="text-xs font-bold text-blue-900 dark:text-blue-300">
                                    Selected Range: <span className="font-black">{dateFrom}</span> to <span className="font-black">{dateTo}</span>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between gap-3 px-6 py-4 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-700 rounded-b-2xl">
                        <button
                            onClick={handleClear}
                            className="px-4 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                        >
                            Clear Filter
                        </button>
                        <div className="flex gap-2">
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApply}
                                disabled={!dateFrom || !dateTo}
                                className="px-5 py-2.5 text-sm font-black text-white bg-[#4e80ee] rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-100 uppercase tracking-wider"
                            >
                                Apply Filter
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DateRangeModal;
