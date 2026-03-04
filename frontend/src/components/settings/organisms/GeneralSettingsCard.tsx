import React from 'react';
import { Globe } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { SectionHeader } from '../molecules/SectionHeader';
import { FormField } from '../molecules/FormField';
import { GeneralSettings } from '../../../types/settings';

interface GeneralSettingsCardProps {
    data: GeneralSettings;
    onChange: (updates: Partial<GeneralSettings>) => void;
}

export const GeneralSettingsCard: React.FC<GeneralSettingsCardProps> = ({ data, onChange }) => {
    return (
        <Card className="p-6 md:p-8">
            <SectionHeader icon={Globe} title="General Properties" />
            <div className="flex flex-col">
                <FormField label="Property Name" orientation="horizontal">
                    <Input
                        value={data.propertyName}
                        onChange={(e) => onChange({ propertyName: e.target.value })}
                    />
                </FormField>
                <FormField label="Time Zone" orientation="horizontal">
                    <Select
                        value={data.timeZone}
                        onChange={(e) => onChange({ timeZone: e.target.value })}
                        options={[
                            { label: 'EST (UTC-5)', value: 'EST (UTC-5)' },
                            { label: 'CST (UTC-6)', value: 'CST (UTC-6)' },
                            { label: 'MST (UTC-7)', value: 'MST (UTC-7)' },
                            { label: 'PST (UTC-8)', value: 'PST (UTC-8)' },
                            { label: 'GMT (UTC+0)', value: 'GMT (UTC+0)' }
                        ]}
                    />
                </FormField>
                <FormField label="Language" orientation="horizontal">
                    <Select
                        value={data.language}
                        onChange={(e) => onChange({ language: e.target.value })}
                        options={[
                            { label: 'English', value: 'English' },
                            { label: 'Spanish', value: 'Spanish' },
                            { label: 'French', value: 'French' },
                            { label: 'German', value: 'German' }
                        ]}
                    />
                </FormField>
            </div>
        </Card>
    );
};
