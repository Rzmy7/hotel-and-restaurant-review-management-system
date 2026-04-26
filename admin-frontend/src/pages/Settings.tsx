import React, { useEffect, useState } from 'react';
import { Save, X, KeyRound, Sun, Moon, Monitor } from 'lucide-react';
import { Alert } from '../components/Alert';
import { ToggleSwitch } from '../components/ToggleSwitch';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Tabs } from '../components/Tabs';
import { emitMaintenanceModeUpdated, maintenanceService, onMaintenanceModeUpdated } from '../services/maintenanceService';
import { settingsService } from '../services/settingsService';
import type { SecuritySettings } from '../services/settingsService';
import { useTheme } from '../contexts/ThemeContext';
import type { AdminSettings } from '../types';

interface TimezoneOption {
    value: string;
    label: string;
}

const TIMEZONE_OPTIONS: TimezoneOption[] = [
    { value: 'UTC', label: 'UTC +00:00' },
    { value: 'Europe/London', label: 'United Kingdom +00:00/+01:00' },
    { value: 'Europe/Berlin', label: 'Germany +01:00/+02:00' },
    { value: 'Europe/Moscow', label: 'Russia (Moscow) +03:00' },
    { value: 'Asia/Dubai', label: 'UAE +04:00' },
    { value: 'Asia/Kolkata', label: 'India +05:30' },
    { value: 'Asia/Colombo', label: 'Sri Lanka +5.30' },
    { value: 'Asia/Dhaka', label: 'Bangladesh +06:00' },
    { value: 'Asia/Bangkok', label: 'Thailand +07:00' },
    { value: 'Asia/Singapore', label: 'Singapore +08:00' },
    { value: 'Asia/Tokyo', label: 'Japan +09:00' },
    { value: 'Australia/Sydney', label: 'Australia (Sydney) +10:00/+11:00' },
    { value: 'Pacific/Auckland', label: 'New Zealand +12:00/+13:00' },
    { value: 'America/New_York', label: 'USA (New York) -05:00/-04:00' },
    { value: 'America/Chicago', label: 'USA (Chicago) -06:00/-05:00' },
    { value: 'America/Denver', label: 'USA (Denver) -07:00/-06:00' },
    { value: 'America/Los_Angeles', label: 'USA (Los Angeles) -08:00/-07:00' },
    { value: 'America/Sao_Paulo', label: 'Brazil -03:00' },
];

const defaultSettings: AdminSettings = {
    timezone: 'UTC',
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD ($)',
    maintenanceMode: false,
    twoFactorAuth: true,
    passwordStrength: 'Strong (Alpha-numeric + Special Char)',
    sessionTimeout: '30 Minutes',
    allowNewSignups: false,
    notifyApiLimitReaching: true,
    notifyServerOverloading: true,
    notifyServerConnectionFailed: true,
    notifyScrapingFailures: true,
};

