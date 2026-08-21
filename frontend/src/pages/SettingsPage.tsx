import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Lock, Bell, CreditCard, Building } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../hooks/useSettings';
import { useTheme } from '../contexts/ThemeContext';
import SettingsSkeleton from './SettingsSkeleton';

// Templates
import { SettingsTemplate } from '../components/settings/templates/SettingsTemplate';

// Organisms
import { GeneralSettingsCard } from '../components/settings/organisms/GeneralSettingsCard';
import { NotificationSettingsCard } from '../components/settings/organisms/NotificationSettingsCard';
import { SecuritySettingsCard } from '../components/settings/organisms/SecuritySettingsCard';
import { SubscriptionSettingsCard } from '../components/settings/organisms/SubscriptionSettingsCard';
import { OrganizationInfoSettingsCard } from '../components/settings/organisms/OrganizationInfoSettingsCard';
import { UnsavedChangesModal, type ChangeDetail } from '../components/settings/organisms/UnsavedChangesModal';
import { useNavigationBlocker } from '../contexts/NavigationBlockerContext';
import { useOrganizationStore } from '../stores/useOrganizationStore';
import { validateRulesFile } from '../validators/fileValidator';
import type { SettingsData } from '../types/settings';
import type { OrganizationType } from '../api/settingsApi';

type TabID = 'general' | 'security' | 'notifications' | 'subscription' | 'organizationInfo';

