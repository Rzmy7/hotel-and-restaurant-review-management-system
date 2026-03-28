import React, { useEffect, useState } from 'react';
import { Save, Sparkles } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
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
const CLAUDE_MODELS = [
    'claude-sonnet-4-6',
    'claude-sonnet-4-5-20250929',
    'claude-sonnet-4-20250514',
    'claude-haiku-4-5-20251001',
    'claude-opus-4-6',
    'claude-opus-4-5-20251101',
    'claude-opus-4-1-20250805',
    'claude-opus-4-20250514',
];
const ALL_MODELS = [...GOOGLE_MODELS, ...CLAUDE_MODELS];

const defaultSettings: ReplyGenerationSettings = {
    googleApiKey: '',
    claudeApiKey: '',
    selectedModel: 'gemini-2.5-flash-lite',
    similarReviewsCount: 3,
    googleRequestCount: 0,
    claudeRequestCount: 0,
};

export const ReplyGeneration: React.FC = () => {
    const [settings, setSettings] = useState<ReplyGenerationSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [googleTestState, setGoogleTestState] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [claudeTestState, setClaudeTestState] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [googleTestMessage, setGoogleTestMessage] = useState<string | null>(null);
    const [claudeTestMessage, setClaudeTestMessage] = useState<string | null>(null);

    useEffect(() => {
        const loadSettings = async () => {
            setLoading(true);
            try {
                const data = await settingsService.getReplyGenerationSettings();
                setSettings(data);
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
        setClaudeTestState('idle');
        setGoogleTestMessage(null);
        setClaudeTestMessage(null);
    };

    const handleTestGoogleApiKey = async () => {
        if (googleTestState === 'testing') {
            return;
        }

        const apiKey = settings.googleApiKey.trim();
        const model = settings.selectedModel.startsWith('gemini') ? settings.selectedModel : GOOGLE_MODELS[0];
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

    const handleTestClaudeApiKey = async () => {
        if (claudeTestState === 'testing') {
            return;
        }

        const apiKey = settings.claudeApiKey.trim();
        const model = settings.selectedModel.startsWith('claude') ? settings.selectedModel : CLAUDE_MODELS[0];
        if (!apiKey) {
            setClaudeTestState('error');
            setClaudeTestMessage('Please enter a Claude API key to test.');
            return;
        }

        setClaudeTestState('testing');
        setClaudeTestMessage(null);

        try {
            const result = await settingsService.testReplyGenerationApiKey({ provider: 'claude', apiKey, model });
            setClaudeTestState(result.success ? 'success' : 'error');
            setClaudeTestMessage(result.message);
        } catch (error) {
            setClaudeTestState('error');
            setClaudeTestMessage(error instanceof Error ? error.message : 'Failed to test Claude API key.');
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
            setSettings(saved);
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

    const selectedProviderLabel = settings.selectedModel.startsWith('claude') ? 'Claude' : 'Google';

    return (
        <div className="pt-4 max-w-4xl space-y-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 space-y-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                            <Sparkles size={16} className="text-blue-600" />
                            Reply Generation Configuration
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Choose a model and control how much embedding context is sent when generating review replies.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Reply Model</label>
                        <select
                            value={settings.selectedModel}
                            onChange={(event) => updateField('selectedModel', event.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            {ALL_MODELS.map((model) => (
                                <option key={model} value={model}>{model}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Combined list of Google and Claude models.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Similar Reviews Count</label>
                        <input
                            type="number"
                            min={1}
                            max={20}
                            value={settings.similarReviewsCount}
                            onChange={(event) => updateField('similarReviewsCount', Number(event.target.value || 1))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Number of embedding-matched similar reviews to include in the AI prompt.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                        <div className="text-xs text-gray-500 uppercase tracking-wider">Google Request Count</div>
                        <div className="mt-1 text-lg font-semibold text-gray-900">{settings.googleRequestCount}</div>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                        <div className="text-xs text-gray-500 uppercase tracking-wider">Claude Request Count</div>
                        <div className="mt-1 text-lg font-semibold text-gray-900">{settings.claudeRequestCount}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Google API Key</label>
                        <input
                            type="password"
                            value={settings.googleApiKey}
                            onChange={(event) => updateField('googleApiKey', event.target.value)}
                            placeholder="Enter Google API key"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="mt-2 flex items-center gap-3">
                            <button
                                onClick={handleTestGoogleApiKey}
                                disabled={googleTestState === 'testing'}
                                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-70"
                            >
                                {googleTestState === 'testing' ? 'Testing Google...' : 'Test Google API Key'}
                            </button>
                            {googleTestMessage && (
                                <span className={`text-sm ${googleTestState === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                    {googleTestMessage}
                                </span>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Claude API Key</label>
                        <input
                            type="password"
                            value={settings.claudeApiKey}
                            onChange={(event) => updateField('claudeApiKey', event.target.value)}
                            placeholder="Enter Claude API key"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="mt-2 flex items-center gap-3">
                            <button
                                onClick={handleTestClaudeApiKey}
                                disabled={claudeTestState === 'testing'}
                                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-70"
                            >
                                {claudeTestState === 'testing' ? 'Testing Claude...' : 'Test Claude API Key'}
                            </button>
                            {claudeTestMessage && (
                                <span className={`text-sm ${claudeTestState === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                    {claudeTestMessage}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                    When generating replies, all relevant rules returned by embedding search are sent to the model. The selected provider is currently <span className="font-semibold">{selectedProviderLabel}</span>.
                </div>
            </div>

            {saveState === 'saved' && <div className="text-sm text-green-600">Reply generation settings saved.</div>}
            {(saveState === 'error' || errorMessage) && <div className="text-sm text-red-600">{errorMessage}</div>}

            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saveState === 'saving'}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-70"
                >
                    <Save size={16} />
                    {saveState === 'saving' ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
};
