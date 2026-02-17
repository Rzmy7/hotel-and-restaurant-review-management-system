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
        <header className="w-full shrink-0 bg-white border-b border-gray-200 box-border px-8 py-5">
            <div className="max-w-[1400px] mx-auto flex items-center gap-4">
                <button
                    className="bg-transparent border-none cursor-pointer text-gray-500 p-1 flex items-center justify-center rounded-md hover:bg-gray-100 transition"
                    onClick={onMenuClick}
                >
                    <Menu size={24} />
                </button>
                <div className="flex flex-col">
                    <h1 className="text-2xl font-semibold text-gray-900 m-0 mb-1 leading-tight">
                        {title}
                    </h1>
                    <p className="text-sm text-gray-500 m-0 leading-none">
                        {subtitle}
                    </p>
                </div>
            </div>
        </header>
    );
};

export default ProfileHeader;