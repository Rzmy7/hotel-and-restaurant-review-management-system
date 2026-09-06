import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import { cn } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';

export const CTA = () => {
  const { elementRef, isIntersecting } = useIntersectionObserver<HTMLDivElement>();

  const { user } = useAuth();

  return (
    <section className="py-24 px-6 bg-[#FEFEFE] dark:bg-slate-900/60">
      <div 
        ref={elementRef}
        className={cn(
          "container mx-auto max-w-5xl bg-[#4E80EE] rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl shadow-[#4E80EE]/30 staggered-item",
          isIntersecting && "animate-fadeInUp"
        )}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-white/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-white/15 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 bg-white/20 text-white border border-white/30 px-4 py-2 rounded-full text-sm font-bold mb-8 backdrop-blur-sm shadow-sm">
            <Sparkles size={16} />
            <span>Ready to transform your reputation?</span>
          </div>
          
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 leading-tight">
            Take Full Control of Your Online Reputation
          </h2>
          
          <p className="text-white/95 text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
            Start your 14-day free trial today and experience the future of review management. No credit card required.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Link to={user ? "/dashboard" : "/signup"} className="w-full sm:w-auto">
              <Button 
                variant="secondary" 
                size="lg" 
                className="w-full sm:w-auto px-12 bg-[#FEFEFE] text-[#4E80EE] hover:bg-[#F9FAFB] shadow-xl shadow-black/10 border-transparent hover:scale-105 transition-transform"
                rightIcon={<ArrowRight />}
              >
                {user ? "Go to Dashboard" : "Get Started Now"}
              </Button>
            </Link>
            {user ? (
              <Link to="/support" className="w-full sm:w-auto text-white font-bold hover:underline">
                Contact Support
              </Link>
            ) : (
              <a href="mailto:support@reviewmate.com" className="w-full sm:w-auto text-white font-bold hover:underline">
                Contact Support
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
