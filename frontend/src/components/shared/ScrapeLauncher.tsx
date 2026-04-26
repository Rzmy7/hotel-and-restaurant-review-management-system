import { useState } from "react";
import {
  Rocket,
  Link2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { getApiBaseUrl } from "../../config/api";

const API_BASE = getApiBaseUrl();

type Status = "idle" | "running" | "success" | "error";

const ScrapeLauncher: React.FC = () => {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState(
    "Provide a Booking.com reviews link and launch the scraper.",
  );
  const [headless, setHeadless] = useState(true);

  const startScrape = async () => {
    const trimmed = url.trim();
    if (!trimmed.startsWith("http")) {
      setStatus("error");
      setMessage("Please paste a full Booking.com reviews URL.");
      return;
    }

    setStatus("running");
    setMessage("Starting scrape…");

    try {
      const response = await fetch(`${API_BASE}/scrape/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed, headless }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to start scrape");
      }

      const data = await response.json();
      setStatus("success");
      setMessage(
        data.message || "Scrape started. Check backend logs for progress.",
      );
    } catch (err) {
      const fallback =
        err instanceof Error ? err.message : "Failed to start scrape";
      setStatus("error");
      setMessage(fallback);
    }
  };

  const renderStatusIcon = () => {
    if (status === "running")
      return <Loader2 size={16} className="animate-spin" />;
    if (status === "success") return <CheckCircle2 size={16} />;
    if (status === "error") return <AlertTriangle size={16} />;
    return null;
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-white/5 shadow-2xl rounded-2xl p-5 flex flex-col gap-3 text-sky-50">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Rocket size={18} />
          <div>
            <h3 className="m-0 text-base tracking-wide">Booking.com Scraper</h3>
            <p className="m-0 text-sky-200/80 text-[13px]">
              Trigger the Playwright scraper directly from the dashboard.
            </p>
          </div>
        </div>
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs border border-white/10 ${
            status === "running"
              ? "bg-blue-500/10 text-blue-300"
              : status === "success"
                ? "bg-green-500/15 text-green-300"
                : status === "error"
                  ? "bg-red-500/15 text-red-300"
                  : "bg-white/10 text-sky-100"
          }`}
        >
          {renderStatusIcon()}
          <span>
            {status === "idle" && "Idle"}
            {status === "running" && "Running"}
            {status === "success" && "Started"}
            {status === "error" && "Error"}
          </span>
        </div>
      </div>

      <label className="text-[13px] text-sky-200/90">Booking reviews URL</label>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl p-2.5">
        <Link2 size={16} />
        <input
          className="w-full bg-transparent border-none text-sky-50 text-sm outline-none placeholder:text-sky-300/50"
          type="url"
          placeholder="https://www.booking.com/hotel/.../reviews.html"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") startScrape();
          }}
        />
        <button
          className="inline-flex items-center gap-1.5 bg-gradient-to-br from-cyan-400 to-sky-500 text-sky-950 border-none px-3.5 py-2.5 rounded-lg font-semibold cursor-pointer transition hover:-translate-y-px hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
          disabled={status === "running"}
          onClick={startScrape}
        >
          {status === "running" ? (
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
        <label className="inline-flex items-center gap-2 text-[13px] text-sky-200/90">
          <input
            type="checkbox"
            className="accent-cyan-400"
            checked={!headless}
            onChange={(e) => setHeadless(!e.target.checked)}
          />
          <span>Show browser window (debug)</span>
        </label>
        <p
          className={`m-0 text-[13px] ${
            status === "success"
              ? "text-emerald-200"
              : status === "error"
                ? "text-red-300"
                : status === "running"
                  ? "text-blue-300"
                  : "text-sky-200/90"
          }`}
        >
          {message}
        </p>
      </div>
    </div>
  );
};

export default ScrapeLauncher;
