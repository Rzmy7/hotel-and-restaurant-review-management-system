import React, { forwardRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, type = 'text', ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "w-full px-4 py-3 bg-[#0B1021]/80 border border-slate-800/80 rounded-xl text-[13px] font-medium text-slate-200 placeholder:text-slate-500 focus:bg-[#0B1021] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none",
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);

Input.displayName = 'Input';
