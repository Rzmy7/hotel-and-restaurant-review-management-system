import React, { useState, useEffect } from 'react';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import { cn } from '../ui/Button';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { faqService, type FAQItem } from '../../services/faqService';

export const FAQ = () => {
  const { elementRef, isIntersecting } = useIntersectionObserver<HTMLDivElement>();
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [error, setError] = useState<string | null>(null);

  const loadFaqs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await faqService.getPublicFaqs();
      setFaqs(data);
    } catch (err) {
      console.error('Failed to load FAQs:', err);
      setError('Unable to load FAQs at this time.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadFaqs();
  }, []);

  return (
    <section id="faq" className="py-24 bg-white dark:bg-slate-900">
      <div className="container mx-auto px-6 max-w-3xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Everything you need to know about ReviewMate.
          </p>
        </div>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className="h-20 bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Error / Retry State */}
        {!isLoading && error && faqs.length === 0 && (
          <div className="p-8 text-center bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-200 dark:border-slate-700">
            <p className="text-gray-600 dark:text-slate-300 mb-4">{error}</p>
            <button
              onClick={() => void loadFaqs()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition-colors"
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}

        {/* Dynamic Accordion List */}
        {!isLoading && faqs.length > 0 && (
          <div 
            ref={elementRef}
            className="space-y-4"
          >
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              const contentId = `faq-answer-${faq.id || index}`;

              return (
                <div 
                  key={faq.id || index}
                  className={cn(
                    "border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden staggered-item transition-colors",
                    isOpen ? "bg-gray-50/50 dark:bg-slate-800/40" : "bg-white dark:bg-slate-900",
                    isIntersecting && "animate-fadeInUp"
                  )}
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <button
                    type="button"
                    className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 rounded-2xl"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    aria-controls={contentId}
                  >
                    <span className="font-bold text-gray-900 dark:text-white pr-4">
                      {faq.question}
                    </span>
                    <span className="shrink-0 text-blue-600 dark:text-blue-400">
                      {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} className="text-gray-400" />}
                    </span>
                  </button>

                  {isOpen && (
                    <div 
                      id={contentId}
                      role="region"
                      aria-labelledby={contentId}
                      className="px-6 pb-6 pt-0 text-gray-600 dark:text-gray-300 leading-relaxed border-t border-gray-100/60 dark:border-slate-800/60 animate-fadeIn"
                    >
                      <p className="pt-4">{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
