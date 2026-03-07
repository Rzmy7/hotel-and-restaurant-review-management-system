import React from 'react';
import { ToggleRow } from '../molecules/ToggleRow';
import { FormField } from '../molecules/FormField';
import type { SecuritySettings } from '../../../types/settings';
import { Button } from '../../ui/Button';

interface SecuritySettingsCardProps {
    data: SecuritySettings;
    onChange: (updates: Partial<SecuritySettings>) => void;
    onPasswordEdit: () => void;
    onSessionEdit: () => void;
}

export const SecuritySettingsCard: React.FC<SecuritySettingsCardProps> = ({
    data,
    onChange,
    onPasswordEdit,
    onSessionEdit
}) => {
    return (
        <div className="flex flex-col">
            <ToggleRow
                label="Two-Factor Authentication"
                description="Require a code on login"
                checked={data.twoFactorAuth}
                onChange={(e) => onChange({ twoFactorAuth: e.target.checked })}
            />
            <FormField label="Password" orientation="horizontal">
                <div className="flex items-center gap-4 w-full">
                    <span className="text-sm text-gray-500 font-medium tracking-[2px] flex-1">••••••••</span>
                    <Button variant="ghost" size="sm" onClick={onPasswordEdit} className="text-[#4e80ee]">Edit</Button>
                </div>
            </FormField>
            <FormField label="Session Timeout" orientation="horizontal">
                <div className="flex items-center gap-4 w-full">
                    <span className="text-[13px] text-gray-600 dark:text-gray-300 font-bold flex-1">{data.sessionTimeout} minutes</span>
                    <Button variant="ghost" size="sm" onClick={onSessionEdit} className="text-[#4e80ee]">Edit</Button>
                </div>
            </FormField>
        </div>
    );
};
