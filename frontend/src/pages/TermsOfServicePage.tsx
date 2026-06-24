import React from 'react';
import { ArrowLeft, MessageSquare, FileText, Shield, CreditCard, Lock, Link2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const sections = [
    {
        icon: <FileText className="w-5 h-5 text-blue-500" />,
        number: '01',
        title: 'Acceptance of Terms',
        content: 'By accessing or using ReviewMate, you agree to be bound by these Terms of Service. ReviewMate is a SaaS platform designed to help hotels and restaurants manage, analyze, and respond to customer reviews across multiple platforms. If you do not agree to all the terms, you may not access or use our services.',
    },
    {
        icon: <Link2 className="w-5 h-5 text-blue-500" />,
        number: '02',
        title: 'Description of Service & Third-Party Platforms',
        content: 'ReviewMate connects to third-party review platforms (such as Google Maps, TripAdvisor, Booking.com, and Yelp) to aggregate customer feedback for your business. By linking these external accounts, you grant us permission to access and manage this data on your behalf. You agree to comply with the respective Terms of Service of any third-party platform you connect to ReviewMate.',
    },
    {
        icon: <MessageSquare className="w-5 h-5 text-blue-500" />,
        number: '03',
        title: 'AI-Assisted Replies',
        content: 'Our service includes AI-generated response suggestions for customer reviews. While we strive for high-quality outputs, AI-generated content may occasionally be inaccurate or inappropriate. You are solely responsible for reviewing and approving all AI-assisted replies before publishing them. ReviewMate accepts no liability for the consequences of published AI responses.',
        highlight: true,
    },
    {
        icon: <CreditCard className="w-5 h-5 text-blue-500" />,
        number: '04',
        title: 'Subscriptions, Trials & Billing',
        content: 'ReviewMate offers a 14-day free trial with no credit card required. Upon conclusion of the trial, continued access requires a paid subscription. Subscription fees are billed in advance on a recurring basis. You may cancel your subscription at any time, but we do not provide refunds for partial billing periods.',
    },
    {
        icon: <Lock className="w-5 h-5 text-blue-500" />,
        number: '05',
        title: 'Account Security & Data Ownership',
        content: 'You are responsible for maintaining the security of your workspace credentials. You retain all rights to the proprietary business data you connect to our system. ReviewMate claims no ownership over your customer reviews or business information. Unauthorized sharing of credentials is strictly prohibited.',
    },
    {
        icon: <Shield className="w-5 h-5 text-blue-500" />,
        number: '06',
        title: 'Limitation of Liability',
        content: 'To the maximum extent permitted by law, ReviewMate shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform, including but not limited to loss of revenue, data, or business opportunities. Our aggregate liability is limited to the amount paid by you in the 3 months preceding the claim.',
    },
];

const TermsOfServicePage: React.FC = () => {
    const navigate = useNavigate();
    return (
        <div className="fixed inset-0 overflow-y-auto bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white">

            {/* ── Sticky Header — exact same as NotificationsHeader ── */}
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 sticky top-0 z-40 px-8 py-6 flex items-center justify-between transition-all duration-300">
                <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
                            Terms of Service
                        </h1>
                        <span className="text-[10px] font-black bg-[#4e80ee] text-white px-2 py-0.5 rounded-lg shadow-sm shadow-blue-100 uppercase tracking-widest">
                            Legal
                        </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">
                        Effective for all ReviewMate users &amp; organizations
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

                {/* Privacy callout */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 sm:p-8 text-center">
                    <p className="text-gray-500 dark:text-slate-400 text-sm">
                        For information on how we handle your data, read our{' '}
                        <Link to="/privacy" className="text-[#4e80ee] font-bold hover:underline">Privacy Policy</Link>.
                        {' '}Questions?{' '}
                        <a href="mailto:support@reviewmate.io" className="text-[#4e80ee] font-bold hover:underline">Contact us</a>
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
                        <Link to="/terms" className="text-[11px] font-black text-[#4e80ee] uppercase tracking-widest">Terms</Link>
                        <Link to="/privacy" className="text-[11px] font-black text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 uppercase tracking-widest transition-colors">Privacy</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default TermsOfServicePage;
