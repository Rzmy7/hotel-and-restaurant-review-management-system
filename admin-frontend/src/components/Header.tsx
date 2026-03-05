import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, HelpCircle, Save } from 'lucide-react';

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
                return { title: 'Feature Flags', subtitle: 'Enable or disable features across the platform' };
            case '/settings':
                return { title: 'Admin Settings', subtitle: 'Configure platform settings' };
            case '/embeddings':
                return { title: 'AI Configuration & Embeddings', subtitle: 'Manage embedding models, thresholds, and vector database connections.' };
            case '/scraping':
                return { title: 'Scraping Management', subtitle: '' };
            case '/api-manage':
                return { title: 'API Management', subtitle: 'Manage API credentials and service endpoints' };
            default:
                return { title: 'Admin Panel', subtitle: 'Welcome back' };
        }
    };

    const { title, subtitle } = getHeaderContent();
    const isEmbeddingsPage = location.pathname === '/embeddings';
    const isScrapingPage = location.pathname === '/scraping';

    return (
        <header className="fixed top-0 left-64 right-0 h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-10">
            <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                {isScrapingPage && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full border border-gray-200">
                        System V1.0
                    </span>
                )}
                {subtitle && <p className="text-sm text-gray-500 hidden">{subtitle}</p>}
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
                ) : isScrapingPage ? (
                    <>
                        <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                            <Bell size={20} />
                        </button>
                        <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                            <HelpCircle size={18} />
                            Support
                        </button>
                    </>
                ) : (
                    <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                        <Bell size={20} />
                    </button>
                )}
            </div>
        </header>
    );
};
