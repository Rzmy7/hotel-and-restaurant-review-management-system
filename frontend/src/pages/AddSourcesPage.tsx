import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  CheckCircle2, 
  Globe, 
  Search, 
  ExternalLink,
  MessageSquare,
  Star
} from 'lucide-react';
import SetupLayout from '../components/shared/SetupLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

interface ReviewSource {
  id: string;
  name: string;
  type: string;
  connected: boolean;
}

const AddSourcesPage = () => {
  const navigate = useNavigate();
  const [customSourceUrl, setCustomSourceUrl] = useState('');
  const [sources, setSources] = useState<ReviewSource[]>([
    { id: '1', name: 'Google Reviews', type: 'google', connected: true },
    { id: '2', name: 'Booking.com', type: 'booking', connected: false },
    { id: '3', name: 'TripAdvisor', type: 'tripadvisor', connected: false },
    { id: '4', name: 'Facebook business', type: 'facebook', connected: false },
    { id: '5', name: 'Yelp', type: 'yelp', connected: false },
    { id: '6', name: 'Trustpilot', type: 'trustpilot', connected: false },
  ]);

  const handleContinue = () => {
    navigate('/setup/schedule');
  };

  const handleBack = () => {
    navigate('/setup');
  };

  const handleConnect = (sourceId: string) => {
    setSources(sources.map(source =>
      source.id === sourceId ? { ...source, connected: !source.connected } : source
    ));
  };

  const handleConnectCustomSource = () => {
    if (customSourceUrl.trim()) {
      alert('Custom source connection feature coming soon!');
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
              onClick={() => handleConnect(source.id)}
              className={`h-9 px-4 text-[11px] font-black uppercase tracking-widest rounded-lg ${source.connected ? 'shadow-lg shadow-blue-500/20' : ''}`}
              leftIcon={source.connected ? <CheckCircle2 size={14} /> : <Plus size={14} />}
            >
              {source.connected ? 'Added' : 'Add'}
            </Button>
          </div>
        ))}
      </div>

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
            onClick={handleConnectCustomSource}
            className="h-12 px-8 font-black uppercase text-[12px] tracking-widest"
            leftIcon={<ExternalLink size={16} />}
          >
            Connect
          </Button>
        </div>
      </div>
    </SetupLayout>
  );
};

export default AddSourcesPage;
