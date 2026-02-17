import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SetupLayout from '../components/SetupLayout';
import { Clock, Calendar } from 'lucide-react';

type ScheduleType = 'hourly' | 'daily' | 'weekly';

const ChooseSchedulePage = () => {
  const navigate = useNavigate();
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleType>('daily');

  const handleContinue = () => {
    navigate('/setup/finish');
  };

  const handleBack = () => {
    navigate('/setup/sources');
  };

  const scheduleOptions = [
    {
      id: 'hourly' as ScheduleType,
      title: 'Hourly Fetching',
      description: 'Ideal for high-activity hotels with frequent reviews',
      icon: Clock,
      iconColor: 'text-red-500',
      iconBg: 'bg-red-50',
    },
    {
      id: 'daily' as ScheduleType,
      title: 'Daily Fetching',
      description: 'Balanced schedule for most organizations',
      icon: Calendar,
      iconColor: 'text-pink-500',
      iconBg: 'bg-pink-50',
      recommended: true,
    },
    {
      id: 'weekly' as ScheduleType,
      title: 'Weekly Fetching',
      description: 'For low-traffic sources or test environments',
      icon: Calendar,
      iconColor: 'text-cyan-500',
      iconBg: 'bg-cyan-50',
    },
  ];

  return (
    <SetupLayout
      currentStep={3}
      onContinue={handleContinue}
      onBack={handleBack}
    >
      <h1 className="text-[32px] font-semibold text-gray-800 text-center mb-3">
        Choose How Often to Fetch Reviews
      </h1>
      <p className="text-[15px] text-gray-400 text-center mb-12">
        Select one of the recommended schedules. You can modify this anytime in
        source settings
      </p>

      <div className="grid grid-cols-3 gap-5 mb-14 max-md:grid-cols-1">
        {scheduleOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedSchedule === option.id;

          return (
            <div
              key={option.id}
              className={`relative rounded-xl p-8 pt-10 flex flex-col items-center cursor-pointer transition-all ${isSelected
                  ? 'border-2 border-gray-300 bg-gray-50 shadow-sm'
                  : 'border border-gray-200 bg-white hover:border-gray-300'
                }`}
              onClick={() => setSelectedSchedule(option.id)}
            >
              {option.recommended && (
                <div className="absolute top-2.5 left-2.5 bg-amber-100 text-amber-800 py-1 px-3 rounded-xl text-[11px] font-semibold">
                  Recommended
                </div>
              )}

              {/* Radio */}
              <div className="absolute top-4 right-4 w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center bg-white">
                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-gray-900" />}
              </div>

              <div className={`w-16 h-16 rounded-full ${option.iconBg} flex items-center justify-center mb-5`}>
                <Icon size={32} className={option.iconColor} strokeWidth={2} />
              </div>

              <div className="text-xl font-semibold text-gray-800 mb-2 text-center">{option.title}</div>
              <div className="text-[13px] text-gray-400 text-center leading-relaxed">{option.description}</div>
            </div>
          );
        })}
      </div>
    </SetupLayout>
  );
};

export default ChooseSchedulePage;
