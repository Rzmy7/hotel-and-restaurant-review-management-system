import React from 'react';
import { Card } from '../ui/Card';
import { BarChart3, MessageSquare, Zap, ShieldCheck, Star, Users, Globe, TrendingUp } from 'lucide-react';

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    description?: string;
    type?: 'login' | 'signup' | 'other';
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, description, type = 'other' }) => {

    // Content mapping based on type
    const leftPanelContent = {
        login: {
            title: "Welcome Back to Your Workspace",
            highlight: "ReviewMate Dashboard",
            description: "Access your centralized hub for monitoring, analyzing, and responding to customer feedback across all your locations.",
            features: [
                {
                    icon: <TrendingUp className="w-6 h-6 text-brand-400" />,
                    title: "Track Your Performance",
                    desc: "View real-time sentiment trends and rating changes."
                },
                {
                    icon: <MessageSquare className="w-6 h-6 text-brand-400" />,
                    title: "Engage with Customers",
                    desc: "Respond to reviews quickly with AI-assisted replies."
                }
            ],
            imageGradient: "from-brand-600/20 to-purple-600/20"
        },
        signup: {
            title: "Turn Customer Reviews Into",
            highlight: "Business Growth",
            description: "Join thousands of businesses who use ReviewMate to turn customer feedback into their strongest competitive advantage.",
            features: [
                {
                    icon: <Globe className="w-6 h-6 text-brand-400" />,
                    title: "Multi-Platform Analytics",
                    desc: "Aggregate reviews from Google, TripAdvisor, Booking.com and more."
                },
                {
                    icon: <Zap className="w-6 h-6 text-brand-400" />,
                    title: "AI Sentiment Analysis",
                    desc: "Automatically detect sentiment trends and actionable insights instantly."
                }
            ],
            imageGradient: "from-brand-500/20 to-indigo-600/20"
        },
        other: {
            title: "Manage Your Reviews",
            highlight: "Effectively",
            description: "Secure your account and continue managing your online reputation.",
            features: [],
            imageGradient: "from-brand-500/20 to-slate-600/20"
        }
    };

    const content = leftPanelContent[type] || leftPanelContent.other;

    return (
        <div className="dark fixed inset-0 w-full h-full flex bg-slate-950 text-slate-200 selection:bg-brand-500/30 selection:text-brand-100 overflow-hidden">

            {/* Left Panel - Branding & Features (Hidden on smaller screens) */}
            <div className="hidden lg:flex w-1/2 relative overflow-hidden flex-col justify-between p-12 bg-slate-950 border-r border-slate-800/50">

                {/* Background decorative elements matching brand color palette */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br ${content.imageGradient} blur-[120px] opacity-70`}></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tl from-brand-900/40 to-slate-900/40 blur-[120px]"></div>
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom_right,white,transparent,transparent)] opacity-60"></div>
                </div>

                <div className="relative z-10 flex flex-col h-full justify-center max-w-lg mx-auto">
                    {/* Logo Area */}
                    <div className="flex items-center gap-3 mb-12">
                        <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 border border-brand-500/50">
                            <MessageSquare className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-black text-white tracking-tight">ReviewMate</span>
                    </div>

                    {/* Main Content */}
                    <div className="mb-12">
                        <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-6 tracking-tight">
                            {content.title} <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-200">{content.highlight}</span>
                        </h1>
                        <p className="text-lg text-slate-300 font-medium leading-relaxed mb-10">
                            {content.description}
                        </p>

                        {/* Feature Highlights */}
                        <div className="space-y-6">
                            {content.features.map((feature, idx) => (
                                <div key={idx} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm hover:bg-slate-800/50 transition-colors">
                                    <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0 border border-brand-500/20">
                                        {feature.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-lg mb-1">{feature.title}</h3>
                                        <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Stats / Trust Indicators */}
                    <div className="flex items-center gap-8 pt-8 border-t border-slate-800/60">
                        <div>
                            <div className="text-2xl font-black text-white mb-1">10K+</div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Reviews Processed</div>
                        </div>
                        <div className="w-px h-10 bg-slate-800"></div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <div className="text-lg font-black text-white">99.9%</div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Uptime SLA</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Auth Form (Now fully dark mode) */}
            <div className="w-full lg:w-1/2 flex flex-col p-6 sm:p-12 md:p-16 lg:p-20 overflow-y-auto bg-[#0B0F19] relative">

                {/* Subtle gradient glow in right panel for depth */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-900/10 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="w-full max-w-[440px] mx-auto my-auto relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center gap-2 mb-10">
                        <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 border border-brand-500/30">
                            <MessageSquare className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-2xl font-black text-white tracking-tight">ReviewMate</span>
                    </div>

                    <div className="space-y-3 mb-10">
                        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                            {title}
                        </h2>
                        {description && (
                            <p className="text-slate-400 font-medium text-lg">
                                {description}
                            </p>
                        )}
                    </div>

                    {/* Form Container */}
                    <div className="bg-slate-900/40 p-6 sm:p-8 rounded-2xl border border-slate-800/80 shadow-xl shadow-black/20 backdrop-blur-sm">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};
