import React from 'react';

interface PricingBadgeProps {
  label: string;
  type?: 'popular' | 'value';
}

/**
 * PricingBadge Atom.
 * Displays stylized tags like "Most Popular" or "Best Value".
 */
export const PricingBadge: React.FC<PricingBadgeProps> = ({ label, type = 'popular' }) => {
  const styles = type === 'popular' 
    ? 'bg-blue-500 text-white dark:bg-blue-600' 
    : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800';

  return (
    <span className={`absolute -top-3 right-6 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md ${styles}`}>
      {label}
    </span>
  );
};