export const Settings: React.FC = () => {
    const { theme, setTheme } = useTheme();
    const [settings, setSettings] = useState<AdminSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('general');
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [isMaintenanceSaving, setIsMaintenanceSaving] = useState(false);
    const [maintenanceError, setMaintenanceError] = useState<string | null>(null);
    const [generalSaveState, setGeneralSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [generalSaveError, setGeneralSaveError] = useState<string | null>(null);
    const [adminProfileName, setAdminProfileName] = useState('System Admin');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [adminProfileSaveState, setAdminProfileSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [adminProfileError, setAdminProfileError] = useState<string | null>(null);

    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordModalError, setPasswordModalError] = useState<string | null>(null);
    const [passwordModalSaveState, setPasswordModalSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    // Security settings state
    const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
        userSessionTimeoutMinutes: 60,
        adminSessionTimeoutMinutes: 60,
    });
    const [securitySaveState, setSecuritySaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [securitySaveError, setSecuritySaveError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [data, profile, security] = await Promise.all([
                    settingsService.getGeneralSettings(),
                    settingsService.getAdminProfile(),
                    settingsService.getSecuritySettings(),
                ]);
                setSettings({
                    ...defaultSettings,
                    timezone: data.timezone,
                    language: data.language,
                    dateFormat: data.dateFormat,
                    currency: data.currency,
                });
                setAdminProfileName(profile.name || 'System Admin');
                setSecuritySettings(security);

                const status = await maintenanceService.getStatus();
                setMaintenanceMode(!!status.maintenanceMode);
            } catch {
                setSettings(defaultSettings);
                setMaintenanceMode(defaultSettings.maintenanceMode);
            } finally {
                setLoading(false);
            }
        };
        loadData();

        const unsubscribe = onMaintenanceModeUpdated((nextMode) => {
            setMaintenanceMode(nextMode);
        });

        return unsubscribe;
    }, []);

    const handleMaintenanceChange = async (nextMode: boolean) => {
        setIsMaintenanceSaving(true);
        setMaintenanceError(null);

        try {
            const response = await maintenanceService.setStatus(nextMode);
            if (!response.success) {
                throw new Error('Failed to update maintenance mode');
            }

            setMaintenanceMode(response.maintenanceMode);
            emitMaintenanceModeUpdated(response.maintenanceMode);
        } catch (error) {
            console.error('Failed to update maintenance mode:', error);
            setMaintenanceError('Failed to update maintenance mode. Please try again.');
        } finally {
            setIsMaintenanceSaving(false);
        }
    };

    const handleGeneralSettingChange = (key: keyof AdminSettings, value: string) => {
        setSettings(prev => (prev ? { ...prev, [key]: value } : prev));
        setGeneralSaveState('idle');
        setGeneralSaveError(null);
    };

    const handleSaveGeneralSettings = async () => {
        if (!settings || generalSaveState === 'saving') {
            return;
        }

        setGeneralSaveState('saving');
        setGeneralSaveError(null);

        try {
            const saved = await settingsService.updateGeneralSettings({
                timezone: settings.timezone,
                language: settings.language,
                dateFormat: settings.dateFormat,
                currency: settings.currency,
            });

            setSettings(prev => (
                prev
                    ? {
                          ...prev,
                          timezone: saved.timezone,
                          language: saved.language,
                          dateFormat: saved.dateFormat,
                          currency: saved.currency,
                      }
                    : prev
            ));

            setGeneralSaveState('saved');
            window.setTimeout(() => setGeneralSaveState('idle'), 2500);
        } catch (error) {
            console.error('Failed to save general settings:', error);
            setGeneralSaveState('error');
            setGeneralSaveError(
                error instanceof Error
                    ? error.message
                    : 'Failed to save general settings. Please try again.',
            );
        }
    };

    const handleSaveAdminProfile = async () => {
        if (adminProfileSaveState === 'saving') {
            return;
        }

        setAdminProfileError(null);

        if (!adminProfileName.trim()) {
            setAdminProfileSaveState('error');
            setAdminProfileError('Admin name cannot be empty.');
            return;
        }

        setAdminProfileSaveState('saving');

        try {
            const updated = await settingsService.updateAdminProfile({
                name: adminProfileName.trim(),
            });

            setAdminProfileName(updated.name);
            setAdminProfileSaveState('saved');
            window.setTimeout(() => setAdminProfileSaveState('idle'), 2500);
        } catch (error) {
            setAdminProfileSaveState('error');
            setAdminProfileError(
                error instanceof Error
                    ? error.message
                    : 'Failed to save admin profile. Please try again.',
            );
        }
    };

    const handleChangePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordModalError(null);

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            setPasswordModalSaveState('error');
            setPasswordModalError('All fields are required.');
            return;
        }

        if (newPassword.length < 8) {
            setPasswordModalSaveState('error');
            setPasswordModalError('New password must be at least 8 characters.');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setPasswordModalSaveState('error');
            setPasswordModalError('New password and confirm password do not match.');
            return;
        }

        setPasswordModalSaveState('saving');
        try {
            await settingsService.changeAdminPassword({
                currentPassword,
                newPassword,
            });
            setPasswordModalSaveState('saved');
            setTimeout(() => {
                setIsPasswordModalOpen(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmNewPassword('');
                setPasswordModalSaveState('idle');
            }, 1500);
        } catch (error) {
            setPasswordModalSaveState('error');
            setPasswordModalError(
                error instanceof Error ? error.message : 'Failed to change password.'
            );
        }
    };

    if (loading || !settings) return <LoadingSpinner />;

    const timezoneOptionExists = TIMEZONE_OPTIONS.some(option => option.value === settings.timezone);
    const timezoneOptions = timezoneOptionExists
        ? TIMEZONE_OPTIONS
        : [{ value: settings.timezone, label: `Custom - ${settings.timezone}` }, ...TIMEZONE_OPTIONS];

    return (
        <div className="space-y-6 pt-4">
            {/* Tabs */}
            <Tabs
                tabs={[
                    { id: 'general', label: 'General' },
                    { id: 'security', label: 'Security' },
                    { id: 'notifications', label: 'Notifications' },
                    { id: 'admin-profile', label: 'Admin Profile' }
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
            />

            {activeTab === 'general' && (
                <div className="space-y-4">
                    {/* General Settings Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
                        <div className="mb-4">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-white">General Settings</h2>
                            <p className="text-sm text-gray-500 dark:text-slate-400">Configure basic platform settings and preferences</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">System Timezone</label>
                                <select
                                    value={settings.timezone}
                                    onChange={(event) => handleGeneralSettingChange('timezone', event.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    {timezoneOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Currency</label>
                                <input
                                    type="text"
                                    value={settings.currency}
                                    onChange={(event) => handleGeneralSettingChange('currency', event.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Appearance + Maintenance Mode - side by side */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Theme / Dark Mode Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Appearance</h3>
                                <p className="text-sm text-gray-500 dark:text-slate-400">Choose your preferred theme for the admin panel</p>
                            </div>
                            <div className="flex gap-3">
                                {[
                                    { value: 'light' as const, label: 'Light', icon: Sun },
                                    { value: 'dark' as const, label: 'Dark', icon: Moon },
                                    { value: 'system' as const, label: 'System', icon: Monitor },
                                ].map(({ value, label, icon: Icon }) => (
                                    <button
                                        key={value}
                                        onClick={() => setTheme(value)}
                                        className={`flex-1 flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border-2 transition-all duration-200 ${
                                            theme === value
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm'
                                                : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-500 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                                        }`}
                                    >
                                        <Icon size={18} />
                                        <span className="text-xs font-medium">{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Maintenance Mode Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 flex flex-col justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Maintenance Mode</h3>
                                <p className="text-sm text-gray-500 dark:text-slate-400">Enable maintenance mode to prevent users from accessing the platform</p>
                            </div>
                            <div className="flex justify-end">
                                <ToggleSwitch
                                    checked={maintenanceMode}
                                    onChange={handleMaintenanceChange}
                                    disabled={isMaintenanceSaving}
                                />
                            </div>
                        </div>
                    </div>

                    {maintenanceError && (
                        <Alert type="error" message={maintenanceError} />
                    )}

                    {generalSaveError && (
                        <Alert type="error" message={generalSaveError} />
                    )}

                    {/* Save Button */}
                    <div className="flex justify-end">
                        <button
                            onClick={handleSaveGeneralSettings}
                            disabled={generalSaveState === 'saving'}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            <Save size={16} />
                            {generalSaveState === 'saving' ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'security' && (
                <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
                        <div className="mb-4">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Security Settings</h2>
                            <p className="text-sm text-gray-500 dark:text-slate-400">Configure security and authentication settings</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Two-Factor Authentication</h3>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">Require two-factor authentication for all admin accounts</p>
                                </div>
                                <ToggleSwitch
                                    checked={settings.twoFactorAuth}
                                    onChange={() => {}}
                                />
                            </div>

                            <div className="border-t border-gray-100 dark:border-slate-700"></div>

                            {/* User Session Timeout */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">User Session Timeout</label>
                                <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">Automatically log out regular users after a period of inactivity</p>
                                <select
                                    id="user-session-timeout"
                                    value={securitySettings.userSessionTimeoutMinutes}
                                    onChange={(e) => {
                                        setSecuritySettings(prev => ({ ...prev, userSessionTimeoutMinutes: Number(e.target.value) }));
                                        setSecuritySaveState('idle');
                                        setSecuritySaveError(null);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value={15}>15 Minutes</option>
                                    <option value={30}>30 Minutes</option>
                                    <option value={60}>1 Hour</option>
                                    <option value={120}>2 Hours</option>
                                    <option value={240}>4 Hours</option>
                                    <option value={480}>8 Hours</option>
                                    <option value={720}>12 Hours</option>
                                    <option value={1440}>24 Hours</option>
                                    <option value={4320}>3 Days</option>
                                    <option value={10080}>7 Days</option>
                                </select>
                            </div>

                            <div className="border-t border-gray-100 dark:border-slate-700"></div>

                            {/* Admin Session Timeout */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">Admin Session Timeout</label>
                                <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">Automatically log out administrators after a period of inactivity</p>
                                <select
                                    id="admin-session-timeout"
                                    value={securitySettings.adminSessionTimeoutMinutes}
                                    onChange={(e) => {
                                        setSecuritySettings(prev => ({ ...prev, adminSessionTimeoutMinutes: Number(e.target.value) }));
                                        setSecuritySaveState('idle');
                                        setSecuritySaveError(null);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value={15}>15 Minutes</option>
                                    <option value={30}>30 Minutes</option>
                                    <option value={60}>1 Hour</option>
                                    <option value={120}>2 Hours</option>
                                    <option value={240}>4 Hours</option>
                                    <option value={480}>8 Hours</option>
                                    <option value={720}>12 Hours</option>
                                    <option value={1440}>24 Hours</option>
                                    <option value={4320}>3 Days</option>
                                    <option value={10080}>7 Days</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {securitySaveState === 'saved' && (
                        <Alert type="success" message="Security settings saved successfully." />
                    )}
                    {(securitySaveState === 'error' && securitySaveError) && (
                        <Alert type="error" message={securitySaveError} />
                    )}

                    <div className="flex justify-end">
                        <button
                            onClick={async () => {
                                if (securitySaveState === 'saving') return;
                                setSecuritySaveState('saving');
                                setSecuritySaveError(null);
                                try {
                                    const saved = await settingsService.updateSecuritySettings(securitySettings);
                                    setSecuritySettings(saved);
                                    setSecuritySaveState('saved');
                                    window.setTimeout(() => setSecuritySaveState('idle'), 2500);
                                } catch (error) {
                                    setSecuritySaveState('error');
                                    setSecuritySaveError(
                                        error instanceof Error
                                            ? error.message
                                            : 'Failed to save security settings. Please try again.',
                                    );
                                }
                            }}
                            disabled={securitySaveState === 'saving'}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            <Save size={16} />
                            {securitySaveState === 'saving' ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'notifications' && (
                <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
                        <div className="mb-4">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Admin Notifications</h2>
                            <p className="text-sm text-gray-500 dark:text-slate-400">Configure operational alerts for administrators</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">API Limit Reaching</h3>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">Get alerted when API usage is close to configured limits</p>
                                </div>
                                <ToggleSwitch
                                    checked={settings.notifyApiLimitReaching}
                                    onChange={() => {}}
                                />
                            </div>

                            <div className="border-t border-gray-100 dark:border-slate-700"></div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Server Overloading</h3>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">Notify when server resource usage stays above safe thresholds</p>
                                </div>
                                <ToggleSwitch
                                    checked={settings.notifyServerOverloading}
                                    onChange={() => {}}
                                />
                            </div>

                            <div className="border-t border-gray-100 dark:border-slate-700"></div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Server Connection Failed</h3>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">Alert when backend services or databases lose connectivity</p>
                                </div>
                                <ToggleSwitch
                                    checked={settings.notifyServerConnectionFailed}
                                    onChange={() => {}}
                                />
                            </div>

                            <div className="border-t border-gray-100 dark:border-slate-700"></div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Scraping Failures</h3>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">Receive notifications when scraping jobs fail or repeatedly error</p>
                                </div>
                                <ToggleSwitch
                                    checked={settings.notifyScrapingFailures}
                                    onChange={() => {}}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={() => alert('Settings saved successfully!')}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            <Save size={16} />
                            Save Changes
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'admin-profile' && (
                <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
                        <div className="mb-4">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Admin Profile</h2>
                            <p className="text-sm text-gray-500 dark:text-slate-400">Update administrator identity and password</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">Admin Name</label>
                                <input
                                    type="text"
                                    value={adminProfileName}
                                    onChange={(event) => {
                                        setAdminProfileName(event.target.value);
                                        setAdminProfileError(null);
                                        setAdminProfileSaveState('idle');
                                    }}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div className="border-t border-gray-100 dark:border-slate-700"></div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Admin Password</h3>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">Change your administrator account password</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsPasswordModalOpen(true)}
                                    className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <KeyRound size={16} />
                                    Change Password
                                </button>
                            </div>
                        </div>
                    </div>

                    {adminProfileSaveState === 'saved' && (
                        <Alert type="success" message="Admin profile saved." />
                    )}
                    {(adminProfileSaveState === 'error' && adminProfileError) && (
                        <Alert type="error" message={adminProfileError} />
                    )}

                    <div className="flex justify-end">
                        <button
                            onClick={handleSaveAdminProfile}
                            disabled={adminProfileSaveState === 'saving'}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            <Save size={16} />
                            {adminProfileSaveState === 'saving' ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            )}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/30">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Change Password</h3>
                            <button
                                onClick={() => setIsPasswordModalOpen(false)}
                                className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 dark:text-slate-400 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleChangePasswordSubmit} className="p-6 space-y-4">
                            {(passwordModalSaveState === 'error' && passwordModalError) && (
                                <Alert type="error" message={passwordModalError} />
                            )}
                            {passwordModalSaveState === 'saved' && (
                                <Alert type="success" message="Password changed successfully!" />
                            )}
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">Current Password</label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => {
                                        setCurrentPassword(e.target.value);
                                        setPasswordModalError(null);
                                        setPasswordModalSaveState('idle');
                                    }}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => {
                                        setNewPassword(e.target.value);
                                        setPasswordModalError(null);
                                        setPasswordModalSaveState('idle');
                                    }}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                    placeholder="At least 8 characters"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={confirmNewPassword}
                                    onChange={(e) => {
                                        setConfirmNewPassword(e.target.value);
                                        setPasswordModalError(null);
                                        setPasswordModalSaveState('idle');
                                    }}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsPasswordModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={passwordModalSaveState === 'saving'}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {passwordModalSaveState === 'saving' ? 'Saving...' : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
