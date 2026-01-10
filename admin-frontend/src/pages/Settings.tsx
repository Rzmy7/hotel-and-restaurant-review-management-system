import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { fetchSettings } from '../services/mockService';
import type { AdminSettings } from '../types';
import './Settings.css';

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
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div className="dashboard-header" style={{ marginBottom: '24px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Configure platform settings and preferences</p>
            </div>

            <div className="settings-tabs">
                <button
                    className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
                    onClick={() => setActiveTab('general')}
                >
                    General
                </button>
                <button
                    className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                    onClick={() => setActiveTab('security')}
                >
                    Security
                </button>
                <button
                    className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
                    onClick={() => setActiveTab('notifications')}
                >
                    Notifications
                </button>
            </div>

            {activeTab === 'general' && (
                <div className="settings-section">
                    <div className="white-card settings-card">
                        <div className="settings-card-header">
                            <h2>General Settings</h2>
                            <p>Configure basic platform settings and preferences</p>
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label>Platform Name</label>
                                <input type="text" defaultValue={settings.platformName} />
                            </div>
                            <div className="form-group">
                                <label>System Timezone</label>
                                <input type="text" defaultValue={settings.timezone} />
                            </div>
                            <div className="form-group">
                                <label>Default Language</label>
                                <input type="text" defaultValue={settings.language} />
                            </div>
                            <div className="form-group">
                                <label>Date Format</label>
                                <input type="text" defaultValue={settings.dateFormat} />
                            </div>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label>Currency</label>
                                <input type="text" defaultValue={settings.currency} />
                            </div>
                        </div>
                    </div>

                    <div className="maintenance-card">
                        <div className="maintenance-info">
                            <h3>Maintenance Mode</h3>
                            <p>Enable maintenance mode to prevent users from accessing the platform</p>
                        </div>
                        <label className="toggle-switch">
                            <input type="checkbox" className="toggle-input" defaultChecked={settings.maintenanceMode} />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>

                    <div className="save-bar">
                        <button className="save-btn" onClick={() => alert('Settings saved successfully!')}>
                            <Save size={18} />
                            Save Changes
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'security' && (
                <div className="settings-section">
                    <div className="white-card settings-card">
                        <div className="settings-card-header">
                            <h2>Security Settings</h2>
                            <p>Configure security and authentication settings</p>
                        </div>

                        <div className="settings-row-toggle">
                            <div className="settings-row-info">
                                <h3>Two-Factor Authentication</h3>
                                <p>Require two-factor authentication for all admin accounts</p>
                            </div>
                            <label className="toggle-switch">
                                <input type="checkbox" className="toggle-input" defaultChecked={settings.twoFactorAuth} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="settings-divider"></div>

                        <div className="settings-row-input">
                            <label>Password Strength Requirement</label>
                            <p>Set minimum password strength requirements for user accounts</p>
                            <input type="text" defaultValue={settings.passwordStrength} />
                        </div>

                        <div className="settings-divider"></div>

                        <div className="settings-row-input">
                            <label>Session Timeout</label>
                            <p>Automatically log out users after a period of inactivity</p>
                            <input type="text" defaultValue={settings.sessionTimeout} />
                        </div>

                        <div className="settings-divider"></div>

                        <div className="settings-row-toggle">
                            <div className="settings-row-info">
                                <h3>Allow New Admin Signups</h3>
                                <p>Enable new administrators to sign up without invitation</p>
                            </div>
                            <label className="toggle-switch">
                                <input type="checkbox" className="toggle-input" defaultChecked={settings.allowNewSignups} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="save-bar">
                            <button className="save-btn" onClick={() => alert('Settings saved successfully!')}>
                                <Save size={18} />
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {activeTab === 'notifications' && (
                <div className="settings-section">
                    <div className="white-card settings-card">
                        <div className="settings-card-header">
                            <h2>Email Notifications</h2>
                            <p>Configure email notification preferences</p>
                        </div>

                        <div className="settings-row-toggle">
                            <div className="settings-row-info">
                                <h3>New Reviews</h3>
                                <p>Receive email notifications when new reviews are submitted</p>
                            </div>
                            <label className="toggle-switch">
                                <input type="checkbox" className="toggle-input" defaultChecked={settings.notifyNewReviews} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="settings-divider"></div>

                        <div className="settings-row-toggle">
                            <div className="settings-row-info">
                                <h3>Low Rating Alerts</h3>
                                <p>Get notified when a review with low rating is received</p>
                            </div>
                            <label className="toggle-switch">
                                <input type="checkbox" className="toggle-input" defaultChecked={settings.notifyLowRating} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="settings-divider"></div>

                        <div className="settings-row-toggle">
                            <div className="settings-row-info">
                                <h3>Weekly Digest</h3>
                                <p>Receive a weekly summary of platform activity</p>
                            </div>
                            <label className="toggle-switch">
                                <input type="checkbox" className="toggle-input" defaultChecked={settings.notifyWeeklyDigest} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="settings-divider"></div>

                        <div className="settings-row-toggle">
                            <div className="settings-row-info">
                                <h3>AI Reply Alerts</h3>
                                <p>Notifications for AI-generated reply suggestions</p>
                            </div>
                            <label className="toggle-switch">
                                <input type="checkbox" className="toggle-input" defaultChecked={settings.notifyAiReply} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <div className="white-card settings-card">
                        <div className="settings-card-header">
                            <h2>App Notifications</h2>
                            <p>Configure in-app notification preferences</p>
                        </div>

                        <div className="settings-row-toggle">
                            <div className="settings-row-info">
                                <h3>System Alerts</h3>
                                <p>Critical system notifications and maintenance updates</p>
                            </div>
                            <label className="toggle-switch">
                                <input type="checkbox" className="toggle-input" defaultChecked={settings.notifySystemAlerts} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="settings-divider"></div>

                        <div className="settings-row-toggle">
                            <div className="settings-row-info">
                                <h3>Feature Updates</h3>
                                <p>Notifications about new features and improvements</p>
                            </div>
                            <label className="toggle-switch">
                                <input type="checkbox" className="toggle-input" defaultChecked={settings.notifyFeatureUpdates} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <div className="save-bar">
                        <button className="save-btn" onClick={() => alert('Settings saved successfully!')}>
                            <Save size={18} />
                            Save Changes
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
