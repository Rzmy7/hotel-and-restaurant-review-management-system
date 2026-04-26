import React from "react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
}) => {
  return (
    <header className="flex justify-between items-center px-8 py-5 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 transition-all max-md:flex-col max-md:items-start max-md:gap-4">
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white m-0 leading-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-[13px] text-gray-400 dark:text-slate-400 m-0 leading-none">
              {description}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {actions}
        </div>
      )}
    </header>
  );
};
