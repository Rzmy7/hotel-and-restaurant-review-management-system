import React from 'react';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import { cn } from '../ui/Button';
import { Star } from 'lucide-react';

export const SocialProof = () => {
  const { elementRef, isIntersecting } = useIntersectionObserver<HTMLDivElement>();

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Owner, The Grand Hotel",
      content: "ReviewMaster AI has transformed how we handle feedback. Our response rate went from 40% to 98% in just one month.",
      avatar: "SJ"
    },
    {
      name: "Marc Chen",
      role: "Manager, Bistro 21",
      content: "The sentiment analysis is scarily accurate. It helped us identify a recurring issue with our Friday night service that we would have missed.",
      avatar: "MC"
    },
    {
      name: "Elena Rodriguez",
      role: "Digital Lead, Sun & Sand Resorts",
      content: "Managing 15 locations used to be a nightmare. Now I have a bird's eye view of our entire reputation in one dashboard.",
      avatar: "ER"
    }
  ];

  return (
    <section className="py-24 bg-gray-50 dark:bg-slate-900/50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Trusted by 500+ Hospitality Brands</h2>
          <div className="flex items-center justify-center space-x-1 text-amber-400 mb-8">
            {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={20} fill="currentColor" />)}
            <span className="text-gray-900 dark:text-white font-bold ml-2">4.9/5 Rating</span>
          </div>
        </div>

        <div 
          ref={elementRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {testimonials.map((t, index) => (
            <div
              key={index}
              className={cn(
                "bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-gray-100 dark:border-slate-700 shadow-sm staggered-item",
                isIntersecting && "animate-fadeInUp"
              )}
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="flex items-center space-x-4 mb-6">
                {/* Avatar: changed from bg-blue-100/text-blue-600 (contrast ~2.9:1 ❌) to bg-blue-600/text-white (contrast 4.5:1+ ✅) */}
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white">
                  {t.avatar}
                </div>
                <div>
                {/* Changed from h4 to p — heading-order fix: h4 here would skip h3 (section uses h2) */}
                <p className="font-bold text-gray-900 dark:text-white">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 italic leading-relaxed">"{t.content}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
