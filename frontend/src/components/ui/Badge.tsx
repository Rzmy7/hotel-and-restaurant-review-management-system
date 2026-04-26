import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "blue" | "amber" | "indigo" | "rose" | "emerald" | "gray";
  size?: "sm" | "md";
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "gray", size = "md", children, ...props }, ref) => {
    const variants = {
      blue: "bg-blue-50 text-blue-600 border-blue-100",
      amber: "bg-amber-50 text-amber-600 border-amber-100",
      indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
      rose: "bg-rose-50 text-rose-600 border-rose-100",
      emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
      gray: "bg-gray-50 text-gray-600 border-gray-100",
    };

    const sizes = {
      sm: "px-2 py-0.5 text-[10px]",
      md: "px-2.5 py-1 text-[11px]",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex font-black uppercase tracking-wider border rounded-md whitespace-nowrap",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {children}
      </span>
    );
  },
);

Badge.displayName = "Badge";
