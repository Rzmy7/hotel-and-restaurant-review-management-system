import React from 'react';
import { ArrowLeft, MessageSquare, Shield, Database, Users, Eye, Link2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const sections = [
    {
        icon: <Link2 className="w-5 h-5 text-blue-500" />,
        number: '01',
        title: 'Data Collection & OAuth Integrations',
        content: 'When you create an organization workspace, we collect basic business information including your business name, address, and location details. To provide review management services, you may connect third-party platforms (like Google Maps or TripAdvisor) via OAuth or API credentials. We securely store these tokens and routinely fetch publicly available customer reviews, ratings, and business metrics associated with your connected accounts.',
    },
    {
        icon: <MessageSquare className="w-5 h-5 text-blue-500" />,
        number: '02',
        title: 'Processing of Customer Feedback & AI',
        content: 'We process the review data fetched from your connected platforms to provide sentiment analysis, performance insights, and automated notifications. We may transmit review text to third-party AI providers (such as OpenAI or Anthropic) solely for the purpose of generating AI-assisted reply suggestions. Your business data is not used to train these foundational AI models.',
        highlight: true,
    },
    {
        icon: <Shield className="w-5 h-5 text-blue-500" />,
        number: '03',
        title: 'Data Security & Multi-Tenant Isolation',
        content: "ReviewMate employs strict multi-tenant data architecture. Your organization's review data, connected platform tokens, and customer insights are strictly isolated and cannot be accessed by other workspaces or users not explicitly invited to your organization. We implement industry-standard encryption at rest and in transit.",
    },
    {
        icon: <Database className="w-5 h-5 text-blue-500" />,
        number: '04',
        title: 'Third-Party Service Providers',
        content: 'We do not sell your data. We may share necessary data with trusted third-party service providers (such as cloud hosting providers, email delivery services, or payment processors like Stripe) strictly to facilitate the operation of the ReviewMate platform. All providers are contractually bound to our data protection standards.',
    },
    {
        icon: <Eye className="w-5 h-5 text-blue-500" />,
        number: '05',
        title: 'Data Retention',
        content: 'We retain your organization data and review history for the duration of your active subscription, plus 30 days after termination to allow for reactivation. Following that period, all your data is permanently deleted from our systems. You may request an export of your data at any time from your Settings page.',
    },
    {
        icon: <Users className="w-5 h-5 text-blue-500" />,
        number: '06',
        title: 'Your Rights',
        content: 'You have the right to access, update, or delete your personal information and organization data at any time through your account settings. You may also request a full data export or permanent account deletion by contacting our support team. We will respond to all such requests within 30 days.',
    },
];

const PrivacyPolicyPage: React.FC = () => {
    const navigate = useNavigate();
    return (
        <div className="fixed inset-0 overflow-y-auto bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white">

            {/* ── Sticky Header — exact same as NotificationsHeader ── */}
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 sticky top-0 z-40 px-8 py-6 flex items-center justify-between transition-all duration-300">
                <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
                            Privacy Policy
                        </h1>
                        <span className="text-[10px] font-black bg-[#4e80ee] text-white px-2 py-0.5 rounded-lg shadow-sm shadow-blue-100 uppercase tracking-widest">
                            Legal
                        </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">
                        How we collect, use, and protect your data
                    </p>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right max-md:hidden">
                        <p className="text-[10px] text-gray-400 dark:text-slate-500 font-black uppercase tracking-widest leading-none">
                            Last Updated
                        </p>
                        <p className="text-[12px] text-gray-600 dark:text-slate-300 font-bold mt-1">
                            {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                        </p>
                    </div>
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 text-[11px] font-black text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl px-3 py-2 transition-all cursor-pointer bg-transparent uppercase tracking-widest"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Back
                    </button>
                </div>
            </header>

            {/* ── Content ── */}
            <main className="max-w-4xl mx-auto px-8 py-10 space-y-3">
                {sections.map((s) => (
                    <div
                        key={s.number}
                        className={`group relative bg-white dark:bg-slate-800 rounded-2xl border transition-all duration-300 p-6 sm:p-8 ${
                            s.highlight
                                ? 'border-blue-200 dark:border-blue-800/60'
                                : 'border-gray-100 dark:border-slate-700'
                        }`}
                    >
                        {s.highlight && (
                            <div className="absolute left-0 top-6 bottom-6 w-1 bg-[#4e80ee] rounded-r-full" />
                        )}
                        <div className="flex items-start gap-4">
                            <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600">
                                {s.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-[11px] font-black text-gray-300 dark:text-slate-600 uppercase tracking-widest">{s.number}</span>
                                    <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight">{s.title}</h2>
                                </div>
                                <p className="text-gray-500 dark:text-slate-400 text-sm sm:text-[15px] leading-relaxed">{s.content}</p>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Terms callout */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 sm:p-8 text-center">
                    <p className="text-gray-500 dark:text-slate-400 text-sm">
                        This policy is part of our{' '}
                        <Link to="/terms" className="text-[#4e80ee] font-bold hover:underline">Terms of Service</Link>.
                        {' '}Data questions?{' '}
                        <a href="mailto:privacy@reviewmate.io" className="text-[#4e80ee] font-bold hover:underline">privacy@reviewmate.io</a>
                    </p>
                </div>
            </main>

            {/* ── Footer ── */}
            <footer className="border-t border-gray-100 dark:border-slate-800 px-8 py-6 mt-4">
                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-[#4e80ee] rounded-md flex items-center justify-center">
                            <MessageSquare className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">ReviewMate © {new Date().getFullYear()}</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <Link to="/terms" className="text-[11px] font-black text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 uppercase tracking-widest transition-colors">Terms</Link>
                        <Link to="/privacy" className="text-[11px] font-black text-[#4e80ee] uppercase tracking-widest">Privacy</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default PrivacyPolicyPage;
