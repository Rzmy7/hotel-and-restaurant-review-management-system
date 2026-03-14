import React from 'react';

/**
 * SupportHeader component.
 */
const SupportHeader: React.FC = () => {
    return (
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 sticky top-0 z-[40] px-8 py-6 flex items-center justify-between transition-all duration-300">
            <div className="flex flex-col">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
                        Get Support
                    </h1>
                    <span className="text-[10px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-lg shadow-sm uppercase tracking-widest">
                        24/7 Active
                    </span>
                </div>
                <p className="mt-0.5 text-[11px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">
                    Submit tickets, live chat, or talk to our consultants
                </p>
            </div>
            
            <div className="flex items-center gap-4 max-md:hidden text-right">
                <div className="text-right">
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 font-black uppercase tracking-widest leading-none">
                        Avg Response Time
                    </p>
                    <p className="text-[12px] text-emerald-500 font-bold mt-1 uppercase tracking-wider">
                        &lt; 15 Minutes
                    </p>
                </div>
            </div>
        </header>
    );
};

export default SupportHeader;
