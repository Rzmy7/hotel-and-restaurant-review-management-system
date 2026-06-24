import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const TermsOfServicePage: React.FC = () => {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen bg-[#060913] text-slate-200 py-12 px-6">
            {/* Same background layers as AuthLayout for consistency */}
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'linear-gradient(135deg, #060913 0%, #0a1128 50%, #060913 100%)' }} />
            <div aria-hidden="true" style={{ position: 'absolute', top: '-10%', left: '-10%', width: '60%', height: '80%', borderRadius: '50%', pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse at center, rgba(37,99,235,0.15) 0%, transparent 80%)', filter: 'blur(80px)' }} />

            <div className="max-w-3xl mx-auto relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <button onClick={() => navigate(-1)} className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-white transition-colors mb-8 cursor-pointer bg-transparent border-none">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </button>
                <div className="p-8 sm:p-12 rounded-[24px] bg-[#0B1021]/80 border border-slate-800/80 backdrop-blur-md shadow-2xl relative">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-6">Terms of Service</h1>
                    <div className="space-y-6 text-slate-400 leading-relaxed">
                        <p>Last updated: {new Date().toLocaleDateString()}</p>
                        
                        <h2 className="text-xl font-bold text-slate-200 mt-8 mb-4">1. Acceptance of Terms</h2>
                        <p>By accessing or using ReviewMate, you agree to be bound by these Terms of Service. ReviewMate is a SaaS platform designed to help hotels and restaurants manage, analyze, and respond to customer reviews. If you do not agree to all the terms, you may not use our services.</p>
                        
                        <h2 className="text-xl font-bold text-slate-200 mt-8 mb-4">2. Description of Service & Third-Party Platforms</h2>
                        <p>ReviewMate connects to third-party review platforms (such as Google Maps, TripAdvisor, Booking.com, and Yelp) to aggregate customer feedback. By linking these accounts, you grant us permission to access and manage this data on your behalf. You agree to comply with the respective Terms of Service of any third-party platform you connect to ReviewMate.</p>

                        <h2 className="text-xl font-bold text-slate-200 mt-8 mb-4">3. AI-Assisted Replies</h2>
                        <p>Our service includes AI-generated response suggestions for customer reviews. While we strive for high-quality outputs, AI-generated content may occasionally be inaccurate or inappropriate. <strong>You are solely responsible for reviewing and approving all AI-assisted replies before publishing them.</strong> ReviewMate accepts no liability for the consequences of published AI responses.</p>

                        <h2 className="text-xl font-bold text-slate-200 mt-8 mb-4">4. Subscriptions, Trials, and Billing</h2>
                        <p>ReviewMate offers a 14-day free trial. Upon conclusion of the trial, continued access requires a paid subscription. Subscription fees are billed in advance on a recurring basis. You may cancel your subscription at any time, but we do not provide refunds for partial billing periods.</p>

                        <h2 className="text-xl font-bold text-slate-200 mt-8 mb-4">5. Account Security & Data Ownership</h2>
                        <p>You are responsible for maintaining the security of your workspace and user credentials. You retain all rights to the proprietary business data you connect to our system. ReviewMate claims no ownership over your customer reviews or business information.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TermsOfServicePage;
