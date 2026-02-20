import React from 'react';

interface SettingsHeaderProps {
    // onMenuClick removed — sidebar toggle is now built into the sidebar itself
}

const SettingsHeader: React.FC<SettingsHeaderProps> = () => {
    return (
        <header className="flex justify-between items-center px-8 py-5 bg-white border-b border-gray-200 transition-all">
            <div className="flex items-center gap-4">
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
