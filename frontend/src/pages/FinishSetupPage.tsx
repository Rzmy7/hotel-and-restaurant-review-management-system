import { CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SetupLayout from '../components/SetupLayout';

const FinishSetupPage = () => {
  const navigate = useNavigate();

  const handleContinue = () => {
    navigate('/dashboard');
  };

  const handleBack = () => {
    navigate('/setup/schedule');
  };

  const nextSteps = [
    'View your dashboard and analytics',
    'Monitor reviews from all connected sources',
    'Get AI-powered insights and recommendations',
    'Manage your team and settings',
  ];

  return (
    <SetupLayout
      currentStep={4}
      onContinue={handleContinue}
      onBack={handleBack}
    >
      <div className="text-center py-10">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-8">
          <CheckCircle2 size={48} className="text-emerald-500" strokeWidth={2} />
        </div>

        <h1 className="text-[32px] font-semibold text-gray-800 mb-4">Setup Complete!</h1>
        <p className="text-base text-gray-500 mb-10 leading-relaxed">
          Your organization has been successfully configured.<br />
          You can now start monitoring your reviews and insights.
        </p>

        <div className="bg-gray-50 rounded-lg p-6 text-left mt-8">
          <div className="text-base font-semibold text-gray-800 mb-4">What's Next?</div>
          {nextSteps.map((step, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-gray-500 mb-2 last:mb-0">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </SetupLayout>
  );
};

export default FinishSetupPage;
