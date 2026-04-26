import React from "react";

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const InfoItem: React.FC<InfoItemProps> = ({ icon, label, value }) => {
  return (
    <div className="flex items-center gap-4 group">
      <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-slate-800/50 flex items-center justify-center text-gray-400 group-hover:text-[#4e80ee] group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-all duration-300">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">
          {label}
        </p>
        <p className="text-[13px] font-bold text-gray-700 dark:text-slate-300 truncate">
          {value}
        </p>
      </div>
    </div>
  );
};

export default InfoItem;
