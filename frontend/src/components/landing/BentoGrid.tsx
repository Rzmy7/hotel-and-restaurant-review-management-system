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
      icon: <BarChart3 className="text-[#4E80EE] w-6 h-6" />,
      className: "md:col-span-2",
      bg: "bg-[#FEFEFE] dark:bg-slate-800/90"
    },
    {
      title: "Multi-Platform Sync",
      description: "Consolidate reviews from Google, Booking.com, TripAdvisor, and Yelp into one unified feed.",
      icon: <Layers className="text-[#4E80EE] w-6 h-6" />,
      className: "md:col-span-1",
      bg: "bg-[#FEFEFE] dark:bg-slate-800/90"
    },
    {
      title: "Aspect Breakdown",
      description: "Track ratings across staff, cleanliness, location, and comfort to pinpoint operational issues.",
      icon: <Sliders className="text-[#4E80EE] w-6 h-6" />,
      className: "md:col-span-1",
      bg: "bg-[#FEFEFE] dark:bg-slate-800/90"
    },
    {
      title: "Enterprise Security",
      description: "Your data is encrypted and secure with our industry-leading protocols.",
      icon: <Shield className="text-[#4E80EE] w-6 h-6" />,
      className: "md:col-span-2",
      bg: "bg-[#FEFEFE] dark:bg-slate-800/90"
    },
    {
      title: "Competitor Tracking",
      description: "Monitor your competitors and see how you rank in the market.",
      icon: <Target className="text-[#4E80EE] w-6 h-6" />,
      className: "md:col-span-1",
      bg: "bg-[#FEFEFE] dark:bg-slate-800/90"
    },
    {
      title: "AI Response Studio",
      description: "Draft perfect responses in seconds with our context-aware AI.",
      icon: <MessageSquare className="text-[#4E80EE] w-6 h-6" />,
      className: "md:col-span-2",
      bg: "bg-[#FEFEFE] dark:bg-slate-800/90"
    }
  ];

  return (
    <section id="features" className="py-24 bg-[#FEFEFE] dark:bg-slate-900 border-y border-gray-100/80 dark:border-slate-800/60">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#4E80EE]/10 text-[#4E80EE] border border-[#4E80EE]/20 mb-4 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4E80EE]"></span>
            Built for Scale
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Everything You Need to <span className="text-[#4E80EE]">Scale</span>
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
                "p-8 rounded-[2rem] border border-gray-100 dark:border-slate-800 transition-all duration-300 hover:shadow-xl hover:shadow-[#4E80EE]/10 hover:border-[#4E80EE]/40 hover:-translate-y-1.5 staggered-item group",
                item.className,
                item.bg,
                isIntersecting && "animate-fadeInUp"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="bg-[#4E80EE]/10 dark:bg-[#4E80EE]/20 w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm mb-6 transition-transform group-hover:scale-110">
                {item.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-[#4E80EE] transition-colors">{item.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
