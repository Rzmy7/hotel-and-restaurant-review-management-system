
import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';


export const Header: React.FC = () => {
    const location = useLocation();

    const getHeaderContent = () => {
        switch (location.pathname) {
            case '/':
                return { title: 'Admin Dashboard', subtitle: 'Monitor and manage your platform' };
            case '/organizations':
                return { title: 'Organizations', subtitle: 'Manage organizations and their settings' };
            case '/users':
                return { title: 'Users', subtitle: 'Manage system users and roles' };
            case '/feature-flags':
                return { title: 'Feature Flags', subtitle: 'Manage global feature flags' };
            case '/settings':
                return { title: 'Admin Settings', subtitle: 'Configure platform settings' };
            default:
                return { title: 'Admin Panel', subtitle: 'Welcome back' };
        }
    };

    const { title, subtitle } = getHeaderContent();

    return (
        <header className="h-20 bg-gray-50 flex items-center justify-between px-6 ml-[280px] sticky top-0 z-40">
            <div className="flex flex-col">
                <h1 className="text-xl font-semibold text-gray-900 mb-1">{title}</h1>
                <p className="text-gray-500 text-sm">{subtitle}</p>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2 w-[300px] gap-2">
                    <Search size={18} className="text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="border-none outline-none text-sm text-gray-900 w-full bg-transparent placeholder-gray-400"
                    />
                </div>
                <button className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-gray-900 cursor-pointer hover:bg-gray-50 transition-colors">
                    <Bell size={20} />
                </button>
            </div>
        </header>
    );
};
