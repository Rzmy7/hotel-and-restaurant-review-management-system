import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { fetchSettings } from '../services/mockService';
import type { AdminSettings } from '../types';

export const Settings: React.FC = () => {
    const [settings, setSettings] = useState<AdminSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('general');
    const [maintenanceMode, setMaintenanceMode] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            const data = await fetchSettings();
            setSettings(data);
            setMaintenanceMode(data.maintenanceMode);
            setLoading(false);
        };
        loadData();
    }, []);

    if (loading || !settings) return <div className="p-8 text-gray-500">Loading...</div>;

    return (
        <div className="pt-4 max-w-5xl space-y-4">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                <div className="flex gap-1">
                    <button
                        className={`flex-1 px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                            activeTab === 'general'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                        onClick={() => setActiveTab('general')}
                    >
                        General
                    </button>
                    <button
                        className={`flex-1 px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                            activeTab === 'security'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                        onClick={() => setActiveTab('security')}
                    >
                        Security
                    </button>
                    <button
                        className={`flex-1 px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                            activeTab === 'notifications'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                        onClick={() => setActiveTab('notifications')}
                    >
                        Notifications
                    </button>
                </div>
            </div>

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
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Platform Name</label>
                                <input
                                    type="text"
                                    defaultValue={settings.platformName}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">System Timezone</label>
                                <input
                                    type="text"
                                    defaultValue={settings.timezone}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Language</label>
                                <input
                                    type="text"
                                    defaultValue={settings.language}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Format</label>
                                <input
                                    type="text"
                                    defaultValue={settings.dateFormat}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
                                <input
                                    type="text"
                                    defaultValue={settings.currency}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

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
                                    onChange={() => setMaintenanceMode(!maintenanceMode)}
                                />
                                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></div>
                            </div>
                        </label>
                    </div>

                    {/* Save Button */}
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
                            <h2 className="text-base font-semibold text-gray-900">Email Notifications</h2>
                            <p className="text-sm text-gray-500">Configure email notification preferences</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900">New Reviews</h3>
                                    <p className="text-sm text-gray-500">Receive email notifications when new reviews are submitted</p>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            defaultChecked
                                        />
                                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                                        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></div>
                                    </div>
                                </label>
                            </div>

                            <div className="border-t border-gray-100"></div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900">Low Rating Alerts</h3>
                                    <p className="text-sm text-gray-500">Get notified when a review with low rating is received</p>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            defaultChecked
                                        />
                                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                                        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></div>
                                    </div>
                                </label>
                            </div>

                            <div className="border-t border-gray-100"></div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900">Weekly Digest</h3>
                                    <p className="text-sm text-gray-500">Receive a weekly summary of platform activity</p>
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
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <div className="mb-4">
                            <h2 className="text-base font-semibold text-gray-900">App Notifications</h2>
                            <p className="text-sm text-gray-500">Configure in-app notification preferences</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900">System Alerts</h3>
                                    <p className="text-sm text-gray-500">Critical system notifications and maintenance updates</p>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            defaultChecked
                                        />
                                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                                        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></div>
                                    </div>
                                </label>
                            </div>

                            <div className="border-t border-gray-100"></div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900">Feature Updates</h3>
                                    <p className="text-sm text-gray-500">Notifications about new features and improvements</p>
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
