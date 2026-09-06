import React from 'react';
import dashboardPreview from '../../assets/dashboard-preview.png';

export const HeroMockup = () => {
  return (
    <div className="relative mx-auto max-w-5xl">
      {/* Decorative Glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
      
      <div className="relative bg-white dark:bg-slate-800 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        {/* Browser Top Bar — decorative browser frame */}
        <div aria-hidden="true" className="bg-gray-100/90 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 md:px-6 py-3 md:py-3.5 flex items-center">
          <div className="flex space-x-2 shrink-0">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-amber-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
          </div>
          <div className="flex-1 max-w-xs sm:max-w-md mx-auto h-6 sm:h-7 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg flex items-center justify-center px-3 text-[11px] sm:text-xs text-gray-400 dark:text-gray-500 font-mono truncate select-none shadow-sm">
            https://app.reviewmate.com/dashboard
          </div>
        </div>

        {/* Real Screenshot Preview */}
        <div className="relative overflow-hidden bg-slate-50">
          <img 
            src={dashboardPreview} 
            alt="ReviewMate Live Dashboard Preview" 
            className="w-full h-auto object-cover block"
            loading="eager"
          />
        </div>
      </div>
    </div>
  );
};
