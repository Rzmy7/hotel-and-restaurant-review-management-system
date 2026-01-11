import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { fetchSettings } from '../services/mockService';
import type { AdminSettings } from '../types';


export const Settings: React.FC = () => {
    const [settings, setSettings] = useState<AdminSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('general');

    useEffect(() => {
        const loadData = async () => {
            const data = await fetchSettings();
            setSettings(data);
            setLoading(false);
        };
        loadData();
    }, []);

    if (loading || !settings) return <div>Loading...</div>;

    return (
        <div className="max-w-[1000px] mx-auto">
            <div className="mb-6">
                <p className="text-gray-500 text-sm">Configure platform settings and preferences</p>
            </div>

            <div className="flex gap-6 border-b border-gray-200 mb-6">
                <button
                    className={`py-3 px-1 bg-transparent border-none text-[0.95rem] cursor-pointer relative font-medium transition-colors ${activeTab === 'general' ? 'text-blue-500 after:content-[""] after:absolute after:-bottom-[1px] after:left-0 after:w-full after:h-0.5 after:bg-blue-500' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('general')}
                >
                    General
                </button>
                <button
                    className={`py-3 px-1 bg-transparent border-none text-[0.95rem] cursor-pointer relative font-medium transition-colors ${activeTab === 'security' ? 'text-blue-500 after:content-[""] after:absolute after:-bottom-[1px] after:left-0 after:w-full after:h-0.5 after:bg-blue-500' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('security')}
                >
                    Security
                </button>
                <button
                    className={`py-3 px-1 bg-transparent border-none text-[0.95rem] cursor-pointer relative font-medium transition-colors ${activeTab === 'notifications' ? 'text-blue-500 after:content-[""] after:absolute after:-bottom-[1px] after:left-0 after:w-full after:h-0.5 after:bg-blue-500' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('notifications')}
                >
                    Notifications
                </button>
            </div>

            {activeTab === 'general' && (
                <div className="flex flex-col gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold mb-1">General Settings</h2>
                            <p className="text-gray-500 text-sm">Configure basic platform settings and preferences</p>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-gray-500">Platform Name</label>
                                <input type="text" defaultValue={settings.platformName} className="w-full py-2.5 px-3 border border-gray-200 rounded-md text-[0.95rem] outline-none bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-gray-500">System Timezone</label>
                                <input type="text" defaultValue={settings.timezone} className="w-full py-2.5 px-3 border border-gray-200 rounded-md text-[0.95rem] outline-none bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-gray-500">Default Language</label>
                                <input type="text" defaultValue={settings.language} className="w-full py-2.5 px-3 border border-gray-200 rounded-md text-[0.95rem] outline-none bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-gray-500">Date Format</label>
                                <input type="text" defaultValue={settings.dateFormat} className="w-full py-2.5 px-3 border border-gray-200 rounded-md text-[0.95rem] outline-none bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />
                            </div>
                            <div className="flex flex-col gap-2 col-span-2">
                                <label className="text-sm font-medium text-gray-500">Currency</label>
                                <input type="text" defaultValue={settings.currency} className="w-full py-2.5 px-3 border border-gray-200 rounded-md text-[0.95rem] outline-none bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-start p-6 bg-white border border-gray-200 rounded-lg">
                        <div className="mb-1">
                            <h3 className="text-base font-semibold mb-1">Maintenance Mode</h3>
                            <p className="text-gray-500 text-sm">Enable maintenance mode to prevent users from accessing the platform</p>
                        </div>
                        <label className="toggle-switch">
                            <input type="checkbox" className="toggle-input" defaultChecked={settings.maintenanceMode} />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>

                    <div className="flex justify-end mt-6">
                        <button className="bg-slate-900 text-white px-6 py-2.5 rounded-md font-medium flex items-center gap-2 border-none cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => alert('Settings saved successfully!')}>
                            <Save size={18} />
                            Save Changes
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'security' && (
                <div className="flex flex-col gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold mb-1">Security Settings</h2>
                            <p className="text-gray-500 text-sm">Configure security and authentication settings</p>
                        </div>

                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-[0.95rem] font-medium mb-1">Two-Factor Authentication</h3>
                                <p className="text-gray-500 text-sm">Require two-factor authentication for all admin accounts</p>
                            </div>
                            <label className="toggle-switch">
                                <input type="checkbox" className="toggle-input" defaultChecked={settings.twoFactorAuth} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="h-[1px] bg-gray-200 my-6"></div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-900 mb-1">Password Strength Requirement</label>
                            <p className="text-gray-500 text-sm mb-2">Set minimum password strength requirements for user accounts</p>
                            <input type="text" defaultValue={settings.passwordStrength} className="w-full py-2.5 px-3 border border-gray-200 rounded-md text-[0.95rem] outline-none bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />
                        </div>

                        <div className="h-[1px] bg-gray-200 my-6"></div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-900 mb-1">Session Timeout</label>
                            <p className="text-gray-500 text-sm mb-2">Automatically log out users after a period of inactivity</p>
                            <input type="text" defaultValue={settings.sessionTimeout} className="w-full py-2.5 px-3 border border-gray-200 rounded-md text-[0.95rem] outline-none bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />
                        </div>

                        <div className="h-[1px] bg-gray-200 my-6"></div>

                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-[0.95rem] font-medium mb-1">Allow New Admin Signups</h3>
                                <p className="text-gray-500 text-sm">Enable new administrators to sign up without invitation</p>
                            </div>
                            <label className="toggle-switch">
                                <input type="checkbox" className="toggle-input" defaultChecked={settings.allowNewSignups} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="flex justify-end mt-6">
                            <button className="bg-slate-900 text-white px-6 py-2.5 rounded-md font-medium flex items-center gap-2 border-none cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => alert('Settings saved successfully!')}>
                                <Save size={18} />
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {activeTab === 'notifications' && (
                <div className="flex flex-col gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold mb-1">Email Notifications</h2>
                            <p className="text-gray-500 text-sm">Configure email notification preferences</p>
                        </div>

                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-[0.95rem] font-medium mb-1">New Reviews</h3>
                                <p className="text-gray-500 text-sm">Receive email notifications when new reviews are submitted</p>
                            </div>
                            <label className="toggle-switch">
                                <input type="checkbox" className="toggle-input" defaultChecked={settings.notifyNewReviews} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="h-[1px] bg-gray-200 my-6"></div>

                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-[0.95rem] font-medium mb-1">Low Rating Alerts</h3>
                                <p className="text-gray-500 text-sm">Get notified when a review with low rating is received</p>
                            </div>
                            <label className="toggle-switch">
                                <input type="checkbox" className="toggle-input" defaultChecked={settings.notifyLowRating} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="h-[1px] bg-gray-200 my-6"></div>

                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-[0.95rem] font-medium mb-1">Weekly Digest</h3>
                                <p className="text-gray-500 text-sm">Receive a weekly summary of platform activity</p>
                            </div>
                            <label className="toggle-switch">
                                <input type="checkbox" className="toggle-input" defaultChecked={settings.notifyWeeklyDigest} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="h-[1px] bg-gray-200 my-6"></div>

                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-[0.95rem] font-medium mb-1">AI Reply Alerts</h3>
                                <p className="text-gray-500 text-sm">Notifications for AI-generated reply suggestions</p>
                            </div>
                            <label className="toggle-switch">
                                <input type="checkbox" className="toggle-input" defaultChecked={settings.notifyAiReply} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold mb-1">App Notifications</h2>
                            <p className="text-gray-500 text-sm">Configure in-app notification preferences</p>
                        </div>

                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-[0.95rem] font-medium mb-1">System Alerts</h3>
                                <p className="text-gray-500 text-sm">Critical system notifications and maintenance updates</p>
                            </div>
                            <label className="toggle-switch">
                                <input type="checkbox" className="toggle-input" defaultChecked={settings.notifySystemAlerts} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="h-[1px] bg-gray-200 my-6"></div>

                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-[0.95rem] font-medium mb-1">Feature Updates</h3>
                                <p className="text-gray-500 text-sm">Notifications about new features and improvements</p>
                            </div>
                            <label className="toggle-switch">
                                <input type="checkbox" className="toggle-input" defaultChecked={settings.notifyFeatureUpdates} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end mt-6">
                        <button className="bg-slate-900 text-white px-6 py-2.5 rounded-md font-medium flex items-center gap-2 border-none cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => alert('Settings saved successfully!')}>
                            <Save size={18} />
                            Save Changes
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
