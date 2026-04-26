import React, { forwardRef } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "w-full px-4 py-2.5 bg-gray-50/50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 rounded-xl text-[13px] font-bold text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-blue-500/5 focus:border-[#4e80ee] transition-all outline-none",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
