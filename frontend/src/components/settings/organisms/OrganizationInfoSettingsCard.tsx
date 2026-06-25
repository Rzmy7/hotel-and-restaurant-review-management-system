import React from 'react';
import { Upload, FileText, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { FormField } from '../molecules/FormField';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { Select } from '../../ui/Select';
import type { OrganizationInfoSettings } from '../../../types/settings';
import type { OrganizationType } from '../../../api/settingsApi';

interface OrganizationRule {
    rule_id: string;
    rule_text: string;
    rule_order: number;
    is_embedded: boolean;
    source_filename: string | null;
}

interface OrganizationInfoSettingsCardProps {
    data: OrganizationInfoSettings;
    onChange: (updates: Partial<OrganizationInfoSettings>) => void;
    onLogoUpload: () => void;
    onLogoRemove: () => void;
    isUploadingLogo?: boolean;
    onRulesUpload?: () => void;
    isUploadingRules?: boolean;
    organizationRules?: OrganizationRule[];
    organizationTypes?: OrganizationType[];
}

export const OrganizationInfoSettingsCard: React.FC<OrganizationInfoSettingsCardProps> = ({
    data,
    onChange,
    onLogoUpload,
    onLogoRemove,
    isUploadingLogo = false,
    onRulesUpload,
    isUploadingRules = false,
    organizationRules = [],
    organizationTypes = [],
}) => {
    const rulesFilename = organizationRules.length > 0 ? organizationRules[0]?.source_filename : null;

    const propertyTypeOptions = [
        { label: 'Select Property Type', value: '' },
        ...organizationTypes.map(type => ({
            label: type.type_name,
            value: type.type_name
        }))
    ];

    return (
        <div className="flex flex-col">

            {/* Logo Upload */}
            <div className="flex flex-col gap-2 py-6 border-b border-gray-100 dark:border-slate-900/50 last:border-b-0">
                <div className="flex gap-6 items-start max-md:flex-col">
                    <div
                        onClick={onLogoUpload}
                        className="w-[140px] h-[140px] border-2 border-dashed border-gray-200 dark:border-slate-600 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-gray-50/50 dark:bg-slate-800/50 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 group max-md:w-full max-md:max-w-[200px]"
                    >
                        {data.logoUrl ? (
                            <img
                                src={data.logoUrl}
                                alt="Organization logo"
                                className="w-full h-full object-cover rounded-2xl"
                            />
                        ) : (
                            <>
                                <Upload className="text-gray-400 group-hover:text-[#4e80ee] transition-colors" size={32} />
                                <span className="text-[11px] font-black tracking-widest text-gray-400 uppercase group-hover:text-[#4e80ee] transition-colors text-center w-24">
                                    Upload Logo
                                </span>
                            </>
                        )}
                    </div>
                    <div className="flex flex-col gap-3 pt-2">
                        <Button variant="outline" size="sm" onClick={onLogoUpload} isLoading={isUploadingLogo}>
                            {data.logoUrl ? 'Change Logo' : 'Upload Logo'}
                        </Button>
                        <Button variant="danger" size="sm" onClick={onLogoRemove} disabled={isUploadingLogo || !data.logoUrl}>
                            Remove
                        </Button>
                        <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 mt-2">Recommended 800x800px PNG</p>
                    </div>
                </div>
            </div>

            <FormField label="Organization Name">
                <Input
                    value={data.organizationName}
                    onChange={(e) => onChange({ organizationName: e.target.value })}
                />
            </FormField>

            <div className="grid grid-cols-2 gap-6 py-6 border-b border-gray-100 dark:border-slate-700/50 max-md:grid-cols-1">
                <FormField label="Website URL">
                    <Input
                        type="url"
                        value={data.websiteUrl}
                        onChange={(e) => onChange({ websiteUrl: e.target.value })}
                        placeholder="https://"
                    />
                </FormField>

                <FormField label="Property Type">
                    <Select
                        value={data.propertyType}
                        onChange={(e) => onChange({ propertyType: e.target.value })}
                        
                        options={propertyTypeOptions}
                    />
                </FormField>
            </div>

            <FormField label="Primary Email">
                <Input
                    type="email"
                    value={data.primaryEmail}
                    onChange={(e) => onChange({ primaryEmail: e.target.value })}
                />
            </FormField>

            <FormField label="Phone Number">
                <Input
                    type="tel"
                    value={data.phoneNumber}
                    onChange={(e) => onChange({ phoneNumber: e.target.value })}
                />
            </FormField>

            <div className="grid grid-cols-2 gap-6 py-6 border-b border-gray-100 dark:border-slate-700/50 max-md:grid-cols-1">
                <FormField label="City">
                    <Input
                        value={data.city}
                        onChange={(e) => onChange({ city: e.target.value })}
                        placeholder="City"
                    />
                </FormField>

                <FormField label="Country">
                    <Input
                        value={data.country}
                        onChange={(e) => onChange({ country: e.target.value })}
                        placeholder="Country"
                    />
                </FormField>
            </div>

            <div className="py-6 border-b border-gray-100 dark:border-slate-700/50 last:border-b-0">
                <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Google Maps Location Link</label>
                    <input
                        type="url"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                        value={data.locationUrl || ''}
                        onChange={(e) => onChange({ locationUrl: e.target.value })}
                        placeholder="https://www.google.com/maps/place/..."
                    />
                </div>
            </div>

            {/* Rules & Regulations Upload */}
            {onRulesUpload && (
                <div className="py-6 border-b border-gray-100 dark:border-slate-700/50 last:border-b-0">
                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Rules & Regulations
                            </label>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                                Upload a document containing your property's rules and regulations. The AI will extract individual rules and use them when generating review replies.
                            </p>
                        </div>

                        <div className="flex items-start gap-4 max-md:flex-col">
                            {/* Upload Area */}
                            <div
                                onClick={isUploadingRules ? undefined : onRulesUpload}
                                className={`
                                    flex-1 border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all
                                    ${isUploadingRules
                                        ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10 cursor-wait'
                                        : 'border-gray-200 dark:border-slate-600 bg-gray-50/50 dark:bg-slate-800/50 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 group'
                                    }
                                `}
                            >
                                {isUploadingRules ? (
                                    <>
                                        <Loader2 className="text-blue-500 animate-spin" size={28} />
                                        <span className="text-xs font-bold tracking-wider text-blue-500 uppercase">
                                            Processing with AI...
                                        </span>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
                                            Extracting rules from document. This may take a moment.
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <FileText className="text-gray-400 group-hover:text-[#4e80ee] transition-colors" size={28} />
                                        <span className="text-xs font-bold tracking-wider text-gray-400 uppercase group-hover:text-[#4e80ee] transition-colors">
                                            {organizationRules.length > 0 ? 'Replace Rules File' : 'Upload Rules File'}
                                        </span>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-400 text-center">
                                            Supported formats: .txt, .docx, .pdf (max 10MB)
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-2 pt-1 min-w-[130px]">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onRulesUpload}
                                    isLoading={isUploadingRules}
                                    disabled={isUploadingRules}
                                >
                                    {organizationRules.length > 0 ? 'Replace File' : 'Upload File'}
                                </Button>
                                {rulesFilename && (
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate max-w-[130px]" title={rulesFilename}>
                                        📄 {rulesFilename}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Extracted Rules List */}
                        {organizationRules.length > 0 && (
                            <div className="mt-2">
                                <div className="flex items-center gap-2 mb-3">
                                    <h4 className="text-xs font-black tracking-wider text-slate-600 dark:text-slate-300 uppercase">
                                        Extracted Rules ({organizationRules.length})
                                    </h4>
                                </div>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                    {organizationRules.map((rule) => (
                                        <div
                                            key={rule.rule_id}
                                            className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50 transition-all hover:border-slate-200 dark:hover:border-slate-600"
                                        >
                                            <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-black mt-0.5">
                                                {rule.rule_order}
                                            </span>
                                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed flex-1">
                                                {rule.rule_text}
                                            </p>
                                            <span className="flex-shrink-0 mt-0.5" title={rule.is_embedded ? 'Embedded' : 'Pending embedding'}>
                                                {rule.is_embedded ? (
                                                    <CheckCircle2 size={14} className="text-emerald-500" />
                                                ) : (
                                                    <Clock size={14} className="text-amber-400" />
                                                )}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};
