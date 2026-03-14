import React from 'react';
import { BookOpen } from 'lucide-react';

interface ArticleItemProps {
  title: string;
  category: string;
  isNew?: boolean;
}

const TopArticleItem: React.FC<ArticleItemProps> = ({ title, category, isNew }) => {
  return (
    <button className="group w-full flex items-center gap-4 p-4 rounded-2xl border border-transparent hover:border-gray-100 dark:hover:border-slate-800 hover:bg-white dark:hover:bg-slate-800/50 transition-all duration-300 text-left">
      <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-400 group-hover:text-[#4e80ee] transition-colors duration-300">
        <BookOpen size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-[14px] font-bold text-gray-700 dark:text-gray-200 truncate group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
            {title}
          </p>
          {isNew && (
            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          )}
        </div>
        <p className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
          {category}
        </p>
      </div>
    </button>
  );
};

export default TopArticleItem;
