import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  CheckCircle2, 
  Globe, 
  Search, 
  ExternalLink,
  Loader2,
  AlertCircle
} from 'lucide-react';
import SetupLayout from '../components/shared/SetupLayout';
import SetupSkeleton from './SetupSkeleton';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { apiClient } from '../api/client';
import { validatePlatformUrl, normalizeUrl } from '../utils/sourceValidation';

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
  const [touchedInputs, setTouchedInputs] = useState<Record<number, boolean>>({});
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

  // Compute validation results for all platforms
  const validationMap = platforms.reduce<Record<number, { isValid: boolean; error?: string; normalizedUrl?: string }>>(
    (acc, platform) => {
      const url = selectedSources[platform.platform_id] || '';
      if (url.trim().length > 0) {
        acc[platform.platform_id] = validatePlatformUrl(platform.platform_name, url);
      } else {
        acc[platform.platform_id] = { isValid: true };
      }
      return acc;
    },
    {}
  );

  const hasAnyInvalidUrl = Object.values(validationMap).some(v => v.isValid === false);

  const handleContinue = () => {
    // Touch all filled inputs to show any hidden validation errors
    const newTouched: Record<number, boolean> = {};
    platforms.forEach(p => {
      if ((selectedSources[p.platform_id] || '').trim().length > 0) {
        newTouched[p.platform_id] = true;
      }
    });
    setTouchedInputs(prev => ({ ...prev, ...newTouched }));

    if (hasAnyInvalidUrl) return;

    setIsSaving(true);
    
    // Convert selectedSources to the list format expected by backend
    const sourcesToSave = Object.entries(selectedSources)
      .filter(([_, url]) => url.trim().length > 0)
      .map(([id, url]) => {
        const platformId = parseInt(id);
        const rawUrl = url.trim();
        const val = validationMap[platformId];
        return {
          platform_id: platformId,
          source_url: val?.normalizedUrl || normalizeUrl(rawUrl),
          fetching_frequency: 2 // Default to 2 (Every 3 Days) for now
        };
      });

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

  const handleBlurInput = (platformId: number) => {
    setTouchedInputs(prev => ({ ...prev, [platformId]: true }));
    const currentUrl = selectedSources[platformId] || '';
    if (currentUrl.trim()) {
      const normalized = normalizeUrl(currentUrl);
      if (normalized !== currentUrl) {
        updateSourceUrl(platformId, normalized);
      }
    }
  };

  if (isLoading) {
    return <SetupSkeleton currentStep={2} />;
  }

  return (
    <SetupLayout
      currentStep={2}
      onContinue={handleContinue}
      onBack={handleBack}
      isContinueDisabled={isLoading || isSaving || hasAnyInvalidUrl}
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
            const validation = validationMap[platform.platform_id] || { isValid: true };
            const isTouched = touchedInputs[platform.platform_id];
            const isConnected = url.trim().length > 0 && validation.isValid;
            const hasError = url.trim().length > 0 && !validation.isValid && isTouched;
            
            return (
              <div
                key={platform.platform_id}
                className={`
                  relative p-6 rounded-2xl border-2 transition-all duration-300
                  ${hasError
                    ? 'border-red-400 dark:border-red-500 bg-red-50/20 dark:bg-red-950/10'
                    : isConnected 
                      ? 'border-blue-600 bg-blue-50/30 dark:bg-blue-900/10 shadow-lg shadow-blue-500/5' 
                      : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'}
                `}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="flex items-center gap-4 shrink-0">
                    <div className={`
                      w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg transition-colors
                      ${hasError
                        ? 'bg-red-500 text-white'
                        : isConnected 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}
                    `}>
                      {platform.platform_name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-[16px] font-black uppercase tracking-tight text-slate-900 dark:text-white">
                          {platform.platform_name}
                      </div>
                      <div className={`text-[11px] font-bold uppercase tracking-widest ${hasError ? 'text-red-500' : 'text-slate-400'}`}>
                          {hasError ? 'Invalid URL' : isConnected ? 'URL Validated' : 'Action Required'}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 relative group">
                    <Globe className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${hasError ? 'text-red-500' : isConnected ? 'text-blue-500' : 'text-slate-400'}`} />
                    <Input
                      type="text"
                      placeholder={`Enter your ${platform.platform_name} property URL...`}
                      value={url}
                      onChange={(e) => updateSourceUrl(platform.platform_id, e.target.value)}
                      onBlur={() => handleBlurInput(platform.platform_id)}
                      className={`pl-11 h-12 bg-white dark:bg-slate-900 ${
                        hasError
                          ? 'border-red-400 dark:border-red-500 focus:border-red-500'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    />
                    {url.trim() && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        {validation.isValid ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : isTouched ? (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        ) : null}
                      </div>
                    )}
                  </div>
                  
                  {isConnected && (
                    <div className="hidden md:flex items-center text-blue-600 animate-in zoom-in duration-300">
                      <CheckCircle2 size={24} />
                    </div>
                  )}
                </div>

                {hasError && (
                  <p className="mt-3 text-xs font-semibold text-red-500 dark:text-red-400 flex items-center gap-1.5 pl-1 md:pl-[64px]">
                    <AlertCircle size={14} className="shrink-0" />
                    {validation.error}
                  </p>
                )}
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

