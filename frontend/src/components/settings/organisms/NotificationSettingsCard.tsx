import React from 'react';
import { ToggleRow } from '../molecules/ToggleRow';
import type { NotificationSettings } from '../../../types/settings';

interface NotificationSettingsCardProps {
    data: NotificationSettings;
    onChange: (updates: Partial<NotificationSettings>) => void;
}

export const NotificationSettingsCard: React.FC<NotificationSettingsCardProps> = ({ data, onChange }) => {
    return (
        <div className="flex flex-col space-y-4">
            <ToggleRow
                label="New Review Alerts"
                description="Receive email alerts when a new review is posted"
                checked={data.newReviewAlerts}
                onChange={(e) => onChange({ newReviewAlerts: e.target.checked })}
            />
            <ToggleRow
                label="Weekly Summary"
                description="Receive a weekly email digest of your performance"
                checked={data.weeklySummary}
                onChange={(e) => onChange({ weeklySummary: e.target.checked })}
            />
            <ToggleRow
                label="Group Invitations"
                description="Receive email alerts when you receive a group invite"
                checked={data.groupInvitations}
                onChange={(e) => onChange({ groupInvitations: e.target.checked })}
            />
            <ToggleRow
                label="Subscription Plan Changes"
                description="Receive email updates when your subscription plan is modified"
                checked={data.subscriptionChanges}
                onChange={(e) => onChange({ subscriptionChanges: e.target.checked })}
            />
        </div>
    );
};
