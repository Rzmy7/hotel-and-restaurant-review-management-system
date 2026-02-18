import React from 'react';
import { Menu } from 'lucide-react';

interface SettingsHeaderProps {
    onMenuClick?: () => void;
}

const SettingsHeader: React.FC<SettingsHeaderProps> = ({ onMenuClick }) => {
    return (
        <header className="flex justify-between items-center px-8 py-5 bg-white border-b border-gray-200 transition-all">
            <div className="flex items-center gap-4">
                <button
                    className="bg-transparent border-none cursor-pointer text-gray-500 p-1 flex items-center justify-center rounded-md hover:bg-gray-100 transition mt-0.5"
                    onClick={onMenuClick}
                >
                    <Menu size={24} />
                </button>
                <div className="flex flex-col">
                    <h1 className="text-2xl font-semibold text-gray-900 m-0 leading-tight">
                        Settings
                    </h1>
                    <p className="mt-1 text-[13px] text-gray-400 m-0 leading-none">
                        Manage your account and application preferences
                    </p>
                </div>
            </div>
        </header>
    );
};

export default SettingsHeader;
