import React from 'react';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import { cn } from '../ui/Button';
import { Shield, Layers, Sliders, BarChart3, MessageSquare, Target } from 'lucide-react';

export const BentoGrid = () => {
  const { elementRef, isIntersecting } = useIntersectionObserver<HTMLDivElement>();

  const items = [
    {
      title: "Smart Sentiment Analysis",
      description: "Our AI automatically categorizes reviews into positive, neutral, and negative, highlighting key pain points.",
      icon: <BarChart3 className="text-blue-600" />,
      className: "md:col-span-2",
      bg: "bg-blue-50 dark:bg-blue-900/20"
    },
    {
      title: "Multi-Platform Sync",
      description: "Consolidate reviews from Google, Booking.com, TripAdvisor, and Yelp into one unified feed.",
      icon: <Layers className="text-indigo-600" />,
      className: "md:col-span-1",
      bg: "bg-indigo-50 dark:bg-indigo-900/20"
    },
    {
      title: "Aspect Breakdown",
      description: "Track ratings across staff, cleanliness, location, and comfort to pinpoint operational issues.",
      icon: <Sliders className="text-amber-600" />,
      className: "md:col-span-1",
      bg: "bg-amber-50 dark:bg-amber-900/20"
    },
    {
      title: "Enterprise Security",
      description: "Your data is encrypted and secure with our industry-leading protocols.",
      icon: <Shield className="text-emerald-600" />,
      className: "md:col-span-2",
      bg: "bg-emerald-50 dark:bg-emerald-900/20"
    },
    {
      title: "Competitor Tracking",
      description: "Monitor your competitors and see how you rank in the market.",
      icon: <Target className="text-rose-600" />,
      className: "md:col-span-1",
      bg: "bg-rose-50 dark:bg-rose-900/20"
    },
    {
      title: "AI Response Studio",
      description: "Draft perfect responses in seconds with our context-aware AI.",
      icon: <MessageSquare className="text-violet-600" />,
      className: "md:col-span-2",
      bg: "bg-violet-50 dark:bg-violet-900/20"
    }
  ];

  return (
    <section id="features" className="py-24 bg-white dark:bg-slate-900">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Everything You Need to <span className="text-blue-600">Scale</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Ditch the spreadsheets. Our comprehensive toolkit gives you total control over your brand's digital footprint.
          </p>
        </div>

        <div 
          ref={elementRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {items.map((item, index) => (
            <div
              key={index}
              className={cn(
                "p-8 rounded-[2rem] border border-gray-100 dark:border-slate-800 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 staggered-item",
                item.className,
                item.bg,
                isIntersecting && "animate-fadeInUp"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="bg-white dark:bg-slate-800 w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm mb-6">
                {item.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{item.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
