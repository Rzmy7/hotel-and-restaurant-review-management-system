import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Tabs } from '../components/Tabs';
import { emitMaintenanceModeUpdated, maintenanceService, onMaintenanceModeUpdated } from '../services/maintenanceService';
import { settingsService } from '../services/settingsService';
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
    const [settings, setSettings] = useState<AdminSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('general');
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [isMaintenanceSaving, setIsMaintenanceSaving] = useState(false);
    const [maintenanceError, setMaintenanceError] = useState<string | null>(null);
    const [generalSaveState, setGeneralSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [generalSaveError, setGeneralSaveError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const data = await settingsService.getGeneralSettings();
                setSettings({
                    ...defaultSettings,
                    timezone: data.timezone,
                    language: data.language,
                    dateFormat: data.dateFormat,
                    currency: data.currency,
                });

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

    if (loading || !settings) return <LoadingSpinner />;

    const timezoneOptionExists = TIMEZONE_OPTIONS.some(option => option.value === settings.timezone);
    const timezoneOptions = timezoneOptionExists
        ? TIMEZONE_OPTIONS
        : [{ value: settings.timezone, label: `Custom - ${settings.timezone}` }, ...TIMEZONE_OPTIONS];

    return (
        <div className="pt-4 max-w-5xl space-y-4">
            {/* Tabs */}
            <Tabs
                tabs={[
                    { id: 'general', label: 'General' },
                    { id: 'security', label: 'Security' },
                    { id: 'notifications', label: 'Notifications' }
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
            />

            {activeTab === 'general' && (
                <div className="space-y-4">
                    {/* General Settings Card */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <div className="mb-4">
                            <h2 className="text-base font-semibold text-gray-900">General Settings</h2>
                            <p className="text-sm text-gray-500">Configure basic platform settings and preferences</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">System Timezone</label>
                                <select
                                    value={settings.timezone}
                                    onChange={(event) => handleGeneralSettingChange('timezone', event.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    {timezoneOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
                                <input
                                    type="text"
                                    value={settings.currency}
                                    onChange={(event) => handleGeneralSettingChange('currency', event.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    {generalSaveState === 'saved' && (
                        <div className="text-sm text-green-600">General settings saved.</div>
                    )}
                    {(generalSaveState === 'error' && generalSaveError) && (
                        <div className="text-sm text-red-600">{generalSaveError}</div>
                    )}

                    {/* Maintenance Mode Card */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900">Maintenance Mode</h3>
                            <p className="text-sm text-gray-500">Enable maintenance mode to prevent users from accessing the platform</p>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={maintenanceMode}
                                    onChange={(event) => handleMaintenanceChange(event.target.checked)}
                                    disabled={isMaintenanceSaving}
                                />
                                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></div>
                            </div>
                        </label>
                    </div>
                    {maintenanceError && (
                        <div className="text-sm text-red-600">{maintenanceError}</div>
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
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <div className="mb-4">
                            <h2 className="text-base font-semibold text-gray-900">Security Settings</h2>
                            <p className="text-sm text-gray-500">Configure security and authentication settings</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900">Two-Factor Authentication</h3>
                                    <p className="text-sm text-gray-500">Require two-factor authentication for all admin accounts</p>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                                        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></div>
                                    </div>
                                </label>
                            </div>

                            <div className="border-t border-gray-100"></div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-1">Password Strength Requirement</label>
                                <p className="text-sm text-gray-500 mb-2">Set minimum password strength requirements for user accounts</p>
                                <input
                                    type="text"
                                    defaultValue={settings.passwordStrength}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="border-t border-gray-100"></div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-1">Session Timeout</label>
                                <p className="text-sm text-gray-500 mb-2">Automatically log out users after a period of inactivity</p>
                                <input
                                    type="text"
                                    defaultValue={settings.sessionTimeout}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            {activeTab === 'notifications' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <div className="mb-4">
                            <h2 className="text-base font-semibold text-gray-900">Admin Notifications</h2>
                            <p className="text-sm text-gray-500">Configure operational alerts for administrators</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900">API Limit Reaching</h3>
                                    <p className="text-sm text-gray-500">Get alerted when API usage is close to configured limits</p>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            defaultChecked={settings.notifyApiLimitReaching}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                                        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></div>
                                    </div>
                                </label>
                            </div>

                            <div className="border-t border-gray-100"></div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900">Server Overloading</h3>
                                    <p className="text-sm text-gray-500">Notify when server resource usage stays above safe thresholds</p>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            defaultChecked={settings.notifyServerOverloading}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                                        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></div>
                                    </div>
                                </label>
                            </div>

                            <div className="border-t border-gray-100"></div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900">Server Connection Failed</h3>
                                    <p className="text-sm text-gray-500">Alert when backend services or databases lose connectivity</p>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            defaultChecked={settings.notifyServerConnectionFailed}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                                        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></div>
                                    </div>
                                </label>
                            </div>

                            <div className="border-t border-gray-100"></div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900">Scraping Failures</h3>
                                    <p className="text-sm text-gray-500">Receive notifications when scraping jobs fail or repeatedly error</p>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            defaultChecked={settings.notifyScrapingFailures}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                                        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></div>
                                    </div>
                                </label>
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
        </div>
    );
};
