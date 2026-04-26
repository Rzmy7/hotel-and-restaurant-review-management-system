import React from "react";
import TopArticleItem from "../atoms/TopArticleItem";

const topArticles = [
  {
    title: "Quick Start: Configuring your first review source",
    category: "Basics",
    isNew: true,
  },
  {
    title: "Understanding the sentiment analysis algorithm",
    category: "Analytics",
  },
  { title: "How to export monthly performance reports", category: "Reports" },
  { title: "Setting up custom notification alerts", category: "System" },
  {
    title: "Whitelabeling your client-facing dashboard",
    category: "Enterprise",
  },
];

const HelpTopArticles: React.FC = () => {
  return (
    <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm rounded-3xl border border-gray-100 dark:border-slate-800 p-8 shadow-sm">
      <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase mb-6 flex items-center justify-between">
        Top Articles
        <span className="text-[10px] font-black text-[#4e80ee] uppercase tracking-widest">
          Trending Now
        </span>
      </h3>
      <div className="space-y-2">
        {topArticles.map((article, i) => (
          <TopArticleItem key={i} {...article} />
        ))}
      </div>
      <button className="w-full mt-6 py-4 rounded-2xl bg-gray-50 dark:bg-slate-900/50 text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
        View All Documentation
      </button>
    </div>
  );
};

export default HelpTopArticles;
