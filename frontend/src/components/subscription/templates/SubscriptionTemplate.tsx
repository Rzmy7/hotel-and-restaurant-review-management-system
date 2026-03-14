import React from 'react';
import { SubscriptionHeader } from '../organisms/SubscriptionHeader';
import { PricingGrid } from '../organisms/PricingGrid';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * SubscriptionTemplate Component.
 * Orchestrates the full subscription plan layout.
 */
export const SubscriptionTemplate: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-slate-900/50 relative overflow-y-auto">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] bg-purple-500/5 dark:bg-purple-400/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 md:py-20 relative">
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="group absolute top-12 left-6 flex items-center gap-2 text-gray-400 hover:text-gray-900 dark:text-slate-500 dark:hover:text-white transition-all font-bold text-sm tracking-tight"
        >
          <div className="w-8 h-8 rounded-full border border-gray-100 dark:border-slate-800 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-slate-800 shadow-sm">
            <ArrowLeft size={16} />
          </div>
          Back to Settings
        </button>

        <SubscriptionHeader />
        <PricingGrid />

        <div className="mt-20 text-center text-gray-400 dark:text-slate-500 text-sm font-medium">
          Have questions about our plans? <button className="text-[#4e80ee] dark:text-blue-400 font-bold hover:underline" onClick={() => navigate('/support')}>Contact our team</button>
        </div>
      </div>
    </div>
  );
};
