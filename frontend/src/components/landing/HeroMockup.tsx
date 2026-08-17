import React from 'react';

export const HeroMockup = () => {
  return (
    <div className="relative mx-auto max-w-5xl">
      {/* Decorative Glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
      
      <div className="relative bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        {/* Browser Top Bar — decorative, hidden from assistive technologies */}
        <div aria-hidden="true" className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-6 py-4 flex items-center space-x-2">
          <div className="flex space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-amber-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
          </div>
          <div className="flex-1 max-w-md mx-auto h-7 bg-gray-200/50 dark:bg-slate-800/50 rounded-lg"></div>
        </div>

        {/* Mockup Content — decorative placeholder UI, hidden from assistive technologies */}
        <div aria-hidden="true" className="p-8 flex h-[400px] md:h-[500px]">
          {/* Sidebar Placeholder */}
          <div className="hidden md:flex flex-col w-48 space-y-6 mr-8 border-r border-gray-100 dark:border-slate-800 pr-8">
            <div className="w-full h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg"></div>
            <div className="w-3/4 h-6 bg-gray-100 dark:bg-slate-700 rounded-lg"></div>
            <div className="w-full h-6 bg-gray-100 dark:bg-slate-700 rounded-lg"></div>
            <div className="w-2/3 h-6 bg-gray-100 dark:bg-slate-700 rounded-lg"></div>
            <div className="w-5/6 h-6 bg-gray-100 dark:bg-slate-700 rounded-lg"></div>
          </div>

          {/* Main Dashboard Content */}
          <div className="flex-1 space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="w-12 h-4 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
                  <div className="w-20 h-8 bg-blue-200 dark:bg-blue-900/50 rounded-lg"></div>
                </div>
              ))}
            </div>

            {/* Charts Placeholder */}
            <div className="flex-1 bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 rounded-2xl p-8">
              <div className="flex justify-between items-end h-full gap-4">
                {[40, 70, 45, 90, 65, 80, 55, 95, 75, 85].map((h, i) => (
                  <div 
                    key={i} 
                    className="flex-1 bg-blue-500/20 dark:bg-blue-600/20 rounded-t-lg transition-all duration-1000"
                    style={{ height: `${h}%` }}
                  >
                    <div 
                      className="w-full bg-blue-600 rounded-t-lg"
                      style={{ height: '30%', marginTop: '70%' }}
                    ></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
