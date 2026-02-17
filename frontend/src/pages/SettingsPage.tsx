import React, { useState } from 'react';
import { Globe, Bell, Lock, CreditCard, Building2, Upload, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
    <div className="p-0 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white px-8 py-6 border-b border-gray-200 flex items-start gap-4">
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-0.5" onClick={toggleSidebar}>
          <Menu size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-gray-900 m-0 mb-1">Settings</h1>
          <p className="text-sm text-gray-500 m-0">Manage your account and application preferences</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto p-8">
        {/* General Section */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <Globe className="text-sky-500" size={20} />
            <h2 className="text-lg font-semibold text-gray-900 m-0">General</h2>
          </div>

          <div className="flex flex-col gap-0">
            <div className="flex items-center justify-between py-4 border-b border-gray-100">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 cursor-default">Property Name</label>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 font-medium">Grand Hotel NYC</span>
                <button className="text-sky-500 text-sm font-medium px-2 py-1 hover:text-sky-600 transition-colors">Edit</button>
              </div>
            </div>

            <div className="flex items-center justify-between py-4 border-b border-gray-100">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 cursor-default">Time Zone</label>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 font-medium">EST (UTC-5)</span>
                <button className="text-sky-500 text-sm font-medium px-2 py-1 hover:text-sky-600 transition-colors">Edit</button>
              </div>
            </div>

            <div className="flex items-center justify-between py-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 cursor-default">Language</label>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 font-medium">English</span>
                <button className="text-sky-500 text-sm font-medium px-2 py-1 hover:text-sky-600 transition-colors">Edit</button>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <Bell className="text-sky-500" size={20} />
            <h2 className="text-lg font-semibold text-gray-900 m-0">Notifications</h2>
          </div>

          <div className="flex flex-col gap-0">
            <div className="flex items-center justify-between py-4 border-b border-gray-100">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 cursor-default">Email Notifications</label>
              </div>
              <label className="relative inline-block w-12 h-6.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="opacity-0 w-0 h-0 peer"
                />
                <span className="absolute cursor-pointer top-0 left-0 right-0 bottom-0 bg-gray-300 transition-all duration-300 rounded-full before:absolute before:content-[''] before:h-5 before:w-5 before:left-0.5 before:bottom-0.5 before:bg-white before:transition-all before:duration-300 before:rounded-full peer-checked:bg-sky-500 peer-checked:before:translate-x-5"></span>
              </label>
            </div>

            <div className="flex items-center justify-between py-4 border-b border-gray-100">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 cursor-default">New Review Alerts</label>
              </div>
              <label className="relative inline-block w-12 h-6.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={newReviewAlerts}
                  onChange={(e) => setNewReviewAlerts(e.target.checked)}
                  className="opacity-0 w-0 h-0 peer"
                />
                <span className="absolute cursor-pointer top-0 left-0 right-0 bottom-0 bg-gray-300 transition-all duration-300 rounded-full before:absolute before:content-[''] before:h-5 before:w-5 before:left-0.5 before:bottom-0.5 before:bg-white before:transition-all before:duration-300 before:rounded-full peer-checked:bg-sky-500 peer-checked:before:translate-x-5"></span>
              </label>
            </div>

            <div className="flex items-center justify-between py-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 cursor-default">Weekly Summary</label>
              </div>
              <label className="relative inline-block w-12 h-6.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={weeklySummary}
                  onChange={(e) => setWeeklySummary(e.target.checked)}
                  className="opacity-0 w-0 h-0 peer"
                />
                <span className="absolute cursor-pointer top-0 left-0 right-0 bottom-0 bg-gray-300 transition-all duration-300 rounded-full before:absolute before:content-[''] before:h-5 before:w-5 before:left-0.5 before:bottom-0.5 before:bg-white before:transition-all before:duration-300 before:rounded-full peer-checked:bg-sky-500 peer-checked:before:translate-x-5"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <Lock className="text-sky-500" size={20} />
            <h2 className="text-lg font-semibold text-gray-900 m-0">Security</h2>
          </div>

          <div className="flex flex-col gap-0">
            <div className="flex items-center justify-between py-4 border-b border-gray-100">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 cursor-default">Two-Factor Authentication</label>
              </div>
              <label className="relative inline-block w-12 h-6.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={twoFactorAuth}
                  onChange={(e) => setTwoFactorAuth(e.target.checked)}
                  className="opacity-0 w-0 h-0 peer"
                />
                <span className="absolute cursor-pointer top-0 left-0 right-0 bottom-0 bg-gray-300 transition-all duration-300 rounded-full before:absolute before:content-[''] before:h-5 before:w-5 before:left-0.5 before:bottom-0.5 before:bg-white before:transition-all before:duration-300 before:rounded-full peer-checked:bg-sky-500 peer-checked:before:translate-x-5"></span>
              </label>
            </div>

            <div className="flex items-center justify-between py-4 border-b border-gray-100">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 cursor-default">Password</label>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 font-medium tracking-wider text-base">••••••••</span>
                <button className="text-sky-500 text-sm font-medium px-2 py-1 hover:text-sky-600 transition-colors">Change</button>
              </div>
            </div>

            <div className="flex items-center justify-between py-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 cursor-default">Session Timeout</label>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 font-medium">30 minutes</span>
                <button className="text-sky-500 text-sm font-medium px-2 py-1 hover:text-sky-600 transition-colors">Edit</button>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription & Billing Section */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <CreditCard className="text-sky-500" size={20} />
            <h2 className="text-lg font-semibold text-gray-900 m-0">Subscription & Billing</h2>
          </div>

          <div className="flex flex-col gap-0">
            {/* Plan Selection */}
            <div className="flex gap-3 mb-4">
              <button 
                className={`px-6 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  selectedPlan === 'professional' 
                    ? 'bg-gray-800 text-white border-gray-800' 
                    : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => setSelectedPlan('professional')}
              >
                Professional Plan
              </button>
              <button 
                className={`px-6 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  selectedPlan === 'upgrade' 
                    ? 'bg-gray-800 text-white border-gray-800' 
                    : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => setSelectedPlan('upgrade')}
              >
                Upgrade Plan
              </button>
            </div>

            <div className="text-gray-500 text-sm mb-6 pb-4 border-b border-gray-100">
              2,500 reviews/month • 5 properties • AI responses
            </div>

            {/* Billing Email */}
            <div className="flex flex-col gap-2 py-4 border-b border-gray-100">
              <label className="text-sm font-medium text-gray-700">Billing Email</label>
              <input 
                type="email" 
                className="px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 transition-colors focus:outline-none focus:border-sky-500 w-full max-w-md"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
              />
            </div>

            {/* Payment Method */}
            <div className="flex flex-col gap-2 py-4">
              <label className="text-sm font-medium text-gray-700">Payment Method</label>
              <div className="flex items-center justify-between px-4 py-3.5 border border-gray-300 rounded-lg max-w-md">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">💳</div>
                  <div className="flex flex-col gap-0.5">
                    <div className="text-sm font-medium text-gray-700">Visa ****1234</div>
                    <div className="text-xs text-gray-500">Expires 12/26</div>
                  </div>
                </div>
                <button className="text-gray-500 text-sm font-medium px-2 py-1 hover:text-gray-700 transition-colors">Update</button>
              </div>
            </div>
          </div>
        </div>

        {/* Hotel Information Section */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <Building2 className="text-sky-500" size={20} />
            <h2 className="text-lg font-semibold text-gray-900 m-0">Hotel Information</h2>
          </div>

          <div className="flex flex-col gap-0">
            {/* Logo Upload */}
            <div className="flex flex-col gap-2 py-4 border-b border-gray-100">
              <div className="flex gap-4 items-start">
                <div className="w-36 h-36 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:border-sky-500 hover:bg-sky-50 bg-gray-50">
                  <Upload className="text-gray-400" size={32} />
                  <span className="text-xs text-gray-500 text-center max-w-[100px]">Upload Hotel Logo</span>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <button className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 text-sm font-medium transition-all hover:border-gray-400 hover:bg-gray-50">
                    Change Logo
                  </button>
                  <button className="text-red-500 text-sm font-medium px-2 py-1 hover:text-red-600 transition-colors text-left">
                    Remove
                  </button>
                  <p className="text-xs text-gray-400 mt-1 m-0">Recommended 800x800px PNG</p>
                </div>
              </div>
            </div>

            {/* Hotel Name */}
            <div className="flex flex-col gap-2 py-4 border-b border-gray-100">
              <label className="text-sm font-medium text-gray-700">Hotel/Brand Name</label>
              <input 
                type="text" 
                className="px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 transition-colors focus:outline-none focus:border-sky-500 w-full max-w-md"
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
              />
            </div>

            {/* Website URL and Property Type */}
            <div className="grid grid-cols-2 gap-4 py-4 border-b border-gray-100">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Website URL</label>
                <div className="relative flex items-center">
                  <Globe className="absolute left-3.5 text-gray-400 pointer-events-none" size={16} />
                  <input 
                    type="url" 
                    className="pl-10 pr-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 transition-colors focus:outline-none focus:border-sky-500 w-full"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://grandplazahotel.com"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Property Type</label>
                <input 
                  type="text" 
                  className="px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 transition-colors focus:outline-none focus:border-sky-500 w-full"
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  placeholder="e.g., Hotel, Resort, B&B"
                />
              </div>
            </div>

            {/* Primary Email */}
            <div className="flex flex-col gap-2 py-4 border-b border-gray-100">
              <label className="text-sm font-medium text-gray-700">Primary Email</label>
              <input 
                type="email" 
                className="px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 transition-colors focus:outline-none focus:border-sky-500 w-full max-w-md"
                value={primaryEmail}
                onChange={(e) => setPrimaryEmail(e.target.value)}
              />
            </div>

            {/* Phone Number */}
            <div className="flex flex-col gap-2 py-4">
              <label className="text-sm font-medium text-gray-700">Phone Number</label>
              <input 
                type="tel" 
                className="px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 transition-colors focus:outline-none focus:border-sky-500 w-full max-w-md"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="max-w-5xl mx-auto px-8 py-6 flex gap-3 bg-white border-t border-gray-200 sticky bottom-0">
        <button className="px-8 py-3 bg-sky-500 text-white rounded-lg text-sm font-semibold transition-colors hover:bg-sky-600">Save Changes</button>
        <button className="px-8 py-3 bg-transparent text-gray-500 rounded-lg text-sm font-semibold transition-colors hover:text-gray-700">Cancel</button>
      </div>
    </div>
  );
};

export default SettingsPage;
