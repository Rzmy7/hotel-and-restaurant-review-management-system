import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';

export const MainLayout: React.FC = () => {
    return (
        <div style={{ minHeight: '100vh' }}>
            <Sidebar />
            <Header />
            <main style={{
                marginLeft: '280px',
                padding: 'var(--space-xl)',
                minHeight: 'calc(100vh - 80px)'
            }}>
                <Outlet />
            </main>
        </div>
    );
};
