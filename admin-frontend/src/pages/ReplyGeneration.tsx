import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Bot, ExternalLink, Save, Sparkles, Wand2 } from 'lucide-react';
import { ToggleSwitch } from '../components/ToggleSwitch';
import ReplyGenerationSkeleton from './ReplyGenerationSkeleton';
import { settingsService } from '../services/settingsService';
import type { ReplyGenerationSettings } from '../services/settingsService';
import { llmModelService } from '../services/llmModelService';
import type { LLMAssignments } from '../services/llmModelService';

const defaultSettings: ReplyGenerationSettings = {
    similarReviewsCount: 3,
    replyRequestCount: 0,
    useEmbeddingRules: true,
    useSimilarReviews: true,
};

export const ReplyGeneration: React.FC = () => {
    const navigate = useNavigate();
    const [settings, setSettings] = useState<ReplyGenerationSettings>(defaultSettings);
    const [assignments, setAssignments] = useState<LLMAssignments | null>(null);
    const [loading, setLoading] = useState(true);
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        const loadAll = async () => {
            setLoading(true);
            try {
                const [data, assignData] = await Promise.all([
                    settingsService.getReplyGenerationSettings(),
                    llmModelService.getAssignments(),
                ]);
                setSettings({ ...defaultSettings, ...data });
                setAssignments(assignData);
            } catch (error) {
                console.error('Failed to load reply generation settings:', error);
                setErrorMessage('Failed to load settings. Using defaults until you save.');
                setSettings(defaultSettings);
            } finally {
                setLoading(false);
            }
        };

        loadAll();
    }, []);

    const updateField = <K extends keyof ReplyGenerationSettings>(key: K, value: ReplyGenerationSettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setSaveState('idle');
        setErrorMessage(null);
    };

    const handleSave = async () => {
        if (saveState === 'saving') {
            return;
        }

        setSaveState('saving');
        setErrorMessage(null);

        try {
            const saved = await settingsService.updateReplyGenerationSettings(settings);
            setSettings({ ...defaultSettings, ...saved });
            setSaveState('saved');
            window.setTimeout(() => setSaveState('idle'), 2500);
        } catch (error) {
            console.error('Failed to save reply generation settings:', error);
            setSaveState('error');
            setErrorMessage(error instanceof Error ? error.message : 'Failed to save reply generation settings.');
        }
    };

    if (loading) {
        return <ReplyGenerationSkeleton />;
    }

    const assignedModelName = assignments?.reply_generation_model_name;
    const hasAssignedModel = !!assignments?.reply_generation_model_id;

    return (
        <div className="space-y-6 pt-4">
            <section className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                <div className="absolute inset-0 bg-slate-50/70 dark:bg-slate-900/50 pointer-events-none" />
                <div className="relative p-5 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <Sparkles size={18} className="text-sky-600 dark:text-sky-400" />
                                Reply Generation Console
                            </h2>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
                                Configure prompt context depth and embedding behavior for AI-generated replies.
                            </p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border dark:border-slate-600 px-3 py-1.5 text-xs font-semibold w-fit bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm dark:text-slate-300">
                            <Wand2 size={14} className="text-slate-600 dark:text-slate-400" />
                            Active Provider
                            <span className={`rounded-full border px-2 py-0.5 ${
                                hasAssignedModel
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
                                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50'
                            }`}>
                                {hasAssignedModel ? 'LLM Gateway' : 'Not Assigned'}
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <section className="xl:col-span-2 space-y-5">
                    {/* Active Model Card */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 md:p-6 shadow-sm space-y-5">
                        <div className="flex items-center gap-2">
                            <Bot size={16} className="text-violet-600 dark:text-violet-400" />
                            <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-700 dark:text-slate-300">Assigned Model</h3>
                        </div>

                        {hasAssignedModel ? (
                            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-900/20 p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                            {assignedModelName || 'Unknown Model'}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            Replies are generated via the LLM Gateway using the assigned model.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => navigate('/llm-models')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-colors"
                                    >
                                        <ExternalLink size={13} />
                                        Manage Models
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/20 p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                                            No model assigned for reply generation
                                        </div>
                                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                            Go to LLM Models to register a model and assign it to reply generation.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => navigate('/llm-models')}
                                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors shadow-sm"
                                    >
                                        <ExternalLink size={13} />
                                        Configure Model
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Embedding Context Controls */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 md:p-6 shadow-sm space-y-5">
                        <div className="flex items-center gap-2">
                            <Sparkles size={16} className="text-sky-600 dark:text-sky-400" />
                            <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-700 dark:text-slate-300">Embedding Context Controls</h3>
                        </div>

                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                                    <ToggleSwitch
                                        checked={settings.useEmbeddingRules}
                                        onChange={(checked) => updateField('useEmbeddingRules', checked)}
                                        label="Use embedding search rules"
                                    />
                                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Include matched rule context in generated replies.</p>
                                </div>
                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                                    <ToggleSwitch
                                        checked={settings.useSimilarReviews}
                                        onChange={(checked) => updateField('useSimilarReviews', checked)}
                                        label="Use similar reviews"
                                    />
                                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Include embedding-matched reviews in the prompt.</p>
                                </div>
                            </div>
                            <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Similar Reviews Count</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={settings.similarReviewsCount}
                                    onChange={(event) => updateField('similarReviewsCount', Number(event.target.value || 1))}
                                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                />
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                                    Controls how many embedding-matched reviews are injected when similar reviews are enabled.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <aside className="space-y-5">
                    <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm space-y-4">
                        <div className="flex items-center gap-2">
                            <BarChart3 size={16} className="text-sky-600 dark:text-sky-400" />
                            <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-700 dark:text-slate-300">Usage Snapshot</h3>
                        </div>

                        <div className="space-y-3">
                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3">
                                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reply Requests</div>
                                <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{settings.replyRequestCount}</div>
                            </div>
                        </div>
                    </section>

                    {/* Quick Links */}
                    <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm space-y-4">
                        <div className="flex items-center gap-2">
                            <Bot size={16} className="text-violet-600 dark:text-violet-400" />
                            <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-700 dark:text-slate-300">Quick Links</h3>
                        </div>
                        <div className="space-y-2">
                            <button
                                onClick={() => navigate('/llm-models')}
                                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:border-violet-200 dark:hover:border-violet-800 transition-colors group"
                            >
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">
                                    LLM Models & Assignments
                                </span>
                                <ExternalLink size={14} className="text-slate-400 group-hover:text-violet-500 transition-colors" />
                            </button>
                        </div>
                    </section>
                </aside>
            </div>

            <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    {saveState === 'saved' && <p className="text-sm text-emerald-600 dark:text-emerald-400">Reply generation settings saved.</p>}
                    {(saveState === 'error' || errorMessage) && <p className="text-sm text-rose-600 dark:text-rose-400">{errorMessage}</p>}
                    {saveState === 'idle' && !errorMessage && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Save after changing context depth or embedding settings.</p>
                    )}
                </div>
                <button
                    onClick={handleSave}
                    disabled={saveState === 'saving'}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-600 text-white rounded-xl font-medium hover:bg-sky-700 transition-colors disabled:opacity-70 w-full md:w-auto"
                >
                    <Save size={16} />
                    {saveState === 'saving' ? 'Saving...' : 'Save Changes'}
                </button>
            </section>
        </div>
    );
};
