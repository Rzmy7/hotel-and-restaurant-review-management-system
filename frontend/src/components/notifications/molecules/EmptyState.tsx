import React from "react";
import { Bell } from "lucide-react";

interface EmptyStateProps {
  isFiltered: boolean;
  activeFilterLabel: string;
  onReset: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  isFiltered,
  activeFilterLabel,
  onReset,
}) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col items-center justify-center py-24 px-6 text-center animate-in fade-in zoom-in duration-500">
      <div className="w-20 h-20 rounded-3xl bg-gray-50 dark:bg-slate-900 grid place-items-center mb-6 shadow-inner ring-1 ring-gray-100 dark:ring-slate-700">
        <Bell size={32} className="text-gray-200 dark:text-slate-700" />
      </div>
      <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight m-0">
        {isFiltered ? `No ${activeFilterLabel} notifications` : "System Clear"}
      </h3>
      <p className="text-sm text-gray-400 dark:text-slate-400 font-medium m-0 mt-2 max-w-[320px] leading-relaxed">
        {isFiltered
          ? "Try adjusting your filters to see other types of updates from your analytics engine."
          : "You have addressed all pending items. New insights and alerts will appear here as they arrive."}
      </p>
      {isFiltered && (
        <button
          onClick={onReset}
          className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 dark:shadow-none transform hover:-translate-y-0.5 active:scale-95"
        >
          View All Notifications
        </button>
      )}
    </div>
  );
};

export default EmptyState;
