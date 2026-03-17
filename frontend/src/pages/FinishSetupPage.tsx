import { CheckCircle2, Rocket, Search, BarChart3, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SetupLayout from '../components/shared/SetupLayout';

const FinishSetupPage = () => {
  const navigate = useNavigate();
  const [isFinishing, setIsFinishing] = useState(false);

  const handleFinish = () => {
    setIsFinishing(true);
    // Simulate API call for completion
    setTimeout(() => {
        localStorage.setItem('setupComplete', 'true');
        navigate('/login');
    }, 1500);
  };

  const nextSteps = [
    {
      title: 'Initial Review Fetching',
      description: 'We are currently connecting to your sources and retrieving the last 12 months of reviews.',
      icon: Search,
    },
    {
      title: 'Sentiment Analysis',
      description: 'Our AI is processing each review to categorize feedback and determine sentiment.',
      icon: BarChart3,
    },
    {
      title: 'Reporting Dashboard',
      description: 'Your dashboard will be ready with actionable insights in approximately 5-10 minutes.',
      icon: Rocket,
    },
  ];

  return (
    <SetupLayout
      currentStep={4}
      onContinue={handleFinish}
      onBack={() => navigate('/setup/schedule')}
      isContinueLoading={isFinishing}
    >
      <div className="flex flex-col items-center text-center">
        <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center text-white mb-8 shadow-2xl shadow-blue-500/40 animate-bounce-subtle">
          <CheckCircle2 size={48} strokeWidth={2.5} />
        </div>

        <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">
            You're All Set!
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-md mb-12">
            Your organization has been successfully configured. We're now preparing your workspace.
        </p>

        <div className="w-full text-left space-y-6 mb-10">
            <h3 className="text-[12px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6">
                What's happening now
            </h3>
            
            {nextSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                    <div key={index} className="flex gap-4 group">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 transition-colors shrink-0">
                            <Icon size={20} />
                        </div>
                        <div>
                            <h4 className="text-[15px] font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">
                                {step.title}
                            </h4>
                            <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                {step.description}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>

        <div className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 text-left">
            <div className="flex items-center gap-3 text-blue-600 mb-2">
                <CheckCircle2 size={16} />
                <span className="text-[11px] font-black uppercase tracking-widest">Setup Verified</span>
            </div>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Click the button below to finalize and head to your dashboard. Welcome to the L2 Project family.
            </p>
        </div>
      </div>
    </SetupLayout>
  );
};

export default FinishSetupPage;
