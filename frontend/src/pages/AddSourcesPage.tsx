import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  CheckCircle2, 
  Globe, 
  Search, 
  ExternalLink,
  Loader2,
} from 'lucide-react';
import SetupLayout from '../components/shared/SetupLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { apiClient } from '../api/client';

interface ReviewSource {
  id: string;
  name: string;
  type: string;
  connected: boolean;
}

type ScheduleType = 'hourly' | 'daily' | 'weekly';

interface SetupSourcesResponse {
  organization_id: string;
  sources: Array<{
    name: string;
    icon: string;
    connected: boolean;
  }>;
  connected_sources: Array<{
    source_id: string;
    source_name: string;
    source_url: string | null;
    connected: boolean;
    fetching_frequency: ScheduleType;
  }>;
}

const SETUP_PENDING_ORG_ID_KEY = 'setup_pending_organization_id';
const SETUP_PENDING_SCHEDULE_KEY = 'setup_pending_schedule';

const normalizeSourceName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const getPendingOrganizationId = () =>
  localStorage.getItem(SETUP_PENDING_ORG_ID_KEY) || localStorage.getItem('current_organization') || '';

const getPendingSchedule = (): ScheduleType => {
  const value = localStorage.getItem(SETUP_PENDING_SCHEDULE_KEY);
  if (value === 'hourly' || value === 'daily' || value === 'weekly') {
    return value;
  }
  return 'daily';
};

const PLATFORM_SOURCES: ReviewSource[] = [
  { id: 'google', name: 'Google Reviews', type: 'google', connected: false },
  { id: 'booking', name: 'Booking.com', type: 'booking', connected: false },
  { id: 'tripadvisor', name: 'Trip Advisor', type: 'tripadvisor', connected: false },
  { id: 'facebook', name: 'Facebook business', type: 'facebook', connected: false },
  { id: 'yelp', name: 'Yelp', type: 'yelp', connected: false },
  { id: 'trustpilot', name: 'Trustpilot', type: 'trustpilot', connected: false },
];

