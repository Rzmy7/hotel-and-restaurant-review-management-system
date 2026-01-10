
import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import './Header.css';

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
        <header className="header">
            <div className="header-content">
                <h1>{title}</h1>
                <p>{subtitle}</p>
            </div>

            <div className="header-actions">
                <div className="search-bar">
                    <Search size={18} color="#9ca3af" />
                    <input type="text" placeholder="Search..." />
                </div>
                <button className="icon-btn">
                    <Bell size={20} />
                </button>
            </div>
        </header>
    );
};
