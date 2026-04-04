import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, BookOpen, LayoutDashboard } from 'lucide-react';

const NoOrganizationPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[600px] bg-gray-50 dark:bg-slate-900 p-8 text-center">

            {/* Icon */}
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6">
                <Building2 size={32} />
            </div>

            {/* Heading */}
            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">
                No Organization Found
            </h2>
            <p className="text-gray-500 dark:text-slate-400 max-w-md mx-auto mb-8 font-medium">
                You're not linked to any organization yet.
                Create one to start collecting and managing your reviews.
            </p>

            {/* Primary CTA */}
            <button
                id="create-organization-btn"
                onClick={() => navigate('/setup')}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none mb-6 active:scale-95"
            >
                <Building2 size={16} />
                Create Organization
                <ArrowRight size={16} />
            </button>

            {/* Secondary links */}
            <div className="flex items-center gap-4">
                <button
                    id="go-to-dashboard-btn"
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-1.5 text-sm font-bold text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors uppercase tracking-widest"
                >
                    <LayoutDashboard size={14} />
                    Dashboard
                </button>
                <span className="text-gray-200 dark:text-slate-700">|</span>
                <button
                    id="view-help-btn"
                    onClick={() => navigate('/help')}
                    className="flex items-center gap-1.5 text-sm font-bold text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors uppercase tracking-widest"
                >
                    <BookOpen size={14} />
                    Help Guide
                </button>
            </div>

            {/* Footer hint */}
            <p className="mt-8 text-xs text-gray-400 dark:text-slate-500 font-medium">
                Already part of an organization?{' '}
                <button
                    onClick={() => window.location.reload()}
                    className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 underline underline-offset-2 transition-colors"
                >
                    Refresh the page
                </button>{' '}
                to sync your access.
            </p>
        </div>
    );
};

export default NoOrganizationPage;