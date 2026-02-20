import React from 'react';

const NotificationsHeader: React.FC = () => {
    return (
        <header className="flex justify-between items-center px-8 py-5 bg-white border-b border-gray-200 transition-all">
            <div className="flex items-center gap-4">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-semibold text-gray-900 m-0 leading-tight">
                        Notifications
                    </h1>
                    <p className="mt-1 text-[13px] text-gray-400 m-0 leading-none">
                        View and manage all your notifications
                    </p>
                </div>
            </div>
        </header>
    );
};

export default NotificationsHeader;
