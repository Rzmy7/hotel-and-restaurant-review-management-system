import React, { useState } from 'react';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import { cn } from '../ui/Button';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const FAQ = () => {
  const { elementRef, isIntersecting } = useIntersectionObserver<HTMLDivElement>();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "Which platforms do you support?",
      answer: "We support all major review platforms including Google Business Profile, Yelp, TripAdvisor, Facebook, and industry-specific sites like Booking.com and Expedia."
    },
    {
      question: "How does the AI response draft work?",
      answer: "Our AI analyzes the content and sentiment of a review and suggests a personalized response based on your brand's voice. You can then review, edit, and post it with one click."
    },
    {
      question: "Can I manage multiple locations?",
      answer: "Absolutely! Our Pro and Enterprise plans are designed specifically for businesses with multiple locations, allowing you to switch between them seamlessly or see aggregated data."
    },
    {
      question: "Is there a free trial?",
      answer: "Yes, we offer a 14-day full-featured free trial. No credit card is required to start."
    }
  ];

  return (
    <section id="faq" className="py-24 bg-white dark:bg-slate-900">
      <div className="container mx-auto px-6 max-w-3xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">Frequently Asked Questions</h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">Everything you need to know about ReviewMaster AI.</p>
        </div>

        <div 
          ref={elementRef}
          className="space-y-4"
        >
          {faqs.map((faq, index) => (
            <div 
              key={index}
              className={cn(
                "border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden staggered-item",
                isIntersecting && "animate-fadeInUp"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <button
                className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="font-bold text-gray-900 dark:text-white">{faq.question}</span>
                {openIndex === index ? <ChevronUp className="text-blue-600" /> : <ChevronDown className="text-gray-400" />}
              </button>
              {openIndex === index && (
                <div className="p-6 pt-0 text-gray-600 dark:text-gray-400 border-t border-gray-50 dark:border-slate-800 animate-fadeIn">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