const TABS = [
  { id: 'general', label: 'General Settings', icon: Globe },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'subscription', label: 'Subscription', icon: CreditCard },
  { id: 'organizationInfo', label: 'Organization Profile', icon: Building }
] as const;

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const currentOrg = useOrganizationStore((state) => state.currentOrg);
  const organizationId = currentOrg?.id;

  const {
    data: serverData,
    loading,
    saving,
    organizationRules,
    isLoadingRules,
    refreshRules,
    updateSettings,
    uploadOrganizationLogo,
    changePassword,
    uploadRulesFile,
    addOrganizationRule,
    deleteOrganizationRule,
    fetchOrganizationTypes,
  } = useSettings();

  const { setTheme } = useTheme();
  const [localData, setLocalData] = useState<SettingsData | null>(null);
  const [activeTab, setActiveTab] = useState<TabID>('general');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [isUploadingRules, setIsUploadingRules] = useState(false);
  const [organizationTypes, setOrganizationTypes] = useState<OrganizationType[]>([]);
  const rulesInputRef = useRef<HTMLInputElement | null>(null);

  const { setIsDirty, registerBlockHandler, unregisterBlockHandler } = useNavigationBlocker();

  useEffect(() => {
    setIsDirty(hasUnsavedChanges);
  }, [hasUnsavedChanges, setIsDirty]);

  useEffect(() => {
    registerBlockHandler((targetPath) => {
      setPendingNavigation(targetPath);
      setIsModalOpen(true);
    });
    return () => unregisterBlockHandler();
  }, [registerBlockHandler, unregisterBlockHandler]);

  useEffect(() => {
    if (serverData && localData) {
      const changes = getChanges();
      setHasUnsavedChanges(changes.length > 0);
    }
  }, [localData, serverData]);

  useEffect(() => {
    if (serverData) {
      setLocalData(serverData);
      setHasUnsavedChanges(false);
    }
  }, [serverData]);

  useEffect(() => {
    if (activeTab === 'organizationInfo') {
      if (organizationId) {
        refreshRules(organizationId);
      }
      fetchOrganizationTypes()
        .then(setOrganizationTypes)
        .catch(() => {
          showToast('Failed to load organization types', 'error');
        });
    }
  }, [activeTab, organizationId, refreshRules, fetchOrganizationTypes, showToast]);

  if (loading || !localData) {
    return <SettingsSkeleton />;
  }

  const getChanges = (): ChangeDetail[] => {
    if (!serverData || !localData) return [];
    const changes: ChangeDetail[] = [];

    const compareSection = (tabName: string, serverSection: any, localSection: any, fieldLabels: Record<string, string>) => {
      Object.keys(serverSection).forEach(key => {
        if (serverSection[key] !== localSection[key]) {
          changes.push({
            tab: tabName,
            field: fieldLabels[key] || key,
            oldValue: serverSection[key],
            newValue: localSection[key]
          });
        }
      });
    };

    compareSection('General Properties', serverData.general, localData.general, {
      propertyName: 'Owned Organizations', timeZone: 'Time Zone', language: 'Language', themePreference: 'Application Theme'
    });
    compareSection('Security', serverData.security, localData.security, {
      twoFactorAuth: 'Two-Factor Authentication', sessionTimeout: 'Session Timeout'
    });
    compareSection('Notifications', serverData.notifications, localData.notifications, {
      newReviewAlerts: 'New Review Alerts', weeklySummary: 'Weekly Summary', groupInvitations: 'Group Invitations', subscriptionChanges: 'Subscription Changes'
    });
    compareSection('Subscription', serverData.subscription, localData.subscription, {
      plan: 'Plan'
    });
    compareSection('Organization Profile', serverData.organizationInfo, localData.organizationInfo, {
      organizationName: 'Organization Name',
      propertyType: 'Organization Type',
      locationUrl: 'Google Maps Location Link'
    });

    return changes;
  };

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
  };

  const handleSaveAll = async () => {
    if (!localData) return;
    const success = await updateSettings(localData);
    if (success) {
      setHasUnsavedChanges(false);
      setIsDirty(false);
    }
  };

  const handleCancelClick = () => {
    setIsModalOpen(true);
  };

  const handleSaveClick = () => {
    if (hasUnsavedChanges) {
      setIsModalOpen(true);
    } else {
      handleSaveAll();
    }
  };

  const handleModalDiscard = () => {
    if (serverData) {
      setLocalData(serverData);
      setTheme(serverData.general.themePreference as any);
      setHasUnsavedChanges(false);
      setIsDirty(false);
    }
    setIsModalOpen(false);

    if (pendingNavigation) {
      const target = pendingNavigation;
      setPendingNavigation(null);
      setTimeout(() => navigate(target), 0);
    }
  };

  const handleModalSave = async () => {
    await handleSaveAll();
    setIsModalOpen(false);
    if (pendingNavigation) {
      const target = pendingNavigation;
      setPendingNavigation(null);
      setTimeout(() => navigate(target), 0);
    }
  };

  const handleRulesUploadClick = () => {
    rulesInputRef.current?.click();
  };

  const handleRulesFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      validateRulesFile(file);
    } catch (validationError: any) {
      showToast(validationError.message || 'File size must be 10MB or less', 'error');
      return;
    }

    setIsUploadingRules(true);
    try {
      await uploadRulesFile(file, organizationId);
      showToast('Rules file uploaded successfully', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Failed to upload rules file', 'error');
    } finally {
      setIsUploadingRules(false);
    }
  };

  const handleAddRule = async (text: string) => {
    try {
      await addOrganizationRule(text, organizationId);
    } catch {
      // Error handled by hook/toast
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await deleteOrganizationRule(ruleId, organizationId);
    } catch {
      // Error handled by hook/toast
    }
  };

  const activeTabData = TABS.find(t => t.id === activeTab);

  return (
    <>
      <input
        ref={rulesInputRef}
        type="file"
        accept=".txt,.docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        className="hidden"
        onChange={handleRulesFileChange}
      />
      <UnsavedChangesModal
        isOpen={isModalOpen}
        changes={getChanges()}
        onClose={() => {
          setIsModalOpen(false);
          setPendingNavigation(null);
        }}
        onDiscard={handleModalDiscard}
        onSave={handleModalSave}
        isSaving={saving}
      />
      <SettingsTemplate
        isSaving={saving}
        onSave={handleSaveClick}
        onCancel={handleCancelClick}
        hasUnsavedChanges={hasUnsavedChanges}
      >
        <div className="flex flex-col gap-6">
          {/* Horizontal Tab Navigation */}
          <nav className="flex flex-wrap lg:flex-nowrap items-center w-full border-b border-gray-100 dark:border-slate-800/50 gap-1.5 lg:gap-0 pb-1.5 lg:pb-0">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2.5 px-5 py-3.5 font-bold text-sm transition-all whitespace-nowrap border-b-2 lg:-mb-px ${
                    isActive
                      ? 'border-[#4e80ee] text-[#4e80ee] dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-[#4e80ee] dark:text-blue-400' : 'text-gray-400 dark:text-slate-500'} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Full-Width Content Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 sm:p-6 md:p-8 lg:p-10 min-h-[520px]">
            {/* Active Tab Header */}
            {activeTabData && (
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-slate-700/50">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-[#4e80ee] dark:text-blue-400 flex items-center justify-center">
                  <activeTabData.icon size={20} />
                </div>

                {/* each tab content title name */}
                <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase m-0">{activeTabData.label}</h2>
              </div>
            )}

            {/* Tab Content */}
            <div className="animate-fade-in">
              {activeTab === 'general' && (
                <GeneralSettingsCard
                  data={localData.general}
                  onChange={(updates) => handleUpdateSection('general', updates)}
                />
              )}
              {activeTab === 'notifications' && (
                <NotificationSettingsCard
                  data={localData.notifications}
                  onChange={(updates) => handleUpdateSection('notifications', updates)}
                />
              )}
              {activeTab === 'security' && (
                <SecuritySettingsCard
                  data={localData.security}
                  onChange={(updates) => handleUpdateSection('security', updates)}
                  onPasswordChange={changePassword}
                />
              )}
              {activeTab === 'subscription' && (
                <SubscriptionSettingsCard
                  data={localData.subscription}
                  onChange={(updates) => handleUpdateSection('subscription', updates)}
                  onPaymentEdit={() => showToast('Redirecting to secure payment portal...', 'info')}
                />
              )}
              {activeTab === 'organizationInfo' && (
                <OrganizationInfoSettingsCard
                  data={localData.organizationInfo}
                  onChange={(updates) => handleUpdateSection('organizationInfo', updates)}
                  onRulesUpload={handleRulesUploadClick}
                  isUploadingRules={isUploadingRules}
                  isLoadingRules={isLoadingRules}
                  onOpenRulesModal={() => organizationId && refreshRules(organizationId)}
                  organizationRules={organizationRules}
                  organizationTypes={organizationTypes}
                  onAddRule={handleAddRule}
                  onDeleteRule={handleDeleteRule}
                />
              )}
            </div>
          </div>
        </div>
      </SettingsTemplate>
    </>
  );
};

export default SettingsPage;
