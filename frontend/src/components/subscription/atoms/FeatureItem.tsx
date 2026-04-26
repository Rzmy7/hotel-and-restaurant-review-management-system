import React from "react";
import { Check } from "lucide-react";

interface FeatureItemProps {
  label: string;
  isIncluded?: boolean;
}

/**
 * FeatureItem Atom.
 * Renders a feature description with a checkmark.
 */
export const FeatureItem: React.FC<FeatureItemProps> = ({
  label,
  isIncluded = true,
}) => {
  return (
    <div className="flex items-start gap-3 py-1">
      <div
        className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isIncluded ? "bg-emerald-50 text-emerald-500 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-gray-50 text-gray-300 dark:bg-slate-800 dark:text-slate-600"}`}
      >
        <Check size={12} strokeWidth={3} />
      </div>
      <span
        className={`text-[13px] font-medium transition-colors ${isIncluded ? "text-gray-600 dark:text-gray-300" : "text-gray-400 dark:text-slate-600 line-through"}`}
      >
        {label}
      </span>
    </div>
  );
};
