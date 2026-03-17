import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hotel, Utensils, Layers, CircleDot } from 'lucide-react';
import SetupLayout from '../components/shared/SetupLayout';

const SetupPage = () => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const handleContinue = () => {
    if (selectedType) {
      navigate('/setup/sources');
    }
  };

  const organizationTypes = [
    {
      id: 'hotel',
      title: 'Hotel / Resort',
      description: 'Traditional hotel, boutique hotel, or resort property',
      icon: Hotel,
    },
    {
      id: 'restaurant',
      title: 'Restaurant / Cafe',
      description: 'Restaurant, cafe, bar, or food service establishment',
      icon: Utensils,
    },
    {
      id: 'property',
      title: 'Property Group',
      description: 'Management company overseeing multiple properties',
      icon: Layers,
    },
    {
      id: 'other',
      title: 'Other',
      description: 'Other type of hospitality business',
      icon: CircleDot,
    },
  ];

  return (
    <SetupLayout 
      currentStep={1} 
      onContinue={handleContinue} 
      showBack={false}
      isContinueDisabled={!selectedType}
    >
      <div className="text-center mb-10">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-3">
            Your Business Type
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
            Select the category that best describes your organization
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {organizationTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.id;
          
          return (
            <div
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`
                group relative border-2 rounded-2xl p-6 cursor-pointer transition-all duration-300
                ${isSelected 
                  ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/10 shadow-lg shadow-blue-500/10' 
                  : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-200 dark:hover:border-blue-900/50 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none'}
              `}
            >
              <div className="flex items-start gap-4">
                <div className={`
                  w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300
                  ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600'}
                `}>
                  <Icon size={24} />
                </div>
                <div>
                  <div className={`text-[15px] font-black uppercase tracking-tight mb-1 transition-colors ${isSelected ? 'text-blue-600' : 'text-slate-900 dark:text-white'}`}>
                    {type.title}
                  </div>
                  <div className="text-[13px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    {type.description}
                  </div>
                </div>
              </div>
              
              {/* Active Indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4 animate-in zoom-in duration-300">
                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SetupLayout>
  );
};

export default SetupPage;
