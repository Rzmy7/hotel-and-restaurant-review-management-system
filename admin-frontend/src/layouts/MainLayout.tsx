import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { useMaintenanceModePoller } from '../hooks/useMaintenanceModePoller';

export const MainLayout: React.FC = () => {
    // Check maintenance mode on every reload and every 5 minutes
    useMaintenanceModePoller();

    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar />
            <Header />
            <main className="ml-64 pt-20 p-8 min-h-screen">
                <Outlet />
            </main>
        </div>
    );
};
