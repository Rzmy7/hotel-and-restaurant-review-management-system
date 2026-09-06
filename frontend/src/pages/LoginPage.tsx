import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, X, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthLayout } from '../components/shared/AuthLayout';
import { getDashboardPathForRole, isExternalDestination } from '../utils/authRole';
import { getApiBaseUrl } from '../config/api';
import {
  mapBackendLoginErrorToField,
  normalizeLoginPayload,
  type LoginField,
  type LoginFieldErrors,
  validateLoginEmail,
  validateLoginForm,
  validateLoginPassword,
  validateVerificationCode,
} from '../validators/loginValidator';

const LoginPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isTwoFactorStep, setIsTwoFactorStep] = useState(searchParams.get('oauth_2fa') === 'true');
  const [twoFactorMessage, setTwoFactorMessage] = useState<string | null>(
    searchParams.get('oauth_2fa') === 'true' ? 'A verification code has been sent to your email.' : null
  );
  const [resendLoading, setResendLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const navigate = useNavigate();
  const auth = useAuth();

  useEffect(() => {
    if (searchParams.get('logout') === 'true' || searchParams.get('expired') === 'true') {
      localStorage.clear();

      if (auth.user) {
        auth.logout();
      } else {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('logout');
        newParams.delete('expired');
        setSearchParams(newParams, { replace: true });
      }
      return;
    }

    if (auth.user) {
      const destination = getDashboardPathForRole(auth.user.role);
      if (isExternalDestination(destination)) {
        window.location.href = destination; // Admin -> External admin-frontend
        return;
      }
      navigate(destination); // User -> Internal /dashboard
    }
  }, [auth.user, navigate, searchParams, setSearchParams, auth]);

  const setFieldError = (field: LoginField, message: string | null) => {
    setFieldErrors((prev: LoginFieldErrors) => {
      const next = { ...prev };
      if (message) {
        next[field] = message;
      } else {
        delete next[field];
      }
      return next;
    });
  };

  const validateSingleField = (field: LoginField, value?: string) => {
    switch (field) {
      case 'email':
        return setFieldError('email', validateLoginEmail(String(value ?? email)));
      case 'password':
        return setFieldError('password', validateLoginPassword(String(value ?? password)));
      case 'verificationCode':
        return setFieldError('verificationCode', validateVerificationCode(String(value ?? otpCode)));
      default:
        return undefined;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isTwoFactorStep) {
      const verificationError = validateVerificationCode(otpCode);
      if (verificationError) {
        setFieldError('verificationCode', verificationError);
        setError(verificationError);
        return;
      }
    } else {
      const validationErrors = validateLoginForm({ email, password });
      setFieldErrors(validationErrors);
      const firstError = Object.values(validationErrors)[0] as string | undefined;
      if (firstError) {
        setError(firstError);
        return;
      }
    }

    setLoading(true);

    try {
      const normalized = normalizeLoginPayload({ email, password });
      const result = await auth.login(normalized.email, normalized.password, rememberMe);

      if ('require_2fa' in result && result.require_2fa) {
        setIsTwoFactorStep(true);
        setTwoFactorMessage(result.message || 'A verification code has been sent to your email.');
        return;
      }

      if (!('user' in result)) {
        setError('Login failed');
        return;
      }

      const userStr = JSON.stringify({
        user_id: result.user.user_id,
        email: result.user.email,
        full_name: result.user.full_name || result.user.name || result.user.first_name || 'User',
        role: result.user.role || (result.user.roles && result.user.roles[0]),
      });
      const destination = getDashboardPathForRole(result.user.role, result.access_token, userStr);
      if (isExternalDestination(destination)) {
        window.location.href = destination;
        return;
      }
      navigate(destination);
    } catch (err: any) {
      const backendMessage = err.message || 'Login failed';
      const mappedErrors = mapBackendLoginErrorToField(backendMessage);
      if (Object.keys(mappedErrors).length > 0) {
        setFieldErrors((prev: LoginFieldErrors) => ({ ...prev, ...mappedErrors }));
      }
      setError(backendMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const apiBase = getApiBaseUrl();
    window.location.href = `${apiBase}/api/auth/login/google`;
  };

  const handleVerifyTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await auth.verifyLogin2fa(email, otpCode, rememberMe);
      const userStr = JSON.stringify({
        user_id: result.user.user_id,
        email: result.user.email,
        full_name: result.user.full_name || result.user.name || result.user.first_name || 'User',
        role: result.user.role || (result.user.roles && result.user.roles[0]),
      });
      const destination = getDashboardPathForRole(result.user.role, result.access_token, userStr);
      if (isExternalDestination(destination)) {
        window.location.href = destination;
        return;
      }
      navigate(destination);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResendLoading(true);
    setError(null);

    if (searchParams.get('oauth_2fa') === 'true') {
      handleGoogleLogin();
      return;
    }

    try {
      const result = await auth.login(email, password, rememberMe);
      if ('require_2fa' in result && result.require_2fa) {
        setTwoFactorMessage(result.message || 'A new verification code has been sent to your email.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setResendLoading(false);
    }
  };

  const twoFactorHint = useMemo(() => {
    if (!isTwoFactorStep) return null;
    return twoFactorMessage || 'Enter the 6-digit cryptographic verification code dispatched to your inbox.';
  }, [isTwoFactorStep, twoFactorMessage]);

  return (
    <AuthLayout
      type="login"
      title={isTwoFactorStep ? 'Dual-Factor Challenge' : 'Sign in to workspace.'}
      description={
        isTwoFactorStep
          ? 'Enter your authorization challenge code below.'
          : 'Access your centralized reputation intelligence and multi-platform telemetry.'
      }
    >
      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-sm flex items-start justify-between gap-3 text-rose-300 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="text-xs font-sans font-medium leading-relaxed">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-rose-200 transition-colors p-0.5"
            aria-label="Dismiss error"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 2FA Challenge Form */}
      {isTwoFactorStep ? (
        <form onSubmit={handleVerifyTwoFactor} className="space-y-6">
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-mono text-[10px] uppercase tracking-wider text-blue-400 font-semibold">
                  Identity Verification Protocol
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  {twoFactorHint}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-left">
            <div className="flex items-center justify-between">
              <label className="font-mono text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                6-Digit Security Token
              </label>
              <span className="font-mono text-[10px] text-slate-500">FORMAT: NUMERIC</span>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={otpCode}
                onChange={(e) => {
                  setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setFieldError('verificationCode', null);
                  setError(null);
                }}
                onBlur={() => validateSingleField('verificationCode')}
                className="w-full h-12 pl-10 pr-4 bg-slate-900/60 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-sm text-center font-mono text-lg tracking-[0.5em] text-white placeholder:text-slate-600 outline-none transition-colors"
                required
                maxLength={6}
                autoFocus
              />
            </div>
            {fieldErrors.verificationCode && (
              <p className="font-mono text-xs text-rose-400 mt-1">{fieldErrors.verificationCode}</p>
            )}
          </div>

          <div className="flex items-center justify-between pt-1 font-mono text-xs">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resendLoading}
              className="text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider disabled:opacity-50"
            >
              {resendLoading ? 'DISPATCHING...' : 'RESEND CODE'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsTwoFactorStep(false);
                setOtpCode('');
                setTwoFactorMessage(null);
                setSearchParams({});
              }}
              className="text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-wider"
            >
              BACK TO LOGIN
            </button>
          </div>

          <button
            type="submit"
            disabled={otpCode.length !== 6 || loading}
            className="w-full h-11 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none text-white rounded-sm font-mono text-xs uppercase tracking-widest font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                VERIFYING TOKEN...
              </span>
            ) : (
              <>
                AUTHENTICATE & ENTER
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      ) : (
        /* Standard Login Form */
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Work Email Field */}
          <div className="space-y-1.5 text-left">
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Work Email Address
            </label>
            <div className="relative group">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              <input
                type="email"
                placeholder="operator@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldError('email', null);
                  setError(null);
                }}
                onBlur={() => validateSingleField('email')}
                className="w-full h-11 pl-10 pr-4 bg-slate-900/60 border border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:bg-slate-900 rounded-sm text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-all font-sans"
                required
                autoComplete="email"
              />
            </div>
            {fieldErrors.email && (
              <p className="font-mono text-xs text-rose-400 mt-1">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1.5 text-left">
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Password
            </label>
            <div className="relative group">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldError('password', null);
                  setError(null);
                }}
                onBlur={() => validateSingleField('password')}
                className="w-full h-11 pl-10 pr-10 bg-slate-900/60 border border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:bg-slate-900 rounded-sm text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-all font-sans"
                required
                autoComplete="current-password"
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
            {fieldErrors.password && (
              <p className="font-mono text-xs text-rose-400 mt-1">{fieldErrors.password}</p>
            )}
          </div>

          {/* Row: Remember Me & Forgot Password (Strict Space-Between) */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 rounded-none border border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 focus:ring-offset-0 accent-blue-600 cursor-pointer"
              />
              <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors font-sans">
                Keep me signed in
              </span>
            </label>
            <Link
              to="/forgot-password"
              state={{ loginEmail: email }}
              className="font-mono text-[11px] text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider"
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit Button (44px, Sharp, Editorial) */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-sm font-mono text-xs uppercase tracking-widest font-semibold transition-colors flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                AUTHENTICATING...
              </span>
            ) : (
              <>
                SIGN IN TO DASHBOARD
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#020617] px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                OR CONTINUE WITH
              </span>
            </div>
          </div>

          {/* Google Workspace Button (44px, Minimal 1px Border) */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full h-11 flex items-center justify-center gap-3 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-sm font-mono text-xs uppercase tracking-wider text-slate-200 hover:text-white transition-all duration-150 cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
              <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" />
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
            </svg>
            Google Workspace
          </button>

          {/* Registration Subline */}
          <div className="text-center pt-3">
            <span className="text-xs text-slate-500 font-sans">New to system? </span>
            <Link
              to="/signup"
              className="font-mono text-xs uppercase tracking-wider text-blue-400 hover:text-blue-300 transition-colors font-semibold ml-1 underline decoration-blue-500/30 underline-offset-4"
            >
              Create Account
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};

export default LoginPage;
