import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getDashboardPathForRole, isExternalDestination, normalizeRole, isAdminRole } from '../utils/authRole';
import reviewMateLogo from '../assets/reviewMate-logo.png';
import { Terminal } from 'lucide-react';

export default function OAuthSuccessPage() {
  const navigate = useNavigate();
  const { persist, checkUserOrganizations } = useAuth();
  const [statusMessage, setStatusMessage] = useState('DECODING SECURE CREDENTIALS...');

  useEffect(() => {
    const handleOAuthSuccess = async () => {
      const params = new URLSearchParams(window.location.search);
      const rawToken = params.get("token");
      const token = rawToken?.replace(/^\"|\"$/g, "").trim();

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        setStatusMessage('VALIDATING AUTHENTICATION PAYLOAD...');

        // Fix Base64URL encoding for JWT
        const base64 = token.split(".")[1]
          .replace(/-/g, "+")
          .replace(/_/g, "/");

        const payload = JSON.parse(window.atob(base64));

        const user = {
          user_id: payload.user_id,
          email: payload.email,
          full_name: payload.full_name,
          role: normalizeRole(payload.role || payload.roles)
        };

        setStatusMessage('ROUTING TO AUTHORIZED WORKSPACE...');

        // Check if admin
        if (isAdminRole(user.role)) {
          const userStr = JSON.stringify(user);
          const destination = getDashboardPathForRole(user.role, token, userStr);
          if (isExternalDestination(destination)) {
            window.location.href = destination;
            return;
          }
          navigate(destination);
        } else {
          // Save user + token using AuthContext
          persist(user, token);
          await checkUserOrganizations();
        }
      } catch (err) {
        console.error("JWT decode error:", err);
        navigate("/login");
      }
    };

    handleOAuthSuccess();
  }, [checkUserOrganizations, navigate, persist]);

  return (
    <div className="min-h-screen w-full bg-[#020617] text-slate-100 flex items-center justify-center p-6 relative font-sans selection:bg-blue-600 selection:text-white">
      {/* Noise overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
        }}
      />

      <div className="w-full max-w-md p-8 bg-slate-900/40 border border-slate-800/80 rounded-sm text-center relative z-10 space-y-6">
        <div className="flex justify-center">
          <img
            src={reviewMateLogo}
            alt="ReviewMate Logo"
            className="w-12 h-12 object-contain filter drop-shadow-[0_0_12px_rgba(59,130,246,0.3)] animate-pulse"
          />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-blue-400">
            <Terminal className="w-3.5 h-3.5" />
            <span>OAUTH 2.0 PROTOCOL // ACCESS HANDSHAKE</span>
          </div>
          <h2 className="font-serif text-2xl text-white font-normal tracking-tight">
            Authenticating Session
          </h2>
          <p className="text-xs text-slate-400 font-sans">
            Establishing cryptographically signed workspace session with Google Workspace.
          </p>
        </div>

        {/* Minimal Progress Bar */}
        <div className="w-full bg-slate-800/60 h-1 overflow-hidden relative rounded-none">
          <div className="absolute inset-y-0 bg-blue-500 w-1/2 animate-[pulse_1.5s_ease-in-out_infinite]" />
        </div>

        <div className="font-mono text-[11px] text-slate-400 uppercase tracking-widest pt-2">
          {statusMessage}
        </div>
      </div>
    </div>
  );
}