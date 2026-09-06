import React from 'react';
import { LandingHeader } from '../components/landing/LandingHeader';
import { LandingFooter } from '../components/landing/LandingFooter';
import { Hero } from '../components/landing/Hero';
import { BentoGrid } from '../components/landing/BentoGrid';
import { HowItWorks } from '../components/landing/HowItWorks';
import { Pricing } from '../components/landing/Pricing';
import { FAQ } from '../components/landing/FAQ';
import { CTA } from '../components/landing/CTA';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-slate-900 text-gray-900 dark:text-white overflow-x-hidden selection:bg-[#4E80EE]/20 selection:text-[#4E80EE]">
      <LandingHeader />
      
      <main>
        <Hero />
        <BentoGrid />
        <HowItWorks />
        <Pricing />
        <FAQ />
        <CTA />
      </main>

      <LandingFooter />
    </div>
  );
};

export default LandingPage;
