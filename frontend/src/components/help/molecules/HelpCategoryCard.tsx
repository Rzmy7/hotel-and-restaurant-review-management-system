import React from "react";
import { ChevronRight } from "lucide-react";

interface CategoryCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  count: number;
  onClick: () => void;
}

const HelpCategoryCard: React.FC<CategoryCardProps> = ({
  icon,
  title,
  description,
  count,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className="group p-8 rounded-3xl bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:bg-white dark:hover:bg-slate-800 hover:-translate-y-1 transition-all duration-300 text-left w-full"
    >
      <div className="flex flex-col h-full">
        <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-700 shadow-sm border border-gray-100 dark:border-slate-600 flex items-center justify-center text-[#4e80ee] mb-6 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase">
              {title}
            </h3>
            <span className="text-[10px] font-black bg-blue-50 dark:bg-blue-900/20 text-[#4e80ee] px-2 py-0.5 rounded-lg uppercase tracking-widest">
              {count} Docs
            </span>
          </div>
          <p className="text-[13px] text-gray-500 dark:text-slate-400 leading-relaxed font-medium">
            {description}
          </p>
        </div>

        <div className="mt-8 flex items-center gap-2 text-[11px] font-black text-[#4e80ee] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-x-[-10px] group-hover:translate-x-0">
          Explore Guides
          <ChevronRight size={14} />
        </div>
      </div>
    </button>
  );
};

export default HelpCategoryCard;
