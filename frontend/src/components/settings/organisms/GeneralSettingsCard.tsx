import React from 'react';
import { Globe, Monitor, Moon, Sun } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { SectionHeader } from '../molecules/SectionHeader';
import { FormField } from '../molecules/FormField';
import type { GeneralSettings } from '../../../types/settings';
import { useTheme } from '../../../contexts/ThemeContext';

interface GeneralSettingsCardProps {
    data: GeneralSettings;
    onChange: (updates: Partial<GeneralSettings>) => void;
}

export const GeneralSettingsCard: React.FC<GeneralSettingsCardProps> = ({ data, onChange }) => {
    const { setTheme } = useTheme();

    const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
        setTheme(newTheme);
        onChange({ themePreference: newTheme });
    };

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
                <FormField label="Application Theme" orientation="horizontal" description="Select your preferred UI appearance">
                    <div className="flex bg-gray-100/80 p-1 rounded-xl w-full max-w-[280px]">
                        {[
                            { id: 'light', label: 'Light', icon: Sun },
                            { id: 'dark', label: 'Dark', icon: Moon },
                            { id: 'system', label: 'System', icon: Monitor }
                        ].map((t) => {
                            const Icon = t.icon;
                            const isActive = data.themePreference === t.id;

                            return (
                                <button
                                    key={t.id}
                                    onClick={() => handleThemeChange(t.id as any)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[13px] font-bold transition-all duration-300 ${isActive
                                        ? 'bg-white text-[#4e80ee] shadow-sm transform scale-100'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 transform scale-[0.98]'
                                        }`}
                                >
                                    <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                                    <span className={isActive ? 'block' : 'hidden sm:block'}>{t.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </FormField>
            </div>
        </Card>
    );
};
