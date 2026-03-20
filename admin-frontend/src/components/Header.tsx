import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, AlertCircle } from 'lucide-react';
import { fetchSettings } from '../services/mockService';
import { toggleMaintenanceMode } from '../services/mockService';

export const Header: React.FC = () => {
    const location = useLocation();
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load maintenance status on mount
    useEffect(() => {
        const loadMaintenanceStatus = async () => {
            try {
                const settings = await fetchSettings();
                setMaintenanceMode(settings.maintenanceMode);
            } catch (err) {
                console.error('Failed to load maintenance status:', err);
            }
        };
        loadMaintenanceStatus();
    }, []);

    const handleMaintenanceToggle = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await toggleMaintenanceMode(!maintenanceMode);
            if (response.success) {
                setMaintenanceMode(response.maintenanceMode);
            } else {
                setError('Failed to toggle maintenance mode');
            }
        } catch (err) {
            setError('Error toggling maintenance mode');
            console.error('Maintenance toggle error:', err);
        } finally {
            setIsLoading(false);
        }
    };

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
            case '/monitoring':
                return { title: 'System Monitoring', subtitle: 'Real-time server status and performance metrics' };
            case '/subscription-plans':
                return { title: 'Subscription Plans', subtitle: 'Manage pricing tiers, features, and availability for your customers' };
            case '/broadcasting':
                return { title: 'Message Broadcasting', subtitle: 'Send announcements, alerts, and notifications to your user base' };
            default:
                return { title: 'Admin Panel', subtitle: 'Welcome back' };
        }
    };

    const { title, subtitle } = getHeaderContent();

    return (
        <header className="fixed top-0 left-64 right-0 h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-10">
            <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
                {subtitle && <p className="text-sm text-gray-500 hidden">{subtitle}</p>}
            </div>

            <div className="flex items-center gap-4">
                {/* Maintenance Mode Button */}
                <button
                    onClick={handleMaintenanceToggle}
                    disabled={isLoading}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        maintenanceMode
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 disabled:opacity-50'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
                    }`}
                    title={maintenanceMode ? 'Click to disable maintenance mode' : 'Click to enable maintenance mode'}
                >
                    <AlertCircle size={16} />
                    <span>{maintenanceMode ? 'Maintenance ON' : 'Maintenance OFF'}</span>
                    {isLoading && <span className="animate-spin">⏳</span>}
                </button>

                {/* Error indicator */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded px-2 py-1 text-xs text-red-700">
                        {error}
                    </div>
                )}

                {/* Bell notification */}
                <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                    <Bell size={20} />
                </button>
            </div>
        </header>
    );
};
