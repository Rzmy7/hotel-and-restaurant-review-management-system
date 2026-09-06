import React from 'react';
import { Upload, FileText, CheckCircle2, Clock, Loader2, Trash2, Plus } from 'lucide-react';
import { FormField } from '../molecules/FormField';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { Select } from '../../ui/Select';
import { Modal } from '../../ui/Modal';
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
    onRulesUpload?: () => void;
    isUploadingRules?: boolean;
    isLoadingRules?: boolean;
    organizationRules?: OrganizationRule[];
    organizationTypes?: OrganizationType[];
    onAddRule?: (text: string) => Promise<void>;
    onDeleteRule?: (ruleId: string) => Promise<void>;
    onDeleteAllRules?: () => Promise<void>;
    onOpenRulesModal?: () => void;
}

export const OrganizationInfoSettingsCard: React.FC<OrganizationInfoSettingsCardProps> = ({
    data,
    onChange,
    onRulesUpload,
    isUploadingRules = false,
    isLoadingRules = false,
    organizationRules = [],
    organizationTypes = [],
    onAddRule,
    onDeleteRule,
    onDeleteAllRules,
    onOpenRulesModal,
}) => {
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [newRule, setNewRule] = React.useState('');
    const [isSavingRule, setIsSavingRule] = React.useState(false);
    const [deletingIds, setDeletingIds] = React.useState<Record<string, boolean>>({});
    const [isDeletingAll, setIsDeletingAll] = React.useState(false);
    const [confirmDeleteAll, setConfirmDeleteAll] = React.useState(false);

    const rulesFilename = organizationRules.length > 0 ? organizationRules[0]?.source_filename : null;

    const organizationTypeOptions = [
        { label: 'Select Organization Type', value: '' },
        ...organizationTypes.map(type => ({
            label: type.type_name,
            value: type.type_name
        }))
    ];

    const handleAddRuleClick = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRule.trim() || !onAddRule) return;
        try {
            setIsSavingRule(true);
            await onAddRule(newRule.trim());
            setNewRule('');
        } finally {
            setIsSavingRule(false);
        }
    };

    const handleDeleteRuleClick = async (ruleId: string) => {
        if (!onDeleteRule) return;
        try {
            setDeletingIds(prev => ({ ...prev, [ruleId]: true }));
            await onDeleteRule(ruleId);
        } finally {
            setDeletingIds(prev => ({ ...prev, [ruleId]: false }));
        }
    };

    const handleDeleteAllClick = async () => {
        if (!confirmDeleteAll) {
            setConfirmDeleteAll(true);
            return;
        }
        if (!onDeleteAllRules) return;
        try {
            setIsDeletingAll(true);
            await onDeleteAllRules();
            setConfirmDeleteAll(false);
        } finally {
            setIsDeletingAll(false);
        }
    };

    return (
        <div className="flex flex-col">

            {/* Organization Name */}
            <FormField label="Organization Name">
                <Input
                    value={data.organizationName}
                    onChange={(e) => onChange({ organizationName: e.target.value })}
                    placeholder="Enter organization name"
                />
            </FormField>

            {/* Organization Type */}
            <FormField label="Organization Type">
                <Select
                    value={data.propertyType || ''}
                    onChange={(e) => onChange({ propertyType: e.target.value })}
                    options={organizationTypeOptions}
                />
            </FormField>

            {/* Google Maps Location Link */}

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
                                Upload a document containing your organization's rules and regulations. The AI will extract individual rules and use them when generating AI responses.
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
                                            {organizationRules.length > 0 ? 'Add Rules File' : 'Upload Rules File'}
                                        </span>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-400 text-center">
                                            Supported formats: .txt, .docx, .pdf (max 10MB)
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-2.5 pt-1 min-w-[150px]">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onRulesUpload}
                                    isLoading={isUploadingRules}
                                    disabled={isUploadingRules}
                                    className="w-full"
                                >
                                    {organizationRules.length > 0 ? 'Add File' : 'Upload File'}
                                </Button>
                                {organizationRules.length > 0 && (
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => {
                                            onOpenRulesModal?.();
                                            setIsModalOpen(true);
                                        }}
                                        isLoading={isLoadingRules}
                                        className="w-full"
                                    >
                                        View Rules ({organizationRules.length})
                                    </Button>
                                )}
                                {rulesFilename && (
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate max-w-[150px] mt-1" title={rulesFilename}>
                                        📄 {rulesFilename}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Popup Modal Window for Rules Management */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setConfirmDeleteAll(false);
                    setIsModalOpen(false);
                }}
                title={`Rules Management (${organizationRules.length})`}
                description="Manage your organization rules directly below"
                size="lg"
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700"
            >
                <div className="p-6 flex flex-col gap-6">
                    {/* Add Single Rule Form */}
                    <form onSubmit={handleAddRuleClick} className="flex gap-3 items-end border-b border-gray-100 dark:border-slate-800 pb-5">
                        <div className="flex-1">
                            <label className="block text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                                Add Custom Rule
                            </label>
                            <Input
                                value={newRule}
                                onChange={(e) => setNewRule(e.target.value)}
                                placeholder="Enter a single rule (e.g. Check-out time is strictly 11:00 AM)"
                                className="w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                                disabled={isSavingRule}
                            />
                        </div>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={!newRule.trim() || isSavingRule}
                            isLoading={isSavingRule}
                            className="flex items-center gap-1.5 h-11 shrink-0 px-4"
                        >
                            <Plus size={16} />
                            Add Rule
                        </Button>
                    </form>

                    {/* Modal Toolbar & Rules Header */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Configured Rules ({organizationRules.length})
                        </span>
                        {organizationRules.length > 0 && onDeleteAllRules && (
                            <div className="flex items-center gap-2">
                                {confirmDeleteAll && (
                                    <span className="text-xs text-red-500 font-semibold animate-fade-in">
                                        Delete all {organizationRules.length} rules?
                                    </span>
                                )}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDeleteAllClick}
                                    disabled={isDeletingAll}
                                    isLoading={isDeletingAll}
                                    className={`h-8 px-3 text-xs font-bold transition-all ${
                                        confirmDeleteAll
                                            ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 dark:border-red-600'
                                            : 'text-red-500 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30'
                                    }`}
                                >
                                    <Trash2 size={13} className="mr-1" />
                                    {confirmDeleteAll ? 'Confirm Delete All' : 'Delete All'}
                                </Button>
                                {confirmDeleteAll && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setConfirmDeleteAll(false)}
                                        disabled={isDeletingAll}
                                        className="h-8 px-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    >
                                        Cancel
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Scrollable Rules List */}
                    <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-2 no-scrollbar">
                        {organizationRules.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-6">No rules configured for this organization.</p>
                        ) : (
                            organizationRules.map((rule) => (
                                <div
                                    key={rule.rule_id}
                                    className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 transition-all hover:border-slate-200 dark:hover:border-slate-600"
                                >
                                    <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-black mt-0.5">
                                        {rule.rule_order}
                                    </span>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed flex-1 pt-0.5">
                                        {rule.rule_text}
                                    </p>
                                    <div className="flex items-center gap-3 shrink-0 mt-0.5">
                                        <span title={rule.is_embedded ? 'Embedded' : 'Pending embedding'}>
                                            {rule.is_embedded ? (
                                                <CheckCircle2 size={15} className="text-emerald-500" />
                                            ) : (
                                                <Clock size={15} className="text-amber-400 animate-pulse" />
                                            )}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteRuleClick(rule.rule_id)}
                                            disabled={deletingIds[rule.rule_id]}
                                            className="text-slate-400 hover:text-red-500 transition-colors duration-150 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20"
                                            title="Delete rule"
                                        >
                                            {deletingIds[rule.rule_id] ? (
                                                <Loader2 className="animate-spin text-red-500" size={15} />
                                            ) : (
                                                <Trash2 size={15} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Modal>

        </div>
    );
};
