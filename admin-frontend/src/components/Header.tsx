import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Search, HelpCircle, Save } from 'lucide-react';

export const Header: React.FC = () => {
    const location = useLocation();

    const getHeaderContent = () => {
        switch (location.pathname) {
            case '/':
                return { title: 'Admin Dashboard', subtitle: 'Monitor and manage your platform' };
            case '/organizations':
                return { title: 'Organizations', subtitle: 'Manage organizations and their settings' };
            case '/users':
                return { title: 'Users', subtitle: 'Manage user accounts and permissions' };
            case '/feature-flags':
                return { title: 'Feature Flags', subtitle: 'Manage global feature flags' };
            case '/settings':
                return { title: 'Admin Settings', subtitle: 'Configure platform settings' };
            case '/embeddings':
                return { title: 'AI Configuration & Embeddings', subtitle: 'Manage embedding models, thresholds, and vector database connections.' };
            case '/scraping':
                return { title: 'Scraping', subtitle: 'Configure scraping settings' };
            case '/api-manage':
                return { title: 'API Manage', subtitle: 'Manage API keys and access' };
            default:
                return { title: 'Admin Panel', subtitle: 'Welcome back' };
        }
    };

    const { title, subtitle } = getHeaderContent();
    const isEmbeddingsPage = location.pathname === '/embeddings';

    return (
        <header className="fixed top-0 left-64 right-0 h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-10">
            <div>
                <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                <p className="text-sm text-gray-500">{subtitle}</p>
            </div>

            <div className="flex items-center gap-4">
                {isEmbeddingsPage ? (
                    <>
                        <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                            <HelpCircle size={18} />
                            Documentation
                        </button>
                        <button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
                            <Save size={18} />
                            Save Changes
                        </button>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2.5 w-64">
                            <Search size={18} className="text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="bg-transparent border-none outline-none text-sm text-gray-600 placeholder-gray-400 w-full"
                            />
                        </div>
                        <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                            <Bell size={20} />
                        </button>
                    </>
                )}
            </div>
        </header>
    );
};
