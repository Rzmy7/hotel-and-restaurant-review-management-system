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
        <div className="w-full shrink-0 bg-white border-b border-gray-200 box-border
      p-[14px_16px] 
      sm:p-[16px_20px] 
      md:p-[20px_24px] 
      lg:p-[24px_32px]"
        >
            <div className="max-w-[1400px] mx-auto flex items-center gap-4">
                <button
                    className="p-1 -ml-1 text-gray-600 hover:bg-gray-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
                    onClick={onMenuClick}
                >
                    <Menu size={24} />
                </button>
                <div className="flex flex-col">
                    <h1 className="font-semibold text-gray-900 m-0 mb-1 leading-tight
            text-[20px] 
            sm:text-[22px] 
            md:text-[24px] 
            lg:text-[28px]"
                    >
                        {title}
                    </h1>
                    <p className="text-gray-500 m-0 leading-none
            text-[12px] 
            md:text-[13px] 
            lg:text-[14px]"
                    >
                        {subtitle}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ProfileHeader;