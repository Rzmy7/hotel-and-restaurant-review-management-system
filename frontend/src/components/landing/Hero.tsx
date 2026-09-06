import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import { cn } from '../ui/Button';
import { HeroMockup } from './HeroMockup';
import { useAuth } from '../../contexts/AuthContext';

export const Hero = () => {
  const { elementRef, isIntersecting } = useIntersectionObserver<HTMLElement>();

  const { user } = useAuth();

  return (
    <section 
      ref={elementRef}
      className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden"
    >
      {/* Background Decorative Blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10 opacity-30 dark:opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#4E80EE]/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] right-[-10%] w-[30%] h-[30%] bg-[#4E80EE]/30 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-6 text-center">
        <div className={cn(
          "max-w-4xl mx-auto staggered-item",
          isIntersecting && "animate-fadeInUp"
        )}>
          <div className="inline-flex items-center space-x-2 bg-[#4E80EE]/10 text-[#4E80EE] border border-[#4E80EE]/20 px-4 py-2 rounded-full text-sm font-bold mb-8 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-[#4E80EE] animate-pulse mr-2" />
            AI-Powered Review Management is Here
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white leading-[1.1] mb-8">
            Master Your Online Reputation with <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4E80EE] to-[#3A66DE]">AI Precision</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Centralize reviews from Google, Yelp, and more. Use AI to analyze sentiment, automate responses, and stay ahead of the competition.
          </p>
          
          <div className="flex items-center justify-center mb-16">
            <Link to={user ? "/dashboard" : "/signup"} className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto px-10 group shadow-lg shadow-[#4E80EE]/25 bg-[#4E80EE] hover:bg-[#3A66DE] text-white border-transparent" rightIcon={<ArrowRight className="group-hover:translate-x-1 transition-transform" />}>
                {user ? "Go to Dashboard" : "Start Free Trial"}
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm font-medium text-gray-500 dark:text-gray-400">
            <div className="flex items-center"><CheckCircle className="text-[#4E80EE] h-4 w-4 mr-2" /> No credit card required</div>
            <div className="flex items-center"><CheckCircle className="text-[#4E80EE] h-4 w-4 mr-2" /> 14-day free trial</div>
            <div className="flex items-center"><CheckCircle className="text-[#4E80EE] h-4 w-4 mr-2" /> Cancel anytime</div>
          </div>
        </div>

        {/* Hero Mockup */}
        <div className={cn(
          "mt-20 staggered-item delay-300",
          isIntersecting && "animate-fadeInUp"
        )}>
          <HeroMockup />
        </div>
      </div>
    </section>
  );
};
