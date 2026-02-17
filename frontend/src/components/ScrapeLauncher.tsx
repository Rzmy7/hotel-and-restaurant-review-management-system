import React, { useState } from 'react';
import { Rocket, Link2, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

type Status = 'idle' | 'running' | 'success' | 'error';

const ScrapeLauncher: React.FC = () => {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('Provide a Booking.com reviews link and launch the scraper.');
  const [headless, setHeadless] = useState(true);

  const startScrape = async () => {
    const trimmed = url.trim();
    if (!trimmed.startsWith('http')) {
      setStatus('error');
      setMessage('Please paste a full Booking.com reviews URL.');
      return;
    }

    setStatus('running');
    setMessage('Starting scrape…');

    try {
      const response = await fetch(`${API_BASE}/scrape/booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed, headless }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to start scrape');
      }

      const data = await response.json();
      setStatus('success');
      setMessage(data.message || 'Scrape started. Check backend logs for progress.');
    } catch (err) {
      const fallback = err instanceof Error ? err.message : 'Failed to start scrape';
      setStatus('error');
      setMessage(fallback);
    }
  };

  const renderStatusIcon = () => {
    if (status === 'running') return <Loader2 size={16} className="animate-spin" />;
    if (status === 'success') return <CheckCircle2 size={16} />;
    if (status === 'error') return <AlertTriangle size={16} />;
    return null;
  };

  return (
    <div className="bg-gradient-to-br from-[#0f172a] via-[#0b2840] to-[#0d354f] text-[#e7f5ff] rounded-2xl px-5.5 py-5 shadow-[0_18px_38px_rgba(9,21,41,0.3)] border border-white/[0.06] flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Rocket size={18} />
          <div>
            <h3 className="m-0 text-base tracking-[0.2px]">Booking.com Scraper</h3>
            <p className="m-0 text-[#b6c8e2] text-[13px]">Trigger the Playwright scraper directly from the dashboard.</p>
          </div>
        </div>
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs tracking-[0.2px] border ${
          status === 'idle' ? 'bg-white/[0.08] text-[#d9eaff] border-white/[0.12]' :
          status === 'running' ? 'bg-blue-500/[0.12] text-[#9dc5ff]' :
          status === 'success' ? 'bg-green-400/[0.16] text-[#b4f7c7]' :
          'bg-red-400/[0.16] text-[#ffc7c7]'
        }`}>
          {renderStatusIcon()}
          <span>
            {status === 'idle' && 'Idle'}
            {status === 'running' && 'Running'}
            {status === 'success' && 'Started'}
            {status === 'error' && 'Error'}
          </span>
        </div>
      </div>

      <label className="text-[13px] text-[#c5d7f1]">Booking reviews URL</label>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5">
        <Link2 size={16} />
        <input
          type="url"
          placeholder="https://www.booking.com/hotel/.../reviews.html"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') startScrape();
          }}
          className="w-full bg-transparent border-none text-[#e7f5ff] text-sm outline-none placeholder:text-[#8fa8c7]"
        />
        <button
          className="inline-flex items-center gap-1.5 bg-gradient-to-br from-cyan-400 to-cyan-500 text-[#082f49] border-none px-3.5 py-2.5 rounded-[10px] font-semibold cursor-pointer transition-all duration-150 hover:enabled:-translate-y-px hover:enabled:shadow-[0_10px_24px_rgba(14,165,233,0.35)] disabled:opacity-70 disabled:cursor-not-allowed"
          disabled={status === 'running'}
          onClick={startScrape}
        >
          {status === 'running' ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Launching…</span>
            </>
          ) : (
            <>
              <Rocket size={16} />
              <span>Start</span>
            </>
          )}
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <label className="inline-flex items-center gap-2 text-[13px] text-[#c5d7f1]">
          <input
            type="checkbox"
            checked={!headless}
            onChange={(e) => setHeadless(!e.target.checked)}
            className="accent-cyan-400"
          />
          <span>Show browser window (debug)</span>
        </label>
        <p className={`m-0 text-[13px] ${
          status === 'success' ? 'text-[#c7f9d2]' :
          status === 'error' ? 'text-[#ffc7c7]' :
          status === 'running' ? 'text-[#9dc5ff]' :
          'text-[#c5d7f1]'
        }`}>{message}</p>
      </div>
    </div>
  );
};

export default ScrapeLauncher;