const AddSourcesPage = () => {
  const navigate = useNavigate();
  const [customSourceUrl, setCustomSourceUrl] = useState('');
  const [sources, setSources] = useState<ReviewSource[]>(PLATFORM_SOURCES);
  const [organizationId, setOrganizationId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [activeCustomSources, setActiveCustomSources] = useState<Array<{ source_id: string; source_name: string; source_url: string | null }>>([]);

  const platformNameLookup = useMemo(() => {
    return new Map(PLATFORM_SOURCES.map((source) => [normalizeSourceName(source.name), source.name]));
  }, []);

  const loadSetupSources = async (resolvedOrganizationId: string) => {
    const data = await apiClient.get<SetupSourcesResponse>('/api/setup/sources', {
      organization_id: resolvedOrganizationId,
    });

    const connectedByName = new Set(
      data.connected_sources
        .filter((item) => item.connected)
        .map((item) => normalizeSourceName(item.source_name))
    );

    setSources((prev) =>
      prev.map((source) => ({
        ...source,
        connected: connectedByName.has(normalizeSourceName(source.name)),
      }))
    );

    const customSources = data.connected_sources.filter(
      (item) => !platformNameLookup.has(normalizeSourceName(item.source_name))
    );
    setActiveCustomSources(
      customSources.map((item) => ({
        source_id: item.source_id,
        source_name: item.source_name,
        source_url: item.source_url,
      }))
    );
  };

  useEffect(() => {
    const bootstrap = async () => {
      const resolvedOrganizationId = getPendingOrganizationId();
      setOrganizationId(resolvedOrganizationId);

      if (!resolvedOrganizationId) {
        setIsLoading(false);
        alert('No organization found for setup. Please start setup again.');
        navigate('/setup');
        return;
      }

      try {
        await loadSetupSources(resolvedOrganizationId);
      } catch (error) {
        console.error('Failed to load setup sources:', error);
        alert('Could not load sources from server. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, [navigate, platformNameLookup]);

  const handleContinue = () => {
    navigate('/setup/schedule');
  };

  const handleBack = () => {
    navigate('/setup');
  };

  const handleConnect = async (sourceId: string) => {
    if (!organizationId || isSubmitting) return;

    const source = sources.find((item) => item.id === sourceId);
    if (!source) return;

    try {
      setIsSubmitting(true);
      setActiveSourceId(sourceId);

      if (source.connected) {
        await apiClient.post('/api/setup/sources/disconnect', {
          organization_id: organizationId,
          source_name: source.name,
          source_url: null,
        });
      } else {
        await apiClient.post('/api/setup/sources/connect', {
          organization_id: organizationId,
          source_name: source.name,
          source_url: null,
          fetching_frequency: getPendingSchedule(),
        });
      }

      await loadSetupSources(organizationId);
    } catch (error) {
      console.error('Failed to toggle source connection:', error);
      alert('Could not update source connection. Please try again.');
    } finally {
      setIsSubmitting(false);
      setActiveSourceId(null);
    }
  };

  const handleConnectCustomSource = async () => {
    if (!organizationId || isSubmitting) return;

    const trimmedUrl = customSourceUrl.trim();
    if (!trimmedUrl) return;

    try {
      new URL(trimmedUrl);
    } catch {
      alert('Please enter a valid URL for the custom source.');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post('/api/setup/sources/custom', {
        organization_id: organizationId,
        source_name: 'Custom Source',
        source_url: trimmedUrl,
        fetching_frequency: getPendingSchedule(),
      });
      setCustomSourceUrl('');
      await loadSetupSources(organizationId);
    } catch (error) {
      console.error('Failed to connect custom source:', error);
      alert('Could not connect custom source. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SetupLayout
      currentStep={2}
      onContinue={handleContinue}
      onBack={handleBack}
    >
      <div className="text-center mb-10">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-3">
            Connect Sources
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
            Link your review platforms to start aggregating feedback
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
        {sources.map((source) => (
          <div
            key={source.id}
            className={`
              relative p-4 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between
              ${source.connected 
                ? 'border-blue-600 bg-blue-50/30 dark:bg-blue-900/10' 
                : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700'}
            `}
          >
            <div className="flex items-center gap-4">
              <div className={`
                w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-colors
                ${source.connected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}
              `}>
                {source.name.charAt(0)}
              </div>
              <div>
                <div className="text-[14px] font-black uppercase tracking-tight text-slate-900 dark:text-white">
                    {source.name}
                </div>
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                    {source.connected ? 'Verified' : 'Available'}
                </div>
              </div>
            </div>

            <Button
              size="sm"
              variant={source.connected ? 'primary' : 'outline'}
              onClick={() => void handleConnect(source.id)}
              disabled={isLoading || isSubmitting}
              className={`h-9 px-4 text-[11px] font-black uppercase tracking-widest rounded-lg ${source.connected ? 'shadow-lg shadow-blue-500/20' : ''}`}
              leftIcon={
                activeSourceId === source.id
                  ? <Loader2 size={14} className="animate-spin" />
                  : source.connected
                    ? <CheckCircle2 size={14} />
                    : <Plus size={14} />
              }
            >
              {source.connected ? 'Added' : 'Add'}
            </Button>
          </div>
        ))}
      </div>

      {activeCustomSources.length > 0 && (
        <div className="mb-8 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 bg-white dark:bg-slate-900">
          <h4 className="text-[13px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 mb-3">
            Connected Custom Sources
          </h4>
          <div className="space-y-2">
            {activeCustomSources.map((source) => (
              <div key={source.source_id} className="text-sm text-slate-600 dark:text-slate-300 break-all">
                {source.source_name}: {source.source_url || '-'}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center text-blue-600 shadow-sm border border-slate-100 dark:border-slate-800 text-lg">
                <Globe size={18} />
            </div>
            <h3 className="text-[15px] font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Add Custom Source
            </h3>
        </div>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium mb-6">
            Can't find your platform? Provide the direct link to your property's review page.
        </p>
        
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors group-focus-within:text-blue-500" />
            <Input
              type="text"
              placeholder="https://www.booking.com/hotel/..."
              value={customSourceUrl}
              onChange={(e) => setCustomSourceUrl(e.target.value)}
              className="pl-11 h-12 bg-white dark:bg-slate-900"
            />
          </div>
          <Button
            onClick={() => void handleConnectCustomSource()}
            disabled={isLoading || isSubmitting || !customSourceUrl.trim()}
            className="h-12 px-8 font-black uppercase text-[12px] tracking-widest"
            leftIcon={isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
          >
            Connect
          </Button>
        </div>
      </div>
    </SetupLayout>
  );
};

export default AddSourcesPage;
