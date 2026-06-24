import React from 'react';
import { LandingHeader } from '../components/landing/LandingHeader';
import { LandingFooter } from '../components/landing/LandingFooter';
import { Hero } from '../components/landing/Hero';
import { BentoGrid } from '../components/landing/BentoGrid';
import { HowItWorks } from '../components/landing/HowItWorks';
import { Pricing } from '../components/landing/Pricing';
import { SocialProof } from '../components/landing/SocialProof';
import { FAQ } from '../components/landing/FAQ';
import { CTA } from '../components/landing/CTA';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 overflow-x-hidden">
      <LandingHeader />
      
      <main>
        <Hero />
        <BentoGrid />
        <HowItWorks />
        <SocialProof />
        <Pricing />
        <FAQ />
        <CTA />
      </main>

      <LandingFooter />
    </div>
  );
};

export default LandingPage;
