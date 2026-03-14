import React from 'react';
import { Trash2, CheckCheck } from 'lucide-react';

interface BulkActionsProps {
    unreadCount: number;
    totalCount: number;
    onMarkAllRead: () => void;
    onClearAll: () => void;
}

const BulkActions: React.FC<BulkActionsProps> = ({ unreadCount, totalCount, onMarkAllRead, onClearAll }) => {
    if (totalCount === 0) return null;

    return (
        <div className="flex items-center gap-3">
            {unreadCount > 0 && (
                <button
                    onClick={onMarkAllRead}
                    className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-black text-[#4e80ee] bg-blue-50/50 border border-blue-100 dark:border-blue-800/30 dark:bg-blue-900/20 rounded-xl uppercase tracking-widest transition-all hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:shadow-lg hover:shadow-blue-100 active:scale-95 translate-all duration-300"
                >
                    <CheckCheck size={16} />
                    Mark All Read
                </button>
            )}
            <button
                onClick={onClearAll}
                className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-black text-gray-400 dark:text-slate-500 bg-gray-50/50 border border-gray-100 dark:border-slate-800 rounded-xl uppercase tracking-widest transition-all hover:bg-rose-500 hover:text-white hover:border-rose-500 hover:shadow-lg hover:shadow-rose-100 dark:hover:shadow-none active:scale-95 transition-all duration-300"
            >
                <Trash2 size={16} />
                Clear System
            </button>
        </div>
    );
};

export default BulkActions;
