import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SetupLayout from '../components/shared/SetupLayout';
import { Clock, Calendar, Zap, Sparkles } from 'lucide-react';
import { apiClient } from '../api/client';

type ScheduleType = 'hourly' | 'daily' | 'weekly';
const SETUP_PENDING_ORG_ID_KEY = 'setup_pending_organization_id';
const SETUP_PENDING_SCHEDULE_KEY = 'setup_pending_schedule';

const ChooseSchedulePage = () => {
  const navigate = useNavigate();
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleType>('daily');
  const [isSaving, setIsSaving] = useState(false);

  const handleContinue = async () => {
    const organizationId =
      localStorage.getItem(SETUP_PENDING_ORG_ID_KEY) || localStorage.getItem('current_organization');

    if (!organizationId) {
      alert('No organization found for setup. Please restart setup.');
      navigate('/setup');
      return;
    }

    try {
      setIsSaving(true);
      await apiClient.post('/api/setup/schedule/finalize', {
        organization_id: organizationId,
        selected_schedule: selectedSchedule,
      });
      localStorage.setItem(SETUP_PENDING_SCHEDULE_KEY, selectedSchedule);
      navigate('/setup/plan');
    } catch (error) {
      console.error('Failed to finalize setup schedule:', error);
      alert('Could not save schedule. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    navigate('/setup/sources');
  };

  const scheduleOptions = [
    {
      id: 'hourly' as ScheduleType,
      title: 'Hourly Fetching',
      description: 'Ideal for high-activity properties with frequent reviews',
      icon: Zap,
      color: 'rose',
    },
    {
      id: 'daily' as ScheduleType,
      title: 'Daily Fetching',
      description: 'The perfectly balanced schedule for most businesses',
      icon: Calendar,
      color: 'blue',
      recommended: true,
    },
    {
      id: 'weekly' as ScheduleType,
      title: 'Weekly Fetching',
      description: 'Suited for smaller sources or test environments',
      icon: Clock,
      color: 'cyan',
    },
  ];

  return (
    <SetupLayout
      currentStep={3}
      onContinue={handleContinue}
      onBack={handleBack}
      isContinueLoading={isSaving}
      isContinueDisabled={isSaving}
    >
      <div className="text-center mb-10">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-3">
            Fetch Frequency
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
            Choose how often we should aggregate your latest reviews
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {scheduleOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedSchedule === option.id;

          return (
            <div
              key={option.id}
              onClick={() => setSelectedSchedule(option.id)}
              className={`
                group relative rounded-3xl p-8 flex flex-col items-center cursor-pointer transition-all duration-300 border-2
                ${isSelected
                  ? 'border-blue-600 bg-blue-50/30 dark:bg-blue-900/10 shadow-lg shadow-blue-500/10'
                  : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-100 dark:hover:border-blue-900/30 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none'
                }`}
            >
              {option.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 py-1 px-4 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md flex items-center gap-1.5">
                  <Sparkles size={10} />
                  Recommended
                </div>
              )}

              {/* Selection Indicator */}
              <div className="absolute top-4 right-4 w-5 h-5 rounded-full border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center bg-white dark:bg-slate-800 group-hover:border-blue-300 transition-colors">
                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-in zoom-in duration-300" />}
              </div>

              <div className={`
                w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300
                ${isSelected ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30 rotate-3' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:scale-110 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600'}
              `}>
                <Icon size={32} strokeWidth={2.5} />
              </div>

              <h3 className={`text-[17px] font-black uppercase tracking-tight mb-3 text-center transition-colors ${isSelected ? 'text-blue-600' : 'text-slate-900 dark:text-white'}`}>
                {option.title}
              </h3>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 text-center font-medium leading-relaxed">
                {option.description}
              </p>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50/50 dark:bg-blue-900/5 rounded-2xl p-6 border border-blue-100/50 dark:border-blue-900/20 text-center">
        <p className="text-[12px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            Note: You can easily modify the fetching schedule for each source individually later in the source settings.
        </p>
      </div>
    </SetupLayout>
  );
};

export default ChooseSchedulePage;
