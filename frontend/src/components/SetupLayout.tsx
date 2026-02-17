import React from 'react';

interface SetupLayoutProps {
  currentStep: number;
  children: React.ReactNode;
  onContinue?: () => void;
  onBack?: () => void;
  showContinue?: boolean;
  showBack?: boolean;
}

const SetupLayout: React.FC<SetupLayoutProps> = ({
  currentStep,
  children,
  onContinue,
  onBack,
  showContinue = true,
  showBack = true,
}) => {
  const steps = [
    { number: 1, label: 'Add Organization' },
    { number: 2, label: 'Add Sources' },
    { number: 3, label: 'Choose Schedule' },
    { number: 4, label: 'Finish Setup' },
  ];

  return (
    <div className="fixed inset-0 z-[9999] overflow-auto bg-gray-100">
      <div className="min-h-full flex flex-col">
        {/* Steps Header */}
        <div className="flex justify-center gap-10 px-5 pt-10 pb-8 bg-white">
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col items-start gap-2 flex-1 max-w-[200px]">
              <div className="text-[13px] text-gray-400">Step {step.number}:</div>
              <div className={`text-[13px] whitespace-nowrap ${currentStep === step.number ? 'text-gray-900 font-semibold' : 'text-gray-400 font-normal'}`}>
                {step.label}
              </div>
              <div className={`w-full h-[3px] rounded-sm mt-1 ${currentStep >= step.number ? 'bg-gray-900' : 'bg-gray-200'}`} />
            </div>
          ))}
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-sm py-12 px-14 max-w-[800px] mx-auto mt-10 w-[90%] max-md:px-6 max-md:py-8">
          {children}

          <div className="text-center">
            {showContinue && onContinue && (
              <button
                onClick={onContinue}
                className="w-full max-w-[280px] mx-auto block py-3 px-8 bg-blue-500 hover:bg-blue-600 text-white border-none rounded-lg text-sm font-medium cursor-pointer transition-colors mt-8"
              >
                Continue
              </button>
            )}

            {showBack && currentStep > 1 && onBack && (
              <button
                onClick={onBack}
                className="mt-5 py-2.5 px-6 bg-transparent hover:bg-gray-50 text-gray-500 border border-gray-200 rounded-lg text-sm cursor-pointer transition-colors"
              >
                Back
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupLayout;
