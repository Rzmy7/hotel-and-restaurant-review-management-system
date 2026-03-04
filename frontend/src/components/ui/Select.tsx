import React, { forwardRef } from 'react';
import { cn } from './Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    options: { label: string; value: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, options, ...props }, ref) => {
        return (
            <select
                className={cn(
                    "w-full px-4 py-2.5 bg-gray-50/50 border border-gray-100 rounded-xl text-[13px] font-bold text-gray-700 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-[#4e80ee] transition-all outline-none cursor-pointer appearance-none",
                    className
                )}
                ref={ref}
                {...props}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        );
    }
);

Select.displayName = 'Select';
