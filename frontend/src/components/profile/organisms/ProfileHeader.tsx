import React from "react";

interface ProfileHeaderProps {
  memberSince: string;
}

/**
 * Redesigned ProfileHeader.
 * Now supports dynamic memberSince
 */
const ProfileHeader: React.FC<ProfileHeaderProps> = ({ memberSince }) => {
  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 sticky top-0 z-[40] px-8 py-6 flex items-center justify-between transition-all duration-300">
      <div className="flex flex-col">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
            Account Profile
          </h1>
          <span className="text-[10px] font-black bg-[#4e80ee] text-white px-2 py-0.5 rounded-lg shadow-sm shadow-blue-100 uppercase tracking-widest">
            Identity
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">
          Manage your identity, security, and personal preferences
        </p>
      </div>

      <div className="flex items-center gap-4 max-md:hidden text-right">
        <div className="text-right">
          <p className="text-[10px] text-gray-400 dark:text-slate-500 font-black uppercase tracking-widest leading-none">
            Member Since
          </p>
          <p className="text-[12px] text-gray-600 dark:text-slate-300 font-bold mt-1">
            {memberSince || "N/A"}
          </p>
        </div>
      </div>
    </header>
  );
};

export default ProfileHeader;
