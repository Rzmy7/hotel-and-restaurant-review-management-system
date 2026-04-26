import React, { forwardRef } from "react";
import { cn } from "./Input";

export interface ToggleProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, checked, onChange, ...props }, ref) => {
    return (
      <label
        className={cn(
          "relative inline-block w-12 h-[26px] cursor-pointer",
          className,
        )}
      >
        <input
          type="checkbox"
          className="opacity-0 w-0 h-0 peer"
          checked={checked}
          onChange={onChange}
          ref={ref}
          {...props}
        />
        <span className="absolute inset-0 bg-gray-300 dark:bg-slate-600 transition-all duration-300 rounded-[34px] peer-checked:bg-[#4e80ee] peer-focus:ring-4 peer-focus:ring-[#4e80ee]/20 before:absolute before:content-[''] before:h-5 before:w-5 before:left-[3px] before:bottom-[3px] before:bg-white dark:before:bg-slate-200 before:transition-all before:duration-300 before:rounded-full peer-checked:before:translate-x-[22px]"></span>
      </label>
    );
  },
);

Toggle.displayName = "Toggle";
