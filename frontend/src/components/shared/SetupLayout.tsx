import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { LogOut, ChevronRight, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SetupLayoutProps {
  currentStep: number;
  children: React.ReactNode;
  onContinue?: () => void;
  onBack?: () => void;
  showContinue?: boolean;
  showBack?: boolean;
  isContinueLoading?: boolean;
  isContinueDisabled?: boolean;
}

const SetupLayout: React.FC<SetupLayoutProps> = ({
  currentStep,
  children,
  onContinue,
  onBack,
  showContinue = true,
  showBack = true,
  isContinueLoading = false,
  isContinueDisabled = false,
}) => {
  const navigate = useNavigate();
  const steps = [
    { number: 1, label: 'Organization' },
    { number: 2, label: 'Sources' },
    { number: 3, label: 'Schedule' },
    { number: 4, label: 'Finish' },
  ];

  const handleExit = () => {
    if (confirm('Are you sure you want to exit setup? Your progress might not be saved.')) {
      navigate('/login');
    }
  };

  return (
    <div className="fixed inset-0 z-[50] overflow-y-auto bg-slate-50 dark:bg-slate-950 font-sans selection:bg-blue-100 selection:text-blue-900">
      <div className="min-h-screen flex flex-col py-12 px-6">
        {/* Header with Exit button */}
        <div className="max-w-5xl mx-auto w-full flex justify-between items-center mb-12">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-black text-lg">L</span>
                </div>
                <span className="font-black text-xl tracking-tight text-slate-900 dark:text-white uppercase">L2 Project</span>
            </div>
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleExit}
                className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-2 font-bold uppercase text-[11px] tracking-widest"
            >
                <LogOut size={14} />
                Exit Setup
            </Button>
        </div>

        {/* Steps Header */}
        <div className="max-w-3xl mx-auto w-full mb-12">
          <div className="flex justify-between items-start relative">
             {/* Progress Line Background */}
            <div className="absolute top-4 left-0 w-full h-[2px] bg-slate-200 dark:bg-slate-800 -z-10" />
            
            {steps.map((step) => {
                const isActive = currentStep === step.number;
                const isCompleted = currentStep > step.number;
                
                return (
                    <div key={step.number} className="flex flex-col items-center gap-3 relative px-2">
                        <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                            ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110' : 
                              isCompleted ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-400 border-2 border-slate-200 dark:border-slate-800'}
                        `}>
                            {isCompleted ? '✓' : step.number}
                        </div>
                        <span className={`
                            text-[11px] uppercase tracking-widest font-black whitespace-nowrap transition-colors duration-300
                            ${isActive ? 'text-blue-600' : 'text-slate-400'}
                        `}>
                            {step.label}
                        </span>
                    </div>
                );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col items-center">
            <Card className="w-full max-w-3xl p-8 md:p-12 shadow-2xl shadow-blue-500/5 animate-in fade-in slide-in-from-bottom-6 duration-700 mb-20 relative overflow-hidden">
                {/* Subtle gradient accent */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-50" />
                
                <div className="min-h-[300px] flex flex-col">
                    <div className="flex-1">
                        {children}
                    </div>

                    <div className="flex items-center justify-between pt-10 mt-10 border-t border-slate-100 dark:border-slate-800">
                        <div>
                            {showBack && currentStep > 1 && onBack && (
                                <Button
                                    variant="outline"
                                    onClick={onBack}
                                    className="gap-2 px-6 font-bold uppercase text-[12px] tracking-widest h-11"
                                    leftIcon={<ChevronLeft size={16} />}
                                >
                                    Back
                                </Button>
                            )}
                        </div>

                        <div>
                            {showContinue && onContinue && (
                                <Button
                                    onClick={onContinue}
                                    isLoading={isContinueLoading}
                                    disabled={isContinueDisabled}
                                    className="gap-2 px-10 font-black uppercase text-[12px] tracking-widest h-11 shadow-lg shadow-blue-500/20"
                                    rightIcon={<ChevronRight size={16} />}
                                >
                                    {currentStep === 4 ? 'Complete Setup' : 'Continue'}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
      </div>
    </div>
  );
};

export default SetupLayout;
