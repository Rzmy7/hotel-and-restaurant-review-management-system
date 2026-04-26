import React from "react";

interface PageHeaderProps {
  title?: React.ReactNode;
  subtitle?: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  children,
}) => {
  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 sticky top-0 z-[40] px-8 py-5 flex items-center justify-between transition-all duration-300">
      <div className="flex flex-col">
        <div className="flex items-center gap-3">
          {typeof title === "string" ? (
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
              {title}
            </h1>
          ) : (
            title
          )}
          {badge && (
            <span className="text-[10px] font-black bg-[#4e80ee] text-white px-2 py-0.5 rounded-lg shadow-sm shadow-blue-100 uppercase tracking-widest">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="mt-0.5 text-[11px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">
            {subtitle}
          </p>
        )}
      </div>

      {children && <div className="flex items-center gap-4">{children}</div>}
    </header>
  );
};

export default PageHeader;
