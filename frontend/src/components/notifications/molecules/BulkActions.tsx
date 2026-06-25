import React, { useState } from 'react';
import { Trash2, CheckCheck } from 'lucide-react';

interface BulkActionsProps {
    unreadCount: number;
    totalCount: number;
    onMarkAllRead: () => void | Promise<void>;
    onClearAll: () => void | Promise<void>;
}

const BulkActions: React.FC<BulkActionsProps> = ({ unreadCount, totalCount, onMarkAllRead, onClearAll }) => {
    const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    const handleMarkAllReadClick = async () => {
        if (unreadCount === 0) {
            return;
        }

        setIsMarkingAllRead(true);
        try {
            await onMarkAllRead();
        } finally {
            setIsMarkingAllRead(false);
        }
    };

    const handleClearAllClick = async () => {
        setIsClearing(true);
        try {
            await onClearAll();
        } finally {
            setIsClearing(false);
        }
    };

    if (totalCount === 0) return null;

    return (
        <div className="flex items-center gap-3">
            <button
                onClick={handleMarkAllReadClick}
                disabled={isMarkingAllRead || unreadCount === 0}
                className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-black text-[#4e80ee] bg-blue-50/50 border border-blue-100 dark:border-blue-800/30 dark:bg-blue-900/20 rounded-xl uppercase tracking-widest transition-all hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:shadow-lg hover:shadow-blue-100 active:scale-95 translate-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <CheckCheck size={20} />
                {isMarkingAllRead ? 'Marking...' : 'Mark All as Read'}
            </button>
            <button
                onClick={handleClearAllClick}
                disabled={isClearing}
                className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-black text-gray-500 dark:text-slate-700 bg-gray-50/50 border border-gray-100 dark:border-slate-800 rounded-xl uppercase tracking-widest transition-all hover:bg-rose-500 hover:text-white hover:border-rose-500 hover:shadow-lg hover:shadow-rose-100 dark:hover:shadow-none active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Trash2 size={20} />
                {isClearing ? 'Clearing...' : 'Clear All Read Messages'}
            </button>
        </div>
    );
};

export default BulkActions;
