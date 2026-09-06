import React from 'react';
import { Link } from 'react-router-dom';
import reviewMateLogo from '../../assets/reviewMate-logo.png';
import { ShieldCheck, Activity, Terminal, ArrowUpRight } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  type?: 'login' | 'signup' | 'other';
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  description,
  type = 'other',
}) => {
  // Editorial Dossier Content for Right Panel
  const showcaseContent = {
    login: {
      tag: 'IDENTITY & ACCESS // PROTOCOL 01',
      headline: 'Precision intelligence for hospitality teams that treat reputation as operational telemetry.',
      badge: 'AUTH_GATEWAY: ACTIVE',
      metrics: [
        { label: 'Ingestion Latency', value: '< 350ms', sub: 'Real-time pipeline' },
        { label: 'Platform Sync', value: '100%', sub: 'Multi-source API' },
        { label: 'Uptime Reliability', value: '99.98%', sub: 'High-availability SLA' },
      ],
      capabilities: [
        { id: '01', title: 'Unified Data Aggregation', desc: 'Centralized review ingestion from Google, TripAdvisor, Booking, and Agoda.' },
        { id: '02', title: 'Vector Sentiment Classification', desc: 'Neural embeddings detect nuance, polarity, and operational distress signals.' },
        { id: '03', title: 'Human-in-the-Loop Studio', desc: 'Calibrated AI draft responses that preserve your brand voice.' },
      ],
    },
    signup: {
      tag: 'ENTERPRISE ONBOARDING // 14-DAY TRIAL',
      headline: 'Turn raw customer feedback into autonomous operational leverage across every location.',
      badge: 'ONBOARDING // TIER 1',
      metrics: [
        { label: 'Setup Time', value: '< 2 mins', sub: 'Instant source hookup' },
        { label: 'Trial Coverage', value: '14 Days', sub: 'Zero credit card required' },
        { label: 'Telemetry Engine', value: 'MiniLM-v2', sub: 'Local & cloud inference' },
      ],
      capabilities: [
        { id: '01', title: 'Zero Friction Ingestion', desc: 'Direct URL ingestion with automatic competitor benchmark tracking.' },
        { id: '02', title: 'Automated Insight Extraction', desc: 'Isolate root causes behind rating drops before they impact revenue.' },
        { id: '03', title: 'Executive Intelligence Ledger', desc: 'Export audit-ready CSV & PDF reports for general managers and owners.' },
      ],
    },
    other: {
      tag: 'CRYPTOGRAPHIC RECOVERY // GATEWAY',
      headline: 'Zero-knowledge account recovery safeguarded by time-delimited cryptographic tokens.',
      badge: 'RECOVERY // RFC 6238',
      metrics: [
        { label: 'Token Duration', value: '15 Mins', sub: 'Single-use cryptographic hash' },
        { label: 'Transport Layer', value: 'TLS 1.3', sub: 'End-to-end encrypted' },
        { label: 'Verification Method', value: 'Dual-Factor', sub: 'Email digest challenge' },
      ],
      capabilities: [
        { id: '01', title: 'Session Invalidation', desc: 'Automatic revocation of stale active tokens upon password rotation.' },
        { id: '02', title: 'Identity Audit Trail', desc: 'Cryptographically logged authentication attempts and IP geolocation.' },
        { id: '03', title: 'Role-Based Access Guard', desc: 'Strict separation between enterprise tenant data and administrative layers.' },
      ],
    },
  };

  const current = showcaseContent[type] || showcaseContent.other;

  return (
    <div className="min-h-screen w-full bg-[#020617] text-slate-100 flex flex-col lg:flex-row relative selection:bg-blue-600 selection:text-white font-sans antialiased overflow-x-hidden">
      {/* Noise Texture Overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
        }}
      />

      {/* ─────────────────────────────────────────────────────────────
          LEFT PANEL — Authentication Form (~52% on Desktop)
      ───────────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-[52%] xl:w-[50%] min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-14 xl:p-16 relative z-10">
        {/* Top Masthead */}
        <header className="flex items-center justify-between border-b border-slate-800/80 pb-6 mb-8 lg:mb-12">
          <Link
            to="/"
            className="flex items-center gap-3 group transition-opacity hover:opacity-85"
            title="Return to home"
          >
            <img
              src={reviewMateLogo}
              alt="ReviewMate"
              className="w-8 h-8 object-contain filter drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]"
            />
            <div className="flex flex-col">
              <span className="font-serif text-lg font-bold text-slate-100 tracking-tight leading-none">
                ReviewMate
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-slate-500 mt-1">
                Reputation OS
              </span>
            </div>
          </Link>

          {/* System Telemetry Pill */}
          <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-900/80 border border-slate-800 rounded-sm font-mono text-[10px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline tracking-wider">SYS // ONLINE</span>
            <span className="text-slate-600">|</span>
            <span className="text-blue-400 font-semibold">{current.badge}</span>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="w-full max-w-md mx-auto my-auto py-4">
          {/* Header Title & Subtitle */}
          <div className="mb-8 text-left">
            <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-blue-400 mb-2.5">
              <Terminal className="w-3.5 h-3.5" />
              <span>{current.tag}</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-white font-normal tracking-tight leading-[1.15] mb-2.5">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-slate-400 font-sans leading-relaxed">
                {description}
              </p>
            )}
          </div>

          {/* Form Children Container */}
          <div className="w-full text-left">
            {children}
          </div>
        </main>

        {/* Left Panel Colophon / Security Footer */}
        <footer className="pt-8 mt-10 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-500 font-mono text-[10px] uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>End-to-End Cryptographic Security</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-slate-300 transition-colors">Privacy</Link>
            <span className="text-slate-700">/</span>
            <Link to="/terms" className="hover:text-slate-300 transition-colors">Terms</Link>
            <span className="text-slate-700">/</span>
            <span className="text-slate-600">v2.4.0</span>
          </div>
        </footer>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT PANEL — Architectural Telemetry Showcase (~48% on Desktop)
      ───────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[50%] min-h-screen bg-[#050914] border-l border-slate-800/80 flex-col justify-between p-10 xl:p-16 relative overflow-hidden">
        {/* Subtle Technical Grid Overlay */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Faint Architectural Accent Line */}
        <div
          aria-hidden="true"
          className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none"
        />

        {/* Right Header */}
        <div className="relative z-10 flex items-center justify-between border-b border-slate-800/70 pb-5">
          <div className="font-mono text-[11px] uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>Telemetry Ledger // Operational Intelligence</span>
          </div>
          <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">
            REG: US-EAST // PING: 12MS
          </div>
        </div>

        {/* Center Showcase Content */}
        <div className="relative z-10 my-auto py-10 space-y-10 max-w-xl">
          {/* Editorial Headline / Quote */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-blue-400 mb-3">
              [ PHILOSOPHY & CAPABILITY ]
            </div>
            <blockquote className="font-serif text-2xl xl:text-3xl text-slate-200 font-normal leading-[1.3] tracking-tight">
              &ldquo;{current.headline}&rdquo;
            </blockquote>
          </div>

          {/* Telemetry Metrics Readout */}
          <div className="grid grid-cols-3 gap-4 p-5 bg-slate-900/40 border border-slate-800/80 rounded-sm">
            {current.metrics.map((metric, idx) => (
              <div key={idx} className="space-y-1">
                <div className="font-mono text-xl xl:text-2xl font-bold text-white tracking-tight">
                  {metric.value}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  {metric.label}
                </div>
                <div className="text-[11px] text-slate-500 font-sans leading-tight">
                  {metric.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Numbered Capability Dossier */}
          <div className="space-y-3.5">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
              System Architecture Modules
            </div>
            {current.capabilities.map((cap) => (
              <div
                key={cap.id}
                className="flex items-start gap-4 p-3.5 bg-slate-900/30 border border-slate-800/60 rounded-sm hover:border-slate-700/80 transition-colors"
              >
                <span className="font-mono text-xs font-semibold text-blue-400 shrink-0 pt-0.5">
                  [{cap.id}]
                </span>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-semibold text-slate-200 tracking-tight font-sans">
                    {cap.title}
                  </h4>
                  <p className="text-xs text-slate-400 font-sans leading-relaxed">
                    {cap.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Footer Status Ticker */}
        <div className="relative z-10 pt-5 border-t border-slate-800/70 flex items-center justify-between text-slate-500 font-mono text-[10px] uppercase tracking-widest">
          <div className="flex items-center gap-3">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>INGESTION_PIPELINE: STANDBY</span>
          </div>
          <div className="flex items-center gap-3">
            <span>CHROMA_VECTORS: PERSISTENT</span>
            <span className="text-slate-700">/</span>
            <span>TLS_v1.3</span>
          </div>
        </div>
      </div>
    </div>
  );
};
