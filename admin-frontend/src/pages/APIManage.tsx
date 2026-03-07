import React, { useEffect, useState } from 'react';
import { Save, Loader, Globe } from 'lucide-react';
import { setEmbeddingServiceUrl } from '../services/embeddingService';

export const APIManage: React.FC = () => {
    const [apiSettings, setApiSettings] = useState({
        embeddingServiceUrl: 'http://localhost:8001',
        mainBackendUrl: 'http://localhost:8000',
        scrapingBackendUrl: 'http://localhost:8002'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        const loadAPISettings = async () => {
            try {
                setLoading(true);
                
                // Get URLs from localStorage (client-side settings)  
                const storedEmbeddingUrl = localStorage.getItem('embeddingServiceUrl') || 'http://localhost:8001';
                const storedMainBackendUrl = localStorage.getItem('mainBackendUrl') || 'http://localhost:8000';
                const storedScrapingBackendUrl = localStorage.getItem('scrapingBackendUrl') || 'http://localhost:8002';
                
                setApiSettings({
                    embeddingServiceUrl: storedEmbeddingUrl,
                    mainBackendUrl: storedMainBackendUrl,
                    scrapingBackendUrl: storedScrapingBackendUrl
                });
                
                setError(null);
            } catch (err) {
                console.error('Failed to load API settings:', err);
                // Don't show error on initialization - just use defaults
                const storedEmbeddingUrl = localStorage.getItem('embeddingServiceUrl') || 'http://localhost:8001';
                const storedMainBackendUrl = localStorage.getItem('mainBackendUrl') || 'http://localhost:8000';
                const storedScrapingBackendUrl = localStorage.getItem('scrapingBackendUrl') || 'http://localhost:8002';
                setApiSettings({
                    embeddingServiceUrl: storedEmbeddingUrl,
                    mainBackendUrl: storedMainBackendUrl,
                    scrapingBackendUrl: storedScrapingBackendUrl
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
            
            // Save URLs to localStorage (client-side settings)
            setEmbeddingServiceUrl(apiSettings.embeddingServiceUrl);
            localStorage.setItem('mainBackendUrl', apiSettings.mainBackendUrl);
            localStorage.setItem('scrapingBackendUrl', apiSettings.scrapingBackendUrl);
            
            setSuccess('Service URLs saved successfully!');
            
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Failed to save API settings:', err);
            setError('Failed to save service URLs. Please try again.');
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

                {/* Main Backend URL */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Globe size={20} className="text-green-500" />
                        <h2 className="text-base font-semibold text-gray-900">Main Backend URL</h2>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Service Endpoint
                        </label>
                        <input
                            type="text"
                            value={apiSettings.mainBackendUrl}
                            onChange={(e) => setApiSettings({...apiSettings, mainBackendUrl: e.target.value})}
                            placeholder="http://localhost:8000"
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            URL where the main backend service is running. Saved locally in your browser. Default is <code className="bg-gray-100 px-1 py-0.5 rounded">http://localhost:8000</code>
                        </p>
                    </div>
                </div>

                {/* Scraping Backend URL */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Globe size={20} className="text-purple-500" />
                        <h2 className="text-base font-semibold text-gray-900">Scraping Backend URL</h2>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Service Endpoint
                        </label>
                        <input
                            type="text"
                            value={apiSettings.scrapingBackendUrl}
                            onChange={(e) => setApiSettings({...apiSettings, scrapingBackendUrl: e.target.value})}
                            placeholder="http://localhost:8002"
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            URL where the scraping backend service is running. Saved locally in your browser. Default is <code className="bg-gray-100 px-1 py-0.5 rounded">http://localhost:8002</code>
                        </p>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Service URLs are saved locally in your browser.
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
