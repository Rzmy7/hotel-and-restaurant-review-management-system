import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, Lock, Bell, CreditCard, Building } from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import { useSettings } from "../hooks/useSettings";
import { useTheme } from "../contexts/ThemeContext";
import DashboardSkeleton from "../components/shared/DashboardSkeleton";

// Templates
import { SettingsTemplate } from "../components/settings/templates/SettingsTemplate";

// Organisms
import { GeneralSettingsCard } from "../components/settings/organisms/GeneralSettingsCard";
import { NotificationSettingsCard } from "../components/settings/organisms/NotificationSettingsCard";
import { SecuritySettingsCard } from "../components/settings/organisms/SecuritySettingsCard";
import { SubscriptionSettingsCard } from "../components/settings/organisms/SubscriptionSettingsCard";
import { HotelInfoSettingsCard } from "../components/settings/organisms/HotelInfoSettingsCard";
import {
  UnsavedChangesModal,
  type ChangeDetail,
} from "../components/settings/organisms/UnsavedChangesModal";
import { useNavigationBlocker } from "../contexts/NavigationBlockerContext";
import type { SettingsData } from "../types/settings";

type TabID =
  | "general"
  | "security"
  | "notifications"
  | "subscription"
  | "hotelInfo";

const TABS = [
  { id: "general", label: "General Properties", icon: Globe },
  { id: "security", label: "Security", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "subscription", label: "Subscription", icon: CreditCard },
  { id: "hotelInfo", label: "Hotel Profile", icon: Building },
] as const;

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const {
    data: serverData,
    loading,
    saving,
    updateSettings,
    uploadHotelLogo,
    changePassword,
    uploadRulesFile,
    fetchOrganizationRules,
  } = useSettings();

  const { setTheme } = useTheme();
  const [localData, setLocalData] = useState<SettingsData | null>(null);
  const [activeTab, setActiveTab] = useState<TabID>("general");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null,
  );
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingRules, setIsUploadingRules] = useState(false);
  const [organizationRules, setOrganizationRules] = useState<
    Array<{
      rule_id: string;
      rule_text: string;
      rule_order: number;
      is_embedded: boolean;
      source_filename: string | null;
    }>
  >([]);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const rulesInputRef = useRef<HTMLInputElement | null>(null);

  const { setIsDirty, registerBlockHandler, unregisterBlockHandler } =
    useNavigationBlocker();

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
    if (activeTab === "hotelInfo") {
      fetchOrganizationRules()
        .then(setOrganizationRules)
        .catch(() => {});
    }
  }, [activeTab]);

  if (loading || !localData) {
    return <DashboardSkeleton />;
  }

  const getChanges = (): ChangeDetail[] => {
    if (!serverData || !localData) return [];
    const changes: ChangeDetail[] = [];

    const compareSection = (
      tabName: string,
      serverSection: any,
      localSection: any,
      fieldLabels: Record<string, string>,
    ) => {
      Object.keys(serverSection).forEach((key) => {
        if (serverSection[key] !== localSection[key]) {
          changes.push({
            tab: tabName,
            field: fieldLabels[key] || key,
            oldValue: serverSection[key],
            newValue: localSection[key],
          });
        }
      });
    };

    compareSection(
      "General Properties",
      serverData.general,
      localData.general,
      {
        propertyName: "Owned Organizations",
        timeZone: "Time Zone",
        language: "Language",
        themePreference: "Application Theme",
      },
    );
    compareSection("Security", serverData.security, localData.security, {
      twoFactorAuth: "Two-Factor Authentication",
      sessionTimeout: "Session Timeout",
    });
    compareSection(
      "Notifications",
      serverData.notifications,
      localData.notifications,
      {
        emailNotifications: "Email Notifications",
        newReviewAlerts: "New Review Alerts",
        weeklySummary: "Weekly Summary",
      },
    );
    compareSection(
      "Subscription",
      serverData.subscription,
      localData.subscription,
      {
        plan: "Plan",
        billingEmail: "Billing Email",
      },
    );
    compareSection("Hotel Profile", serverData.hotelInfo, localData.hotelInfo, {
      hotelName: "Hotel Name",
      websiteUrl: "Website URL",
      propertyType: "Property Type",
      primaryEmail: "Primary Email",
      phoneNumber: "Phone Number",
      city: "City",
      country: "Country",
      logoUrl: "Logo URL",
    });

    return changes;
  };

  const handleUpdateSection = <K extends keyof SettingsData>(
    section: K,
    updates: Partial<SettingsData[K]>,
  ) => {
    setLocalData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [section]: {
          ...prev[section],
          ...updates,
        },
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

  const handleLogoUploadClick = () => {
    logoInputRef.current?.click();
  };

  const handleLogoFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const logoUrl = await uploadHotelLogo(file);
      handleUpdateSection("hotelInfo", { logoUrl });
    } catch {
      // Error toast is handled in useSettings.
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRulesUploadClick = () => {
    rulesInputRef.current?.click();
  };

  const handleRulesFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploadingRules(true);
    try {
      const result = await uploadRulesFile(file);
      // Refresh rules list after successful upload
      const updatedRules = await fetchOrganizationRules();
      setOrganizationRules(updatedRules);
    } catch {
      // Error toast is handled in useSettings.
    } finally {
      setIsUploadingRules(false);
    }
  };

  const activeTabData = TABS.find((t) => t.id === activeTab);

  return (
    <>
      <input
        ref={logoInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={handleLogoFileChange}
      />
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
          <nav className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-100 dark:border-slate-800/50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-5 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-blue-50 text-[#4e80ee] shadow-sm dark:bg-blue-900/30 dark:text-blue-400"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white"
                  }`}
                >
                  <Icon
                    size={18}
                    className={
                      isActive
                        ? "text-[#4e80ee] dark:text-blue-400"
                        : "text-gray-400 dark:text-slate-500"
                    }
                  />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Full-Width Content Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 md:p-8 min-h-[400px]">
            {/* Active Tab Header */}
            {activeTabData && (
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-slate-700/50">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-[#4e80ee] dark:text-blue-400 flex items-center justify-center">
                  <activeTabData.icon size={20} />
                </div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase m-0">
                  {activeTabData.label}
                </h2>
              </div>
            )}

            {/* Tab Content */}
            <div className="animate-fade-in">
              {activeTab === "general" && (
                <GeneralSettingsCard
                  data={localData.general}
                  onChange={(updates) =>
                    handleUpdateSection("general", updates)
                  }
                />
              )}
              {activeTab === "notifications" && (
                <NotificationSettingsCard
                  data={localData.notifications}
                  onChange={(updates) =>
                    handleUpdateSection("notifications", updates)
                  }
                />
              )}
              {activeTab === "security" && (
                <SecuritySettingsCard
                  data={localData.security}
                  onChange={(updates) =>
                    handleUpdateSection("security", updates)
                  }
                  onPasswordChange={changePassword}
                />
              )}
              {activeTab === "subscription" && (
                <SubscriptionSettingsCard
                  data={localData.subscription}
                  onChange={(updates) =>
                    handleUpdateSection("subscription", updates)
                  }
                  onPaymentEdit={() =>
                    showToast("Redirecting to secure payment portal...", "info")
                  }
                />
              )}
              {activeTab === "hotelInfo" && (
                <HotelInfoSettingsCard
                  data={localData.hotelInfo}
                  onChange={(updates) =>
                    handleUpdateSection("hotelInfo", updates)
                  }
                  onLogoUpload={handleLogoUploadClick}
                  onLogoRemove={() =>
                    handleUpdateSection("hotelInfo", { logoUrl: undefined })
                  }
                  isUploadingLogo={isUploadingLogo}
                  onRulesUpload={handleRulesUploadClick}
                  isUploadingRules={isUploadingRules}
                  organizationRules={organizationRules}
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
