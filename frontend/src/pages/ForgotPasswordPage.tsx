import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthLayout } from '../components/shared/AuthLayout';

const ForgotPasswordPage = () => {
  const { forgotPassword } = useAuth();
  const location = useLocation();
  const loginEmail = location.state?.loginEmail as string | undefined;

  const [email, setEmail] = useState(loginEmail || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    // Explicit check: email must match the one entered in login page if provided
    if (loginEmail && email !== loginEmail) {
      setError('Please enter the correct login email address associated with your session.');
      setLoading(false);
      return;
    }

    try {
      await forgotPassword(email);
      setMessage('A time-delimited recovery link has been dispatched to your email address.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dispatch recovery token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      type="other"
      title="Reset password."
      description="Enter your registered operator email to receive single-use cryptographic recovery instructions."
    >
      {/* Success In-Place Confirmation Card */}
      {message ? (
        <div className="space-y-6 text-left animate-in fade-in">
          <div className="p-5 bg-emerald-950/30 border border-emerald-500/40 rounded-sm space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-mono text-[11px] uppercase tracking-wider text-emerald-400 font-bold">
                  Recovery Instructions Dispatched
                </div>
                <p className="text-xs text-slate-300 font-sans mt-1 leading-relaxed">
                  {message}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 font-mono border-t border-emerald-500/20 pt-2.5">
              TARGET: <span className="text-white font-semibold">{email}</span>
            </p>
          </div>

          <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-sm text-xs text-slate-400 font-sans space-y-2">
            <p className="font-semibold text-slate-300">Didn't receive an email?</p>
            <p className="leading-relaxed">
              Check your spam or junk folder. The recovery link remains valid for 15 minutes.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setMessage(null);
                setError(null);
              }}
              className="w-full sm:w-1/2 h-11 border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-200 rounded-sm font-mono text-xs uppercase tracking-wider transition-colors"
            >
              TRY ANOTHER EMAIL
            </button>
            <Link
              to="/login"
              className="w-full sm:w-1/2 h-11 bg-blue-600 hover:bg-blue-500 text-white rounded-sm font-mono text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              RETURN TO LOGIN
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        /* Recovery Request Form */
        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          {error && (
            <div className="p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-sm flex items-start gap-2.5 text-rose-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="text-xs font-sans font-medium leading-relaxed">{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Registered Work Email
            </label>
            <div className="relative group">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              <input
                type="email"
                placeholder="operator@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 pl-10 pr-4 bg-slate-900/60 border border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:bg-slate-900 rounded-sm text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-all font-sans"
                required
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-sm font-mono text-xs uppercase tracking-widest font-semibold transition-colors flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                DISPATCHING TOKEN...
              </span>
            ) : (
              <>
                DISPATCH RECOVERY LINK
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          <div className="text-center pt-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to login
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
