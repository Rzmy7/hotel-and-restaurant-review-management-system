import React, { useEffect, useState } from 'react';
import { Save, Loader, Eye, EyeOff, Key, Globe } from 'lucide-react';
import { getAPISettings, updateAPISettings, setEmbeddingServiceUrl } from '../services/embeddingService';

export const APIManage: React.FC = () => {
    const [apiSettings, setApiSettings] = useState({
        model: 'MiniLM',
        geminiApiKey: '',
        embeddingServiceUrl: 'http://localhost:8001'
    });
    const [showApiKey, setShowApiKey] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        const loadAPISettings = async () => {
            try {
                setLoading(true);
                
                // Get the embedding service URL from localStorage (client-side setting)  
                const storedUrl = localStorage.getItem('embeddingServiceUrl') || 'http://localhost:8001';
                
                // Try to get Gemini API key from backend (server-side setting)
                let geminiApiKey = '';
                try {
                    const data = await getAPISettings();
                    geminiApiKey = data.geminiApiKey || '';
                } catch (err) {
                    console.warn('Could not load API key from backend, using empty default');
                }
                
                setApiSettings({
                    model: 'MiniLM',
                    geminiApiKey,
                    embeddingServiceUrl: storedUrl
                });
                
                setError(null);
            } catch (err) {
                console.error('Failed to load API settings:', err);
                // Don't show error on initialization - just use defaults
                const storedUrl = localStorage.getItem('embeddingServiceUrl') || 'http://localhost:8001';
                setApiSettings({
                    model: 'MiniLM',
                    geminiApiKey: '',
                    embeddingServiceUrl: storedUrl
                });
            } finally {
                setLoading(false);
            }
        };
        loadAPISettings();
    }, []);

    const handleSaveAPISettings = async () => {
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);
            
            // Save embedding service URL to localStorage only (client-side setting)
            setEmbeddingServiceUrl(apiSettings.embeddingServiceUrl);
            
            // Save Gemini API key to backend (server-side setting)
            // Don't send embeddingServiceUrl to backend to avoid chicken-and-egg problem
            await updateAPISettings({ 
                geminiApiKey: apiSettings.geminiApiKey 
            });
            
            setSuccess('API settings saved successfully!');
            
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Failed to save API settings:', err);
            setError('Failed to save API key to backend. URL was saved locally.');
            
            // Even if backend save fails, the URL is saved to localStorage
            // So partially successful - show this to user after 5 seconds
            setTimeout(() => {
                setError('URL saved locally. API key save failed - check if embedding service is running.');
            }, 100);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader size={32} className="animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="pt-4 max-w-5xl">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">API Management</h1>
                <p className="text-gray-500 mt-1">Configure API credentials and service endpoints</p>
            </div>

            {/* Success/Error Messages */}
            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}
            {success && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-600">{success}</p>
                </div>
            )}

            <div className="space-y-6">
                {/* Google Gemini API Configuration */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Key size={20} className="text-blue-500" />
                        <h2 className="text-base font-semibold text-gray-900">Google Gemini API Key</h2>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            API Key
                        </label>
                        <div className="relative">
                            <input
                                type={showApiKey ? 'text' : 'password'}
                                value={apiSettings.geminiApiKey}
                                onChange={(e) => setApiSettings({...apiSettings, geminiApiKey: e.target.value})}
                                placeholder="Enter your Gemini API key"
                                className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Required when using Google Gemini as your embedding model. You can select the model in the Embeddings page.
                        </p>
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                            <p className="text-xs text-blue-800">
                                <strong>How to get your API key:</strong>
                            </p>
                            <ol className="text-xs text-blue-700 mt-1 ml-4 list-decimal space-y-1">
                                <li>Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">Google AI Studio</a></li>
                                <li>Sign in with your Google account</li>
                                <li>Click "Create API Key"</li>
                                <li>Copy and paste the key above</li>
                            </ol>
                        </div>
                    </div>
                </div>

                {/* Embedding Service URL */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Globe size={20} className="text-blue-500" />
                        <h2 className="text-base font-semibold text-gray-900">Embedding Service URL</h2>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Service Endpoint
                        </label>
                        <input
                            type="text"
                            value={apiSettings.embeddingServiceUrl}
                            onChange={(e) => setApiSettings({...apiSettings, embeddingServiceUrl: e.target.value})}
                            placeholder="http://localhost:8001"
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            URL where the embedding service is running. Saved locally in your browser. Default is <code className="bg-gray-100 px-1 py-0.5 rounded">http://localhost:8001</code>
                        </p>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Service URL saved locally. API key saved to embedding service backend.
                    </p>
                    <button
                        onClick={handleSaveAPISettings}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <Loader size={16} className="animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
