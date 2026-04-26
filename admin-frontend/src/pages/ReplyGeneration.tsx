import React, { useEffect, useState } from 'react';
import { BarChart3, KeyRound, Save, Sparkles, Wand2 } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ToggleSwitch } from '../components/ToggleSwitch';
import { settingsService } from '../services/settingsService';
import type { ReplyGenerationSettings } from '../services/settingsService';

const GOOGLE_MODELS = [
    'gemini-2.0-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
    'gemini-pro-latest',
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash-lite-preview-09-2025',
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite-preview',
    'gemini-3-pro-preview',
    'gemini-3.1-pro-preview',
    'gemini-3.1-pro-preview-customtools',
    'gemma-3-4b-it',
    'gemma-3-12b-it',
    'gemma-3-27b-it',
];

const defaultSettings: ReplyGenerationSettings = {
    googleApiKey: '',
    selectedModel: 'gemini-2.5-flash-lite',
    similarReviewsCount: 3,
    googleRequestCount: 0,
    googleTokenUsage: 0,
    useEmbeddingRules: true,
    useSimilarReviews: true,
};

export const ReplyGeneration: React.FC = () => {
    const [settings, setSettings] = useState<ReplyGenerationSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [googleTestState, setGoogleTestState] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [googleTestMessage, setGoogleTestMessage] = useState<string | null>(null);

    useEffect(() => {
        const loadSettings = async () => {
            setLoading(true);
            try {
                const data = await settingsService.getReplyGenerationSettings();
                setSettings({ ...defaultSettings, ...data });
            } catch (error) {
                console.error('Failed to load reply generation settings:', error);
                setErrorMessage('Failed to load settings. Using defaults until you save.');
                setSettings(defaultSettings);
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, []);

    const updateField = <K extends keyof ReplyGenerationSettings>(key: K, value: ReplyGenerationSettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setSaveState('idle');
        setErrorMessage(null);
        setGoogleTestState('idle');
        setGoogleTestMessage(null);
    };

    const handleTestGoogleApiKey = async () => {
        if (googleTestState === 'testing') {
            return;
        }

        const apiKey = settings.googleApiKey.trim();
        const model = settings.selectedModel;
        if (!apiKey) {
            setGoogleTestState('error');
            setGoogleTestMessage('Please enter a Google API key to test.');
            return;
        }

        setGoogleTestState('testing');
        setGoogleTestMessage(null);

        try {
            const result = await settingsService.testReplyGenerationApiKey({ provider: 'google', apiKey, model });
            setGoogleTestState(result.success ? 'success' : 'error');
            setGoogleTestMessage(result.message);
        } catch (error) {
            setGoogleTestState('error');
            setGoogleTestMessage(error instanceof Error ? error.message : 'Failed to test Google API key.');
        }
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
        return <LoadingSpinner />;
    }

    return (
        <div className="space-y-6 pt-4">
            <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="absolute inset-0 bg-slate-50/70 pointer-events-none" />
                <div className="relative p-5 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <Sparkles size={18} className="text-sky-600" />
                                Reply Generation Console
                            </h2>
                            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                                Organize model behavior, prompt context depth, and provider credentials from one place.
                            </p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold w-fit bg-white/80 backdrop-blur-sm">
                            <Wand2 size={14} className="text-slate-600" />
                            Active Provider
                            <span className="rounded-full border px-2 py-0.5 bg-blue-100 text-blue-700 border-blue-200">
                                Google
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <section className="xl:col-span-2 space-y-5">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm space-y-5">
                        <div className="flex items-center gap-2">
                            <Sparkles size={16} className="text-sky-600" />
                            <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-700">Model Settings</h3>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Reply Model</label>
                                <select
                                    value={settings.selectedModel}
                                    onChange={(event) => updateField('selectedModel', event.target.value)}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                >
                                    {GOOGLE_MODELS.map((model) => (
                                        <option key={model} value={model}>{model}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-500 mt-1.5">Select a Google Gemini model for reply generation.</p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <h4 className="text-sm font-semibold text-slate-700">Embedding Context Controls</h4>
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="rounded-lg border border-slate-200 bg-white p-3">
                                    <ToggleSwitch
                                        checked={settings.useEmbeddingRules}
                                        onChange={(checked) => updateField('useEmbeddingRules', checked)}
                                        label="Use embedding search rules"
                                    />
                                    <p className="mt-2 text-xs text-slate-500">Include matched rule context in generated replies.</p>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-white p-3">
                                    <ToggleSwitch
                                        checked={settings.useSimilarReviews}
                                        onChange={(checked) => updateField('useSimilarReviews', checked)}
                                        label="Use similar reviews"
                                    />
                                    <p className="mt-2 text-xs text-slate-500">Include embedding-matched reviews in the prompt.</p>
                                </div>
                            </div>
                            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Similar Reviews Count</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={settings.similarReviewsCount}
                                    onChange={(event) => updateField('similarReviewsCount', Number(event.target.value || 1))}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                />
                                <p className="text-xs text-slate-500 mt-1.5">
                                    Controls how many embedding-matched reviews are injected when similar reviews are enabled.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-2">
                            <KeyRound size={16} className="text-sky-600" />
                            <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-700">Provider API Key</h3>
                        </div>

                        <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Google API Key</label>
                                <input
                                    type="password"
                                    value={settings.googleApiKey}
                                    onChange={(event) => updateField('googleApiKey', event.target.value)}
                                    placeholder="Enter Google API key"
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                />
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    onClick={handleTestGoogleApiKey}
                                    disabled={googleTestState === 'testing'}
                                    className="px-4 py-2 bg-white border border-sky-200 rounded-lg text-sm font-semibold text-slate-700 hover:text-sky-700 hover:border-sky-300 hover:bg-sky-100 transition-colors disabled:opacity-70"
                                >
                                    {googleTestState === 'testing' ? 'Testing Google...' : 'Test Google Key'}
                                </button>
                                {googleTestMessage && (
                                    <span className={`text-sm ${googleTestState === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {googleTestMessage}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <aside className="space-y-5">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                        <div className="flex items-center gap-2">
                            <BarChart3 size={16} className="text-sky-600" />
                            <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-700">Usage Snapshot</h3>
                        </div>

                        <div className="space-y-3">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <div className="text-xs text-slate-500 uppercase tracking-wider">Google Requests</div>
                                <div className="mt-1 text-2xl font-semibold text-slate-900">{settings.googleRequestCount}</div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <div className="text-xs text-slate-500 uppercase tracking-wider">Google Token Usage</div>
                                <div className="mt-1 text-2xl font-semibold text-slate-900">{settings.googleTokenUsage}</div>
                            </div>
                        </div>
                    </section>
                </aside>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    {saveState === 'saved' && <p className="text-sm text-emerald-600">Reply generation settings saved.</p>}
                    {(saveState === 'error' || errorMessage) && <p className="text-sm text-rose-600">{errorMessage}</p>}
                    {saveState === 'idle' && !errorMessage && (
                        <p className="text-sm text-slate-500">Save after changing model, context depth, or provider credentials.</p>
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
