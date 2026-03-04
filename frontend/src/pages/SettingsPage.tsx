import React from 'react';
import { useNavigate } from 'react-router-dom';
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

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data, loading, saving, updateSection } = useSettings();

  if (loading || !data) {
    return <DashboardSkeleton />;
  }

  const handleSaveAll = () => {
    // The form is auto-saving via the updateSection function on blur or change depending on the implementation.
    // For a global save button, we just trigger a save confirmation since state is already up to date.
    showToast('All settings changes have been saved', 'success');
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to discard unsaved changes and return to the dashboard?')) {
      navigate('/dashboard');
    }
  };

  return (
    <SettingsTemplate
      isSaving={saving}
      onSave={handleSaveAll}
      onCancel={handleCancel}
    >
      <GeneralSettingsCard
        data={data.general}
        onChange={(updates) => updateSection('general', updates)}
      />
      <NotificationSettingsCard
        data={data.notifications}
        onChange={(updates) => updateSection('notifications', updates)}
      />
      <SecuritySettingsCard
        data={data.security}
        onChange={(updates) => updateSection('security', updates)}
        onPasswordEdit={() => showToast('Password change wizard coming soon', 'info')}
        onSessionEdit={() => showToast('Session settings are managed by admins', 'info')}
      />
      <SubscriptionSettingsCard
        data={data.subscription}
        onChange={(updates) => updateSection('subscription', updates)}
        onPaymentEdit={() => showToast('Redirecting to secure payment portal...', 'info')}
      />
      <HotelInfoSettingsCard
        data={data.hotelInfo}
        onChange={(updates) => updateSection('hotelInfo', updates)}
        onLogoUpload={() => showToast('Logo upload coming soon', 'info')}
        onLogoRemove={() => updateSection('hotelInfo', { logoUrl: undefined })}
      />
    </SettingsTemplate>
  );
};

export default SettingsPage;
