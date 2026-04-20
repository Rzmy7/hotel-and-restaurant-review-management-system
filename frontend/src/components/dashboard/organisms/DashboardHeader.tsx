import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CalendarDays, ChevronDown, Check } from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';
import NotificationPanel from '../../shared/NotificationPanel';
import ProfileDropdown from '../../shared/ProfileDropdown';
import OrganizationSwitcher from '../../shared/OrganizationSwitcher';
import { useOrganizationStore } from '../../../stores/useOrganizationStore';
import PageHeader from '../../shared/PageHeader';
import { notificationsService } from '../../../services/notificationsService';
import { useAuth } from '../../../contexts/AuthContext';

export interface DateRangeOption {
    label: string;
    value: number; // 0 = all time, otherwise number of days
}

const DATE_RANGE_OPTIONS: DateRangeOption[] = [
    { label: 'Last 7 Days', value: 7 },
    { label: 'Last 30 Days', value: 30 },
    { label: 'Last Year', value: 365 },
    { label: 'All Time', value: 0 },
];

export interface DashboardHeaderProps {
    period: number;
    onPeriodChange: (period: number) => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ period, onPeriodChange }) => {
    const navigate = useNavigate();
    const { exchangeTokenForOrganization } = useAuth();
    const organizations = useOrganizationStore(state => state.organizations);
    const currentOrg = useOrganizationStore(state => state.currentOrg);
    const switchOrganization = useOrganizationStore(state => state.switchOrganization);
    const { showToast } = useToast();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const notifRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);
    const datePickerRef = useRef<HTMLDivElement>(null);

    const currentOption = DATE_RANGE_OPTIONS.find(opt => opt.value === period) || DATE_RANGE_OPTIONS[3];

    // Close panels on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setShowNotifications(false);
            }
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setShowProfile(false);
            }
            if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
                setShowDatePicker(false);
            }
        };
        if (showNotifications || showProfile || showDatePicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showNotifications, showProfile, showDatePicker]);

    useEffect(() => {
        const refreshUnreadCount = async () => {
            try {
                const result = await notificationsService.getUnreadCount();
                setUnreadCount(result.count || 0);
            } catch (error) {
                console.error('Failed to load unread notifications count:', error);
            }
        };

        refreshUnreadCount();
        const intervalId = window.setInterval(refreshUnreadCount, 30000);

        return () => window.clearInterval(intervalId);
    }, []);

    const toggleNotifications = () => {
        setShowNotifications((prev) => !prev);
        setShowProfile(false);
        setShowDatePicker(false);
    };

    const toggleProfile = () => {
        setShowProfile((prev) => !prev);
        setShowNotifications(false);
        setShowDatePicker(false);
    };

    const toggleDatePicker = () => {
        setShowDatePicker((prev) => !prev);
        setShowNotifications(false);
        setShowProfile(false);
    };

    const handleDateRangeSelect = (option: DateRangeOption) => {
        onPeriodChange(option.value);
        setShowDatePicker(false);
    };

    const titleComponent = currentOrg ? (
        <OrganizationSwitcher
            currentOrg={currentOrg}
            organizations={organizations}
            onSwitch={async (orgId) => {
                try {
                    await exchangeTokenForOrganization(orgId);
                    switchOrganization(orgId);
                } catch (e) {
                    showToast("Failed to switch organization", "error");
                }
            }}
            onAdd={() => navigate('/setup')}
        />
    ) : null;

    return (
        <PageHeader title={titleComponent}>
            {/* Date Range Picker */}
                <div className="relative" ref={datePickerRef}>
                    <button
                        id="date-range-picker-btn"
                        className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-[13px] font-bold cursor-pointer transition-all active:scale-95 shadow-sm ${
                            showDatePicker
                                ? 'bg-blue-50 border-blue-400 text-blue-600 shadow-md dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-400'
                                : 'bg-gray-50/50 border-gray-200 text-gray-600 hover:bg-white hover:border-blue-400 hover:text-blue-600 hover:shadow-md dark:bg-slate-800/50 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800 dark:hover:text-blue-400 dark:hover:border-blue-500'
                        }`}
                        onClick={toggleDatePicker}
                    >
                        <CalendarDays size={16} className={showDatePicker ? 'text-blue-500' : 'text-gray-400'} />
                        <span>{currentOption.label}</span>
                        <ChevronDown
                            size={14}
                            className={`transition-transform duration-200 ${showDatePicker ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {showDatePicker && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl shadow-gray-200/50 dark:shadow-black/30 z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                            {DATE_RANGE_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    id={`date-range-option-${option.value}`}
                                    className={`w-full flex items-center justify-between px-4 py-2.5 text-[13px] font-semibold cursor-pointer transition-all duration-150 ${
                                        period === option.value
                                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-slate-700/50 dark:hover:text-white'
                                    }`}
                                    onClick={() => handleDateRangeSelect(option)}
                                >
                                    <span>{option.label}</span>
                                    {period === option.value && (
                                        <Check size={14} className="text-blue-500 dark:text-blue-400" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

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
