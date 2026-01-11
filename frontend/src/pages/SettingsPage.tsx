import React, { useState } from 'react';
import { Globe, Bell, Lock, CreditCard, Building2, Upload, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './SettingsPage.css';

interface SettingsPageProps {
  toggleSidebar: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  
  // State for toggles
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [newReviewAlerts, setNewReviewAlerts] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(false);
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<'professional' | 'upgrade'>('professional');
  const [billingEmail, setBillingEmail] = useState('billing@grandplazahotel.com');
  const [hotelName, setHotelName] = useState('Grand Plaza Hotel & Spa');
  const [websiteUrl, setWebsiteUrl] = useState('https://grandplazahotel.com');
  const [propertyType, setPropertyType] = useState('');
  const [primaryEmail, setPrimaryEmail] = useState('reviews@grandplazahotel.com');
  const [phoneNumber, setPhoneNumber] = useState('+1 (555) 987-6543');

  return (
    <div className="settings-page">
      {/* Header */}
      <div className="settings-header">
        <button className="menu-btn" onClick={toggleSidebar}>
          <Menu size={24} />
        </button>
        <div className="header-content">
          <h1 className="settings-title">Settings</h1>
          <p className="settings-subtitle">Manage your account and application preferences</p>
        </div>
      </div>

      {/* Content */}
      <div className="settings-content">
        {/* General Section */}
        <div className="settings-section">
          <div className="section-header">
            <Globe className="section-icon" size={20} />
            <h2 className="section-title">General</h2>
          </div>

          <div className="settings-group">
            <div className="setting-item">
              <div className="setting-info">
                <label className="setting-label">Property Name</label>
              </div>
              <div className="setting-value-group">
                <span className="setting-value">Grand Hotel NYC</span>
                <button className="edit-button">Edit</button>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label className="setting-label">Time Zone</label>
              </div>
              <div className="setting-value-group">
                <span className="setting-value">EST (UTC-5)</span>
                <button className="edit-button">Edit</button>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label className="setting-label">Language</label>
              </div>
              <div className="setting-value-group">
                <span className="setting-value">English</span>
                <button className="edit-button">Edit</button>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="settings-section">
          <div className="section-header">
            <Bell className="section-icon" size={20} />
            <h2 className="section-title">Notifications</h2>
          </div>

          <div className="settings-group">
            <div className="setting-item">
              <div className="setting-info">
                <label className="setting-label">Email Notifications</label>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label className="setting-label">New Review Alerts</label>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={newReviewAlerts}
                  onChange={(e) => setNewReviewAlerts(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label className="setting-label">Weekly Summary</label>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={weeklySummary}
                  onChange={(e) => setWeeklySummary(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="settings-section">
          <div className="section-header">
            <Lock className="section-icon" size={20} />
            <h2 className="section-title">Security</h2>
          </div>

          <div className="settings-group">
            <div className="setting-item">
              <div className="setting-info">
                <label className="setting-label">Two-Factor Authentication</label>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={twoFactorAuth}
                  onChange={(e) => setTwoFactorAuth(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label className="setting-label">Password</label>
              </div>
              <div className="setting-value-group">
                <span className="setting-value password-dots">••••••••</span>
                <button className="change-button">Change</button>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label className="setting-label">Session Timeout</label>
              </div>
              <div className="setting-value-group">
                <span className="setting-value">30 minutes</span>
                <button className="edit-button">Edit</button>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription & Billing Section */}
        <div className="settings-section">
          <div className="section-header">
            <CreditCard className="section-icon" size={20} />
            <h2 className="section-title">Subscription & Billing</h2>
          </div>

          <div className="settings-group">
            {/* Plan Selection */}
            <div className="plan-buttons">
              <button 
                className={`plan-button ${selectedPlan === 'professional' ? 'active' : ''}`}
                onClick={() => setSelectedPlan('professional')}
              >
                Professional Plan
              </button>
              <button 
                className={`plan-button ${selectedPlan === 'upgrade' ? 'active' : ''}`}
                onClick={() => setSelectedPlan('upgrade')}
              >
                Upgrade Plan
              </button>
            </div>

            <div className="plan-details">
              2,500 reviews/month • 5 properties • AI responses
            </div>

            {/* Billing Email */}
            <div className="setting-item-vertical">
              <label className="setting-label">Billing Email</label>
              <input 
                type="email" 
                className="setting-input"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
              />
            </div>

            {/* Payment Method */}
            <div className="setting-item-vertical">
              <label className="setting-label">Payment Method</label>
              <div className="payment-method-card">
                <div className="payment-info">
                  <div className="card-icon">💳</div>
                  <div className="card-details">
                    <div className="card-number">Visa ****1234</div>
                    <div className="card-expiry">Expires 12/26</div>
                  </div>
                </div>
                <button className="update-button">Update</button>
              </div>
            </div>
          </div>
        </div>

        {/* Hotel Information Section */}
        <div className="settings-section">
          <div className="section-header">
            <Building2 className="section-icon" size={20} />
            <h2 className="section-title">Hotel Information</h2>
          </div>

          <div className="settings-group">
            {/* Logo Upload */}
            <div className="setting-item-vertical">
              <div className="logo-upload-section">
                <div className="logo-upload-box">
                  <Upload className="upload-icon" size={32} />
                  <span className="upload-text">Upload Hotel Logo</span>
                </div>
                <div className="logo-actions">
                  <button className="change-logo-button">Change Logo</button>
                  <button className="remove-button">Remove</button>
                  <p className="upload-hint">Recommended 800x800px PNG</p>
                </div>
              </div>
            </div>

            {/* Hotel Name */}
            <div className="setting-item-vertical">
              <label className="setting-label">Hotel/Brand Name</label>
              <input 
                type="text" 
                className="setting-input"
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
              />
            </div>

            {/* Website URL and Property Type */}
            <div className="setting-item-row">
              <div className="setting-field">
                <label className="setting-label">Website URL</label>
                <div className="input-with-icon">
                  <Globe className="input-icon" size={16} />
                  <input 
                    type="url" 
                    className="setting-input with-icon"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://grandplazahotel.com"
                  />
                </div>
              </div>
              <div className="setting-field">
                <label className="setting-label">Property Type</label>
                <input 
                  type="text" 
                  className="setting-input"
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  placeholder="e.g., Hotel, Resort, B&B"
                />
              </div>
            </div>

            {/* Primary Email */}
            <div className="setting-item-vertical">
              <label className="setting-label">Primary Email</label>
              <input 
                type="email" 
                className="setting-input"
                value={primaryEmail}
                onChange={(e) => setPrimaryEmail(e.target.value)}
              />
            </div>

            {/* Phone Number */}
            <div className="setting-item-vertical">
              <label className="setting-label">Phone Number</label>
              <input 
                type="tel" 
                className="setting-input"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="settings-actions">
        <button className="save-button">Save Changes</button>
        <button className="cancel-button">Cancel</button>
      </div>
    </div>
  );
};

export default SettingsPage;
