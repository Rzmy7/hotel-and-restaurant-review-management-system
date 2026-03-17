import React, { useState, useRef, useEffect } from 'react';
import { Bell, CalendarDays } from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';
import NotificationPanel from '../../shared/NotificationPanel';
import ProfileDropdown from '../../shared/ProfileDropdown';
import OrganizationSwitcher from '../../shared/OrganizationSwitcher';
import { useOrganizationStore } from '../../../stores/useOrganizationStore';
import PageHeader from '../../shared/PageHeader';

export const DashboardHeader: React.FC = () => {
    const organizations = useOrganizationStore(state => state.organizations);
    const currentOrg = useOrganizationStore(state => state.currentOrg);
    const switchOrganization = useOrganizationStore(state => state.switchOrganization);
    const addOrganization = useOrganizationStore(state => state.addOrganization);
    const { showToast } = useToast();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [unreadCount, setUnreadCount] = useState(3);
    const notifRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    // Close panels on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setShowNotifications(false);
            }
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setShowProfile(false);
            }
        };
        if (showNotifications || showProfile) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showNotifications, showProfile]);

    const toggleNotifications = () => {
        setShowNotifications((prev) => !prev);
        setShowProfile(false);
    };

    const toggleProfile = () => {
        setShowProfile((prev) => !prev);
        setShowNotifications(false);
    };

    const titleComponent = currentOrg ? (
        <OrganizationSwitcher
            currentOrg={currentOrg}
            organizations={organizations}
            onSwitch={switchOrganization}
            onAdd={addOrganization}
        />
    ) : null;

    return (
        <PageHeader title={titleComponent}>
            {/* Modern Date Range Picker */}
                <button
                    className="flex items-center gap-2 px-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-[13px] font-bold text-gray-600 cursor-pointer transition-all hover:bg-white hover:border-blue-400 hover:text-blue-600 hover:shadow-md active:scale-95 shadow-sm dark:bg-slate-800/50 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800 dark:hover:text-blue-400 dark:hover:border-blue-500"
                    onClick={() => showToast('Date range picker coming soon', 'info')}
                >
                    <CalendarDays size={16} className="text-gray-400 group-hover:text-blue-500" />
                    <span>Last 30 Days</span>
                </button>

                {/* Improved Notification Bell */}
                <div className="relative" ref={notifRef}>
                    <button
                        className={`w-10 h-10 grid place-items-center rounded-xl cursor-pointer relative transition-all duration-300 active:scale-90 ${showNotifications
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/20'
                            : 'bg-white border border-gray-200 text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:hover:border-blue-500 dark:hover:text-blue-400'
                            }`}
                        onClick={toggleNotifications}
                    >
                        <Bell size={20} className={showNotifications ? 'animate-bounce' : ''} />
                        {unreadCount > 0 && !showNotifications && (
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white ring-2 ring-red-500/20 shadow-sm animate-pulse" />
                        )}
                    </button>

                    {showNotifications && (
                        <NotificationPanel
                            onClose={() => setShowNotifications(false)}
                            onUnreadCountChange={(count) => setUnreadCount(count)}
                        />
                    )}
                </div>

                {/* User Profile - Sophisticated Avatar */}
                <div className="relative" ref={profileRef}>
                    <button
                        className={`w-10 h-10 flex items-center justify-center rounded-xl font-black text-sm cursor-pointer border-2 transition-all duration-300 hover:shadow-lg ${showProfile
                            ? 'bg-blue-600 text-white border-blue-200 ring-4 ring-blue-50 scale-105 dark:border-blue-800 dark:ring-blue-900/50'
                            : 'bg-blue-500 text-white border-transparent hover:scale-105 active:scale-95 dark:bg-blue-600'
                            }`}
                        onClick={toggleProfile}
                    >
                        L
                    </button>

                    {showProfile && (
                        <ProfileDropdown onClose={() => setShowProfile(false)} />
                    )}
                </div>
        </PageHeader>
    );
};

export default DashboardHeader;
