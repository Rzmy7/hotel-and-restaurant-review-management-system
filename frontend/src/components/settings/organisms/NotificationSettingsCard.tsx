import React from "react";
import { ToggleRow } from "../molecules/ToggleRow";
import type { NotificationSettings } from "../../../types/settings";

interface NotificationSettingsCardProps {
  data: NotificationSettings;
  onChange: (updates: Partial<NotificationSettings>) => void;
}

export const NotificationSettingsCard: React.FC<
  NotificationSettingsCardProps
> = ({ data, onChange }) => {
  return (
    <div className="flex flex-col">
      <ToggleRow
        label="Email Notifications"
        checked={data.emailNotifications}
        onChange={(e) => onChange({ emailNotifications: e.target.checked })}
      />
      <ToggleRow
        label="New Review Alerts"
        description="Receive an alert when a new review is posted"
        checked={data.newReviewAlerts}
        onChange={(e) => onChange({ newReviewAlerts: e.target.checked })}
      />
      <ToggleRow
        label="Weekly Summary"
        description="Get a weekly digest of your performance"
        checked={data.weeklySummary}
        onChange={(e) => onChange({ weeklySummary: e.target.checked })}
      />
    </div>
  );
};
