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
            style={{ background: '#080d1a' }}
        >
            {/*
             * PAGE-WIDE NOISE TEXTURE
             * 3 % opacity SVG turbulence overlay — ties both panels together
             * with the same grain the reference image shows.
             */}
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
                className="hidden lg:flex w-1/2 relative overflow-hidden flex-col justify-between p-12"
                style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}
            >
                {/*
                 * LEFT PANEL BACKGROUND LAYERS
                 * Rule: all opacity values are explicit inline styles so
                 * Tailwind JIT cannot silently drop them.
                 */}

                {/* Layer 1 — same deep navy as the page canvas (no visible shift) */}
                <div
                    aria-hidden="true"
                    style={{
                        position: 'absolute', inset: 0, pointerEvents: 'none',
                        background: 'linear-gradient(180deg, #080d1a 0%, #0a1020 60%, #080d1a 100%)',
                    }}
                />

                {/* Layer 2 — single ambient blue orb, top-left, 12 % max opacity */}
                <div
                    aria-hidden="true"
                    style={{
                        position: 'absolute', top: '-15%', left: '-10%',
                        width: '70%', height: '65%', borderRadius: '50%', pointerEvents: 'none',
                        background: 'radial-gradient(ellipse at center, rgba(37,99,235,0.12) 0%, rgba(37,99,235,0.04) 45%, transparent 70%)',
                        filter: 'blur(80px)',
                    }}
                />

                {/* Layer 3 — faint indigo counter-glow, bottom-right, 8 % */}
                <div
                    aria-hidden="true"
                    style={{
                        position: 'absolute', bottom: '-10%', right: '-5%',
                        width: '55%', height: '50%', borderRadius: '50%', pointerEvents: 'none',
                        background: 'radial-gradient(ellipse at center, rgba(79,70,229,0.08) 0%, transparent 65%)',
                        filter: 'blur(70px)',
                    }}
                />

                {/* Layer 4 — sparse dot grid, 2.5 % opacity (Vercel / Linear style) */}
                <div
                    aria-hidden="true"
                    style={{
                        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.025,
                        backgroundImage: 'radial-gradient(circle, rgba(148,163,184,1) 1px, transparent 1px)',
                        backgroundSize: '32px 32px',
                    }}
                />

                {/* ── Content (unchanged) ── */}
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

            {/* ─────────────────────────────────────────────
                RIGHT PANEL — Auth Form
            ───────────────────────────────────────────── */}
            <div
                className="w-full lg:w-1/2 flex flex-col p-6 sm:p-12 md:p-16 lg:p-20 overflow-y-auto relative"
                style={{ background: 'transparent' }}
            >
                {/*
                 * Soft blue glow centred behind the form card.
                 * Connects right panel visually to the left accent colour
                 * without competing with the form for attention.
                 */}
                <div
                    aria-hidden="true"
                    style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '480px', height: '480px', borderRadius: '50%', pointerEvents: 'none',
                        background: 'radial-gradient(ellipse at center, rgba(37,99,235,0.09) 0%, rgba(37,99,235,0.03) 50%, transparent 70%)',
                        filter: 'blur(60px)',
                    }}
                />

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
