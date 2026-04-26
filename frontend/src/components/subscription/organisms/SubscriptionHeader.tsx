import React from "react";

/**
 * SubscriptionHeader Organism.
 * Renders the top hero section for the subscription page.
 */
export const SubscriptionHeader: React.FC = () => {
  return (
    <div className="text-center space-y-4 mb-20 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="inline-flex px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 mb-2">
        <span className="text-[11px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-[2px]">
          Simple, Transparent Pricing
        </span>
      </div>
      <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tighter max-w-2xl mx-auto leading-[1.1]">
        Scale your reputation with{" "}
        <span className="text-[#4e80ee] italic">AI intelligence.</span>
      </h1>
      <p className="text-lg text-gray-500 dark:text-slate-400 font-medium max-w-xl mx-auto">
        Choose the perfect plan for your property. Upgrade, downgrade, or cancel
        anytime.
      </p>
    </div>
  );
};
