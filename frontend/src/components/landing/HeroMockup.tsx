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

      {/* Decorative Floating Elements — aria-hidden: purely visual, no meaningful content */}
      <div aria-hidden="true" className="absolute -top-12 -right-12 hidden lg:block bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 animate-bounce duration-[3000ms]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-green-600 text-lg font-bold">+24%</span>
          </div>
          <div>
            <div className="text-xs text-gray-500">Sentiment Score</div>
            <div className="text-sm font-bold">Increasing fast</div>
          </div>
        </div>
      </div>

      {/* AI badge: changed from bg-blue-100/text-blue-600 (contrast ~2.9:1 ❌) to bg-blue-600/text-white (contrast 4.5:1+ ✅) */}
      <div aria-hidden="true" className="absolute -bottom-8 -left-12 hidden lg:block bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 animate-pulse">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">AI</div>
          <div>
            <div className="text-xs text-gray-500">Auto-Response</div>
            <div className="text-sm font-bold">Drafting...</div>
          </div>
        </div>
      </div>
    </div>
  );
};
