import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
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
    },
    {
      id: 'restaurant',
      title: 'Restaurant / Cafe',
      description: 'Restaurant, cafe, bar, or food service establishment',
    },
    {
      id: 'property',
      title: 'Property Group',
      description: 'Management company overseeing multiple properties',
    },
    {
      id: 'other',
      title: 'Other',
      description: 'Other type of hospitality business',
    },
  ];

  return (
    <SetupLayout currentStep={1} onContinue={handleContinue} showBack={false}>
      <h1 className="text-[28px] font-semibold text-gray-800 text-center mb-3">
        Let's set up your organization
      </h1>
      <p className="text-[15px] text-gray-400 text-center mb-10">
        Select the type that best describes your business
      </p>

      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
        {organizationTypes.map((type) => (
          <div
            key={type.id}
            className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${selectedType === type.id
              ? 'border-gray-400 bg-gray-50 shadow-sm'
              : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            onClick={() => setSelectedType(type.id)}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${selectedType === type.id ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                <Building2 size={20} />
              </div>
              <div>
                <div className="text-[15px] font-semibold text-gray-800 mb-1">{type.title}</div>
                <div className="text-[13px] text-gray-400 leading-relaxed">{type.description}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SetupLayout>
  );
};

export default SetupPage;
