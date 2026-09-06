import React from 'react';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import { cn } from '../ui/Button';
import { Link2, Sparkles, Send } from 'lucide-react';

export const HowItWorks = () => {
  const { elementRef, isIntersecting } = useIntersectionObserver<HTMLDivElement>();

  const steps = [
    {
      title: "Connect Your Sources",
      description: "Securely link your Google Business, Yelp, and TripAdvisor accounts in one click.",
      icon: <Link2 className="text-white" />,
      color: "bg-blue-600"
    },
    {
      title: "AI Analyzes Everything",
      description: "Our AI processes every review, identifying trends and sentiment automatically.",
      icon: <Sparkles className="text-white" />,
      color: "bg-indigo-600"
    },
    {
      title: "Respond & Grow",
      description: "Use AI-generated drafts to reply to customers and watch your rating soar.",
      icon: <Send className="text-white" />,
      color: "bg-violet-600"
    }
  ];

  return (
    <section id="how-it-works" className="py-24 bg-gray-50 dark:bg-slate-900/50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Get Started in <span className="text-blue-600">3 Easy Steps</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            We've built ReviewMate to be powerful yet incredibly simple to use.
          </p>
        </div>

        <div 
          ref={elementRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-12 relative"
        >
          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-1/2 left-1/4 right-1/4 h-0.5 bg-gray-200 dark:bg-slate-800 -translate-y-1/2 z-0"></div>

          {steps.map((step, index) => (
            <div 
              key={index}
              className={cn(
                "relative z-10 flex flex-col items-center text-center staggered-item",
                isIntersecting && "animate-fadeInUp"
              )}
              style={{ animationDelay: `${index * 200}ms` }}
            >
              <div className={cn(
                "w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg mb-8 transition-transform hover:scale-110",
                step.color
              )}>
                {step.icon}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{step.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed max-w-xs">{step.description}</p>
              
              <div className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 flex items-center justify-center font-bold text-blue-600 shadow-sm">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
