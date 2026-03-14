import React from 'react';
import { Search } from 'lucide-react';

interface HelpSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

const HelpSearch: React.FC<HelpSearchProps> = ({ onSearch, placeholder = "Search for articles, guides, or keywords..." }) => {
  return (
    <div className="relative group max-w-2xl mx-auto">
      <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#4e80ee] transition-colors duration-300">
        <Search size={20} />
      </div>
      <input
        type="text"
        onChange={(e) => onSearch(e.target.value)}
        className="w-full bg-white dark:bg-slate-800/80 backdrop-blur-md border border-gray-100 dark:border-slate-700 h-16 pl-14 pr-6 rounded-3xl text-gray-700 dark:text-white shadow-xl shadow-gray-100 dark:shadow-none focus:outline-none focus:ring-2 focus:ring-[#4e80ee]/20 focus:border-[#4e80ee] transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-slate-500 font-medium"
        placeholder={placeholder}
      />
      <div className="absolute inset-y-0 right-4 flex items-center">
          <span className="hidden md:inline-flex items-center px-2 py-1 rounded-lg border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
              ESC to clear
          </span>
      </div>
    </div>
  );
};

export default HelpSearch;
