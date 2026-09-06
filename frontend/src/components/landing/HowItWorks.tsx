import React from 'react';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import { cn } from '../ui/Button';
import { Link2, Sparkles, Send, CheckCircle2 } from 'lucide-react';
import step1Connect from '../../assets/step1-connect.jpg';
import step2Analyze from '../../assets/step2-analyze.jpg';
import step3Grow from '../../assets/step3-grow.jpg';

export const HowItWorks = () => {
  const { elementRef, isIntersecting } = useIntersectionObserver<HTMLDivElement>();

  const steps = [
    {
      title: "Connect Your Sources",
      description: "Securely link your Google Business, Yelp, and TripAdvisor accounts in one click.",
      image: step1Connect,
      imageAlt: "Connect Google, TripAdvisor, and Yelp review sources",
      tag: "1-Click Integration",
      highlight: "Auto-sync reviews in real-time",
      icon: <Link2 className="w-5 h-5 text-white" />,
      color: "bg-gradient-to-r from-blue-600 to-cyan-600",
      dotColor: "bg-blue-500 animate-pulse"
    },
    {
      title: "AI Analyzes Everything",
      description: "Our AI processes every review, identifying trends and sentiment automatically.",
      image: step2Analyze,
      imageAlt: "AI sentiment analysis and trend metrics dashboard",
      tag: "Neural Sentiment AI",
      highlight: "Aspect ratings & keyword trends",
      icon: <Sparkles className="w-5 h-5 text-white" />,
      color: "bg-gradient-to-r from-indigo-600 to-purple-600",
      dotColor: "bg-indigo-500 animate-pulse"
    },
    {
      title: "Respond & Grow",
      description: "Use AI-generated drafts to reply to customers and watch your rating soar.",
      image: step3Grow,
      imageAlt: "AI response studio with growth and rating elevation",
      tag: "Smart Response Studio",
      highlight: "Personalized AI tone reply drafts",
      icon: <Send className="w-5 h-5 text-white" />,
      color: "bg-gradient-to-r from-violet-600 to-pink-600",
      dotColor: "bg-violet-500 animate-pulse"
    }
  ];

  return (
    <section id="how-it-works" className="py-24 bg-gray-50/80 dark:bg-slate-900/50 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-500/5 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40 mb-4 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></span>
            Effortless Workflow
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Get Started in <span className="text-blue-600">3 Easy Steps</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            We've built ReviewMate to be powerful yet incredibly simple to use.
          </p>
        </div>

        <div 
          ref={elementRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10 relative"
        >
          {steps.map((step, index) => (
            <div 
              key={index}
              className={cn(
                "relative z-10 flex flex-col bg-white dark:bg-slate-800/90 rounded-3xl p-5 border border-gray-100 dark:border-slate-700/60 shadow-xl shadow-gray-200/50 dark:shadow-none hover:shadow-2xl hover:border-blue-500/40 dark:hover:border-blue-500/40 transition-all duration-300 hover:-translate-y-2 group staggered-item",
                isIntersecting && "animate-fadeInUp"
              )}
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {/* Real Image Preview */}
              <div className="relative overflow-hidden rounded-2xl mb-5 bg-slate-100 dark:bg-slate-900 border border-gray-100 dark:border-slate-700/50 aspect-video shadow-sm">
                <img 
                  src={step.image} 
                  alt={step.imageAlt}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                  loading="lazy"
                />
                
                {/* Step Counter Badge */}
                <div className="absolute top-3 left-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-gray-900 dark:text-white border border-gray-200/50 dark:border-slate-700/70 shadow-sm flex items-center gap-1.5">
                  <span className={cn("w-2 h-2 rounded-full", step.dotColor)}></span>
                  Step 0{index + 1}
                </div>

                {/* Feature Tag */}
                <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-medium text-white shadow-sm">
                  {step.tag}
                </div>
              </div>

              {/* Text Information */}
              <div className="flex flex-col flex-grow px-1">
                <div className="flex items-center gap-3 mb-2.5">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md", step.color)}>
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {step.title}
                  </h3>
                </div>

                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-5 flex-grow">
                  {step.description}
                </p>

                {/* Highlights footer */}
                <div className="pt-3 border-t border-gray-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium">
                  <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    {step.highlight}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500 font-mono font-bold">
                    0{index + 1}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
