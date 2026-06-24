import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicyPage: React.FC = () => {
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
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-6">Privacy Policy</h1>
                    <div className="space-y-6 text-slate-400 leading-relaxed">
                        <p>Last updated: {new Date().toLocaleDateString()}</p>
                        
                        <h2 className="text-xl font-bold text-slate-200 mt-8 mb-4">1. Data Collection and OAuth Integrations</h2>
                        <p>When you create an organization workspace, we collect basic business information. Furthermore, to provide review management services, you may connect third-party platforms (like Google Maps or TripAdvisor) via OAuth or API credentials. We securely store these credentials and routinely fetch publicly available customer reviews, ratings, and business metrics associated with your connected accounts.</p>
                        
                        <h2 className="text-xl font-bold text-slate-200 mt-8 mb-4">2. Processing of Customer Feedback & AI</h2>
                        <p>We process the review data fetched from your connected platforms to provide sentiment analysis, performance insights, and automated notifications. We may also transmit review text to third-party AI providers (such as OpenAI or Anthropic) solely for the purpose of generating AI-assisted reply suggestions. Your business data is not used to train these foundational AI models.</p>

                        <h2 className="text-xl font-bold text-slate-200 mt-8 mb-4">3. Data Security and Multi-Tenant Isolation</h2>
                        <p>ReviewMate employs strict multi-tenant data architecture. Your organization's review data, connected platform tokens, and customer insights are strictly isolated and cannot be accessed by other workspaces or users not explicitly invited to your organization.</p>

                        <h2 className="text-xl font-bold text-slate-200 mt-8 mb-4">4. Third-Party Service Providers</h2>
                        <p>We do not sell your data. We may share necessary data with trusted third-party service providers (like hosting providers, email delivery services, or payment processors) strictly to facilitate the operation of the ReviewMate platform.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicyPage;
