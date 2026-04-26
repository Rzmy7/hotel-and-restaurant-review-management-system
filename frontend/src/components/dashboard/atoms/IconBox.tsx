import React from "react";

export interface IconBoxProps {
  icon: React.ReactNode;
  colorScheme?: "blue" | "amber" | "indigo" | "rose" | "emerald";
  className?: string;
}

export const IconBox: React.FC<IconBoxProps> = ({
  icon,
  colorScheme = "blue",
  className = "",
}) => {
  const schemes = {
    blue: {
      bg: "bg-blue-50 dark:bg-blue-900/30",
      icon: "text-[#4e80ee] dark:text-blue-400",
    },
    amber: {
      bg: "bg-amber-50 dark:bg-amber-900/30",
      icon: "text-amber-600 dark:text-amber-400",
    },
    indigo: {
      bg: "bg-indigo-50 dark:bg-indigo-900/30",
      icon: "text-indigo-600 dark:text-indigo-400",
    },
    rose: {
      bg: "bg-rose-50 dark:bg-rose-900/30",
      icon: "text-rose-600 dark:text-rose-400",
    },
    emerald: {
      bg: "bg-emerald-50 dark:bg-emerald-900/30",
      icon: "text-emerald-600 dark:text-emerald-400",
    },
  };

  const scheme = schemes[colorScheme];

  return (
    <div
      className={`w-10 h-10 flex items-center justify-center rounded-xl ${scheme.bg} ${scheme.icon} transition-transform duration-300 group-hover:scale-105 ${className}`}
    >
      {icon}
    </div>
  );
};
