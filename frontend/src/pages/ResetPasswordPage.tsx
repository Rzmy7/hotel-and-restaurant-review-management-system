import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthLayout } from '../components/shared/AuthLayout';

const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const auth = useAuth();
  const navigate = useNavigate();

  // Silently log out the user if they navigate to this page while still authenticated
  useEffect(() => {
    if (auth.user) {
      auth.persist(null);
    }
  }, [auth.user, auth]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return setError('Missing or invalid recovery token.');
    if (password.length < 8) return setError('Password must be at least 8 characters long.');
    if (password !== confirm) return setError('Passwords do not match.');

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await auth.resetPassword(token, password);
      setMessage('Password updated successfully. Redirecting to workspace login...');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err: any) {
      setError(err.message || 'Unable to update password. Token may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      type="other"
      title="Set new credentials."
      description="Create a secure, non-reused password to restore access to your account."
    >
      {/* Success Notification */}
      {message && (
        <div className="mb-6 p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-sm flex items-start gap-3 text-emerald-300 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-emerald-400 font-bold">
              Credentials Updated
            </div>
            <p className="text-xs font-sans mt-0.5 leading-relaxed">{message}</p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-sm flex items-start gap-2.5 text-rose-300 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span className="text-xs font-sans font-medium leading-relaxed">{error}</span>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4 text-left">
        {/* New Password */}
        <div className="space-y-1.5">
          <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            New Password
          </label>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 pl-10 pr-10 bg-slate-900/60 border border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:bg-slate-900 rounded-sm text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-all font-sans"
              required
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            Confirm New Password
          </label>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="••••••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full h-11 pl-10 pr-10 bg-slate-900/60 border border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:bg-slate-900 rounded-sm text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-all font-sans"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-sm font-mono text-xs uppercase tracking-widest font-semibold transition-colors flex items-center justify-center gap-2 mt-4 cursor-pointer"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              UPDATING CREDENTIALS...
            </span>
          ) : (
            <>
              SAVE & UPDATE PASSWORD
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
    </AuthLayout>
  );
};

export default ResetPasswordPage;
