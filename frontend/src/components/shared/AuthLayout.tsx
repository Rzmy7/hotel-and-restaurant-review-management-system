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
        },
        other: {
            title: "Manage Your Reviews",
            highlight: "Effectively",
            description: "Secure your account and continue managing your online reputation.",
            features: [],
        }
    };

    const content = leftPanelContent[type] || leftPanelContent.other;

    return (
        /*
         * UNIFIED CANVAS
         * Both panels share the same deep navy base (#080d1a) so they read
         * as one surface rather than two separate pages placed side-by-side.
         */
        <div
            className="dark fixed inset-0 w-full h-full flex text-slate-200 overflow-hidden"
            style={{ background: '#060913' }}
        >
            {/*
             * UNIFIED PAGE BACKGROUND LAYERS
             * Moved out of the left panel to span the entire screen, creating
             * a seamless single-page experience without hard borders.
             */}

            {/* Layer 1 — Page-wide deep gradient base */}
            <div
                aria-hidden="true"
                style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
                    background: 'linear-gradient(135deg, #060913 0%, #0a1128 50%, #060913 100%)',
                }}
            />

            {/* Layer 2 — Large, intensified ambient blue orb covering the left side */}
            <div
                aria-hidden="true"
                style={{
                    position: 'absolute', top: '-10%', left: '-10%',
                    width: '60%', height: '80%', borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
                    background: 'radial-gradient(ellipse at center, rgba(37,99,235,0.35) 0%, rgba(37,99,235,0.15) 40%, rgba(37,99,235,0.04) 65%, transparent 80%)',
                    filter: 'blur(80px)',
                }}
            />

            {/* Layer 3 — Deep indigo counter-glow from the bottom */}
            <div
                aria-hidden="true"
                style={{
                    position: 'absolute', bottom: '-20%', left: '20%',
                    width: '70%', height: '60%', borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
                    background: 'radial-gradient(ellipse at center, rgba(79,70,229,0.20) 0%, rgba(79,70,229,0.06) 50%, transparent 75%)',
                    filter: 'blur(90px)',
                }}
            />

            {/* Layer 4 — Page-wide sparse dot grid */}
            <div
                aria-hidden="true"
                style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.04,
                    backgroundImage: 'radial-gradient(circle, rgba(148,163,184,1) 1px, transparent 1px)',
                    backgroundSize: '32px 32px',
                }}
            />

            {/* Layer 5 — Page-wide noise texture for cohesion */}
            <div
                aria-hidden="true"
                style={{
                    position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'repeat',
                    backgroundSize: '128px 128px',
                    opacity: 0.35,
                    mixBlendMode: 'overlay',
                }}
            />

            {/* ─────────────────────────────────────────────
                LEFT PANEL — Branding & Features
                Hidden on screens below lg.
            ───────────────────────────────────────────── */}
            <div
                className="hidden lg:flex w-1/2 relative flex-col justify-between p-12 z-10"
            >

                {/* ── Content ── */}
                <div className="relative z-10 flex flex-col h-full justify-center max-w-lg lg:ml-auto lg:mr-8 xl:mr-16">
                    {/* Logo Area */}
                    <div className="flex items-center gap-3 mb-12">
                        <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 border border-brand-500/50">
                            <MessageSquare className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-black text-white tracking-tight">ReviewMate</span>
                    </div>

                    {/* Main Content */}
                    <div className="mb-12">
                        {/* 
                          * Heading: reduced size and weight to balance against the highlighted form card.
                          * Color matched to the description text (slate-400) for a subtle gray look.
                        */}
                        <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-400 leading-[1.2] mb-6 tracking-tight">
                            {content.title}{' '}
                            <span
                                style={{
                                    background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                    display: 'inline',
                                }}
                            >
                                {content.highlight}
                            </span>
                        </h1>
                        <p className="text-base text-slate-400 font-normal leading-relaxed mb-10">
                            {content.description}
                        </p>

                        {/* Feature Highlights */}
                        <div className="space-y-4">
                            {content.features.map((feature, idx) => (
                                <div key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm hover:bg-slate-800/50 transition-colors">
                                    <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0 border border-brand-500/20">
                                        {feature.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-slate-200 font-semibold text-base mb-0.5">{feature.title}</h3>
                                        <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Stats / Trust Indicators */}
                    <div className="flex items-center gap-8 pt-8 border-t border-slate-800/50">
                        <div>
                            <div className="text-2xl font-bold text-slate-100 mb-0.5">10K+</div>
                            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Reviews Processed</div>
                        </div>
                        <div className="w-px h-10 bg-slate-800"></div>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <div className="text-lg font-bold text-slate-100">99.9%</div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Uptime SLA</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─────────────────────────────────────────────
                RIGHT PANEL — Auth Form
            ───────────────────────────────────────────── */}
            <div
                className="w-full lg:w-1/2 flex flex-col p-6 sm:p-12 md:p-16 lg:p-20 overflow-y-auto relative"
                style={{ background: 'transparent' }}
            >
                {/* Intensified spotlight behind the form card to make it pop */}
                <div
                    aria-hidden="true"
                    style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '600px', height: '600px', borderRadius: '50%', pointerEvents: 'none',
                        background: 'radial-gradient(ellipse at center, rgba(29,78,216,0.22) 0%, rgba(37,99,235,0.10) 40%, rgba(37,99,235,0.03) 65%, transparent 75%)',
                        filter: 'blur(50px)',
                    }}
                />

                <div className="w-full max-w-[540px] mx-auto lg:mx-0 lg:ml-8 xl:ml-16 my-auto relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center gap-2 mb-10">
                        <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 border border-brand-500/30">
                            <MessageSquare className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-2xl font-black text-white tracking-tight">ReviewMate</span>
                    </div>

                    {/* Form Container — highlighted card */}
                    <div style={{ position: 'relative' }}>
                        {/* Outer blue glow ring — makes the card float and stand out */}
                        <div
                            aria-hidden="true"
                            style={{
                                position: 'absolute',
                                inset: '-2px',
                                borderRadius: '18px',
                                background: 'linear-gradient(135deg, rgba(59,130,246,0.35) 0%, rgba(99,102,241,0.20) 50%, rgba(59,130,246,0.12) 100%)',
                                filter: 'blur(1px)',
                                zIndex: 0,
                            }}
                        />
                        <div
                            className="p-8 sm:p-10 lg:p-12 rounded-[24px] backdrop-blur-md relative"
                            style={{
                                zIndex: 1,
                                background: 'rgba(13, 20, 40, 0.92)',
                                border: '1px solid rgba(99, 130, 200, 0.25)',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.4), 0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.08)',
                            }}
                        >
                            <div className="space-y-3 mb-8">
                                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                                    {title}
                                </h2>
                                {description && (
                                    <p className="text-slate-400 font-medium text-lg">
                                        {description}
                                    </p>
                                )}
                            </div>
                            
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
