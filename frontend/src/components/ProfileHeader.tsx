import React from "react";
import { Menu } from "lucide-react";

interface ProfileHeaderProps {
  title: string;
  subtitle: string;
  onMenuClick?: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  title,
  subtitle,
  onMenuClick,
}) => {
  return (
    <div className="bg-white border-b border-gray-200 px-8 py-6 w-full box-border flex-shrink-0">
      <div className="max-w-[1400px] mx-auto flex items-center gap-4">
        <button className="bg-transparent border-none cursor-pointer text-gray-500 p-1 flex items-center justify-center rounded-md transition-colors duration-200 hover:bg-gray-100" onClick={onMenuClick}>
          <Menu size={24} />
        </button>
        <div>
          <h1 className="text-[28px] font-semibold text-gray-900 m-0 mb-1 md:text-2xl sm:text-[22px] xs:text-xl">{title}</h1>
          <p className="text-sm text-gray-500 m-0 md:text-[13px] xs:text-xs">{subtitle}</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
