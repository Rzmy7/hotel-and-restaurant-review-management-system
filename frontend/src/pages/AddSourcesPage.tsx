import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  CheckCircle2, 
  Globe, 
  Search, 
  ExternalLink,
  Loader2
} from 'lucide-react';
import SetupLayout from '../components/shared/SetupLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { apiClient } from '../api/client';

const SETUP_DRAFT_CONFIG_KEY = 'setup_draft_config';

interface Platform {
  platform_id: number;
  platform_name: string;
  base_url: string;
  fetching_type: string;
  platform_status: string;
}

interface SelectedSource {
  platform_id: number;
  source_url: string;
  platform_name: string;
}

const AddSourcesPage = () => {
  const navigate = useNavigate();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedSources, setSelectedSources] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchPlatforms = async () => {
      try {
        const data = await apiClient.get<Platform[]>('/api/source/platforms');
        setPlatforms(data || []);
        
        // Populate from draft if exists
        const draftStr = localStorage.getItem(SETUP_DRAFT_CONFIG_KEY);
        if (draftStr) {
          const draft = JSON.parse(draftStr);
          if (draft.sources) {
            const initialSelected: Record<number, string> = {};
            draft.sources.forEach((s: any) => {
              initialSelected[s.platform_id] = s.source_url;
            });
            setSelectedSources(initialSelected);
          }
        }
      } catch (error) {
        console.error('Failed to fetch platforms:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlatforms();
  }, []);

  const handleContinue = () => {
    setIsSaving(true);
    
    // Convert selectedSources to the list format expected by backend
    const sourcesToSave = Object.entries(selectedSources)
      .filter(([_, url]) => url.trim().length > 0)
      .map(([id, url]) => ({
        platform_id: parseInt(id),
        source_url: url.trim(),
        fetching_frequency: 1 // Default to 1 (Daily) for now
      }));

    const draftStr = localStorage.getItem(SETUP_DRAFT_CONFIG_KEY);
    const draft = draftStr ? JSON.parse(draftStr) : {};
    
    localStorage.setItem(SETUP_DRAFT_CONFIG_KEY, JSON.stringify({
      ...draft,
      sources: sourcesToSave
    }));

    navigate('/setup/finish');
  };

  const handleBack = () => {
    navigate('/setup');
  };

  const updateSourceUrl = (platformId: number, url: string) => {
    setSelectedSources(prev => ({
      ...prev,
      [platformId]: url
    }));
  };

  return (
    <SetupLayout
      currentStep={2}
      onContinue={handleContinue}
      onBack={handleBack}
      isContinueDisabled={isLoading || isSaving}
    >
      <div className="text-center mb-10">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-3">
            Connect Sources
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
            Link your review platforms to start aggregating feedback
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Fetching available platforms...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 mb-12">
          {platforms.map((platform) => {
            const url = selectedSources[platform.platform_id] || '';
            const isConnected = url.trim().length > 0;
            
            return (
              <div
                key={platform.platform_id}
                className={`
                  relative p-6 rounded-2xl border-2 transition-all duration-300
                  ${isConnected 
                    ? 'border-blue-600 bg-blue-50/30 dark:bg-blue-900/10 shadow-lg shadow-blue-500/5' 
                    : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'}
                `}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="flex items-center gap-4 shrink-0">
                    <div className={`
                      w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg transition-colors
                      ${isConnected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}
                    `}>
                      {platform.platform_name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-[16px] font-black uppercase tracking-tight text-slate-900 dark:text-white">
                          {platform.platform_name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                          {isConnected ? 'URL Provided' : 'Action Required'}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 relative group">
                    <Globe className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isConnected ? 'text-blue-500' : 'text-slate-400'}`} />
                    <Input
                      type="text"
                      placeholder={`Enter your ${platform.platform_name} property URL...`}
                      value={url}
                      onChange={(e) => updateSourceUrl(platform.platform_id, e.target.value)}
                      className="pl-11 h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  
                  {isConnected && (
                    <div className="hidden md:flex items-center text-blue-600 animate-in zoom-in duration-300">
                      <CheckCircle2 size={24} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {platforms.length === 0 && (
            <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 font-medium italic">No review platforms enabled in the system yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Manual Entry remains as a fallback/info box */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-2">
            <h3 className="text-[14px] font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Not seeing your platform?
            </h3>
        </div>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium">
            We are constantly adding new platforms. If you have a specific requirement, contact our support team.
        </p>
      </div>
    </SetupLayout>
  );
};

export default AddSourcesPage;
