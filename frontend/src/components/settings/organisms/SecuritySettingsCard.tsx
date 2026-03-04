import React from 'react';
import { Lock } from 'lucide-react';
import { Card } from '../../ui/Card';
import { SectionHeader } from '../molecules/SectionHeader';
import { ToggleRow } from '../molecules/ToggleRow';
import { FormField } from '../molecules/FormField';
import { SecuritySettings } from '../../../types/settings';
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
        <Card className="p-6 md:p-8">
            <SectionHeader icon={Lock} title="Security Settings" />
            <div className="flex flex-col">
                <ToggleRow
                    label="Two-Factor Authentication"
                    description="Require a code on login"
                    checked={data.twoFactorAuth}
                    onChange={(e) => onChange({ twoFactorAuth: e.target.checked })}
                />
                <FormField label="Password" orientation="horizontal">
                    <div className="flex items-center gap-4 max-md:w-full max-md:justify-between w-[240px]">
                        <span className="text-sm text-gray-500 font-medium tracking-[2px] flex-1">••••••••</span>
                        <Button variant="ghost" size="sm" onClick={onPasswordEdit} className="text-[#4e80ee]">Edit</Button>
                    </div>
                </FormField>
                <FormField label="Session Timeout" orientation="horizontal">
                    <div className="flex items-center gap-4 max-md:w-full max-md:justify-between w-[240px]">
                        <span className="text-[13px] text-gray-600 font-bold flex-1">{data.sessionTimeout} minutes</span>
                        <Button variant="ghost" size="sm" onClick={onSessionEdit} className="text-[#4e80ee]">Edit</Button>
                    </div>
                </FormField>
            </div>
        </Card>
    );
};
