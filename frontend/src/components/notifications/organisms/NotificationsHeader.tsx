import React from 'react';

/**
 * Redesigned NotificationsHeader.
 * Follows the premium design language of the notifications pages.
 */
const NotificationsHeader: React.FC = () => {
    return (
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 sticky top-0 z-[40] px-8 py-6 flex items-center justify-between transition-all duration-300">
            <div className="flex flex-col">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
                        Notification Center
                    </h1>
                    <span className="text-[10px] font-black bg-[#4e80ee] text-white px-2 py-0.5 rounded-lg shadow-sm shadow-blue-100 uppercase tracking-widest">
                        System Logs
                    </span>
                </div>
                <p className="mt-0.5 text-[11px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">
                    Track critical alerts, announcement updates, and system insights
                </p>
            </div>

            {/* Actions could go here, like global settings or refresh */}
            <div className="flex items-center gap-4">
                <div className="text-right max-md:hidden">
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 font-black uppercase tracking-widest leading-none">
                        Last Synchronized
                    </p>
                    <p className="text-[12px] text-gray-600 dark:text-slate-300 font-bold mt-1">
                        Just Now
                    </p>
                </div>
            </div>
        </header>
    );
};

export default NotificationsHeader;
