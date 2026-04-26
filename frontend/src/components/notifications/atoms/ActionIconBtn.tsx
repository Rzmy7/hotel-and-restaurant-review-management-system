import React from "react";

interface ActionIconBtnProps {
  icon: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  title?: string;
  variant?: "danger" | "primary" | "secondary";
}

const ActionIconBtn: React.FC<ActionIconBtnProps> = ({
  icon,
  onClick,
  title,
  variant = "secondary",
}) => {
  const variants = {
    danger:
      "text-gray-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400",
    primary:
      "text-blue-500 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20",
    secondary:
      "text-gray-300 hover:bg-gray-100 hover:text-gray-500 dark:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300",
  };

  return (
    <button
      onClick={onClick}
      className={`w-8 h-8 grid place-items-center rounded-lg bg-transparent border-none cursor-pointer transition-all shrink-0 ${variants[variant]}`}
      title={title}
    >
      {icon}
    </button>
  );
};

export default ActionIconBtn;
