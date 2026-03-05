import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Lock, Bell, CreditCard, Building } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../hooks/useSettings';
import DashboardSkeleton from '../components/DashboardSkeleton';

// Templates
import { SettingsTemplate } from '../components/settings/templates/SettingsTemplate';

// Organisms
import { GeneralSettingsCard } from '../components/settings/organisms/GeneralSettingsCard';
import { NotificationSettingsCard } from '../components/settings/organisms/NotificationSettingsCard';
import { SecuritySettingsCard } from '../components/settings/organisms/SecuritySettingsCard';
import { SubscriptionSettingsCard } from '../components/settings/organisms/SubscriptionSettingsCard';
import { HotelInfoSettingsCard } from '../components/settings/organisms/HotelInfoSettingsCard';
import type { SettingsData } from '../types/settings';

type TabID = 'general' | 'security' | 'notifications' | 'subscription' | 'hotelInfo';

const TABS = [
  { id: 'general', label: 'General Properties', icon: Globe },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'subscription', label: 'Subscription', icon: CreditCard },
  { id: 'hotelInfo', label: 'Hotel Profile', icon: Building }
] as const;

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: serverData, loading, saving, updateSettings } = useSettings();

  const [localData, setLocalData] = useState<SettingsData | null>(null);
  const [activeTab, setActiveTab] = useState<TabID>('general');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (serverData) {
      setLocalData(serverData);
      setHasUnsavedChanges(false);
    }
  }, [serverData]);

  if (loading || !localData) {
    return <DashboardSkeleton />;
  }

  const handleUpdateSection = <K extends keyof SettingsData>(
    section: K,
    updates: Partial<SettingsData[K]>
  ) => {
    setLocalData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [section]: {
          ...prev[section],
          ...updates
        }
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleSaveAll = async () => {
    if (!localData) return;
    const success = await updateSettings(localData);
    if (success) {
      setHasUnsavedChanges(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm('Are you sure you want to discard unsaved changes and return to the dashboard?')) {
        return;
      }
    }
    navigate('/dashboard');
  };

  return (
    <SettingsTemplate
      isSaving={saving}
      onSave={handleSaveAll}
      onCancel={handleCancel}
      hasUnsavedChanges={hasUnsavedChanges}
    >
      <div className="flex flex-col gap-6">
        {/* Horizontal Navigation */}
        <nav className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-100 dark:border-slate-800/50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-5 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${isActive
                  ? 'bg-blue-50 text-[#4e80ee] shadow-sm dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white'
                  }`}
              >
                <Icon size={18} className={isActive ? 'text-[#4e80ee] dark:text-blue-400' : 'text-gray-400 dark:text-slate-500'} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Form Content */}
        <div className="max-w-3xl">
          {activeTab === 'general' && (
            <div className="animate-fade-in">
              <GeneralSettingsCard
                data={localData.general}
                onChange={(updates) => handleUpdateSection('general', updates)}
              />
            </div>
          )}
          {activeTab === 'notifications' && (
            <div className="animate-fade-in">
              <NotificationSettingsCard
                data={localData.notifications}
                onChange={(updates) => handleUpdateSection('notifications', updates)}
              />
            </div>
          )}
          {activeTab === 'security' && (
            <div className="animate-fade-in">
              <SecuritySettingsCard
                data={localData.security}
                onChange={(updates) => handleUpdateSection('security', updates)}
                onPasswordEdit={() => showToast('Password change wizard coming soon', 'info')}
                onSessionEdit={() => showToast('Session settings are managed by admins', 'info')}
              />
            </div>
          )}
          {activeTab === 'subscription' && (
            <div className="animate-fade-in">
              <SubscriptionSettingsCard
                data={localData.subscription}
                onChange={(updates) => handleUpdateSection('subscription', updates)}
                onPaymentEdit={() => showToast('Redirecting to secure payment portal...', 'info')}
              />
            </div>
          )}
          {activeTab === 'hotelInfo' && (
            <div className="animate-fade-in">
              <HotelInfoSettingsCard
                data={localData.hotelInfo}
                onChange={(updates) => handleUpdateSection('hotelInfo', updates)}
                onLogoUpload={() => showToast('Logo upload coming soon', 'info')}
                onLogoRemove={() => handleUpdateSection('hotelInfo', { logoUrl: undefined })}
              />
            </div>
          )}
        </div>
      </div>
    </SettingsTemplate>
  );
};

export default SettingsPage;
