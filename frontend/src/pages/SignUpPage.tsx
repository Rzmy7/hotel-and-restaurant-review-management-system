import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthLayout } from '../components/shared/AuthLayout';
import { getDashboardPathForRole, isExternalDestination } from '../utils/authRole';
import { getApiBaseUrl } from '../config/api';
import {
  mapBackendSignupErrorToField,
  normalizeSignupPayload,
  type SignupField,
  type SignupFieldErrors,
  validateConfirmPassword,
  validateEmailAddress,
  validateFullName,
  validatePassword,
  validateSignupForm,
} from '../validators/signupValidator';

const SignUpPage = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<SignupFieldErrors>({});

  const [isVerificationStep, setIsVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [signupToken, setSignupToken] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const auth = useAuth();

  useEffect(() => {
    if (!auth.user) return;
    const destination = getDashboardPathForRole(auth.user.role);
    if (isExternalDestination(destination)) {
      window.location.href = destination;
      return;
    }
    navigate(destination);
  }, [auth.user, navigate]);

  // Password Strength Calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: 'NONE', color: 'bg-slate-700' };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: 'WEAK', color: 'bg-rose-500' };
      case 2:
        return { score: 2, label: 'FAIR', color: 'bg-amber-500' };
      case 3:
        return { score: 3, label: 'STRONG', color: 'bg-emerald-500' };
      case 4:
        return { score: 4, label: 'OPTIMAL', color: 'bg-emerald-400' };
      default:
        return { score: 0, label: 'NONE', color: 'bg-slate-700' };
    }
  }, [password]);

  const setFieldError = (field: SignupField, message: string | null) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (message) {
        next[field] = message;
      } else {
        delete next[field];
      }
      return next;
    });
  };

  const validateSingleField = (field: SignupField, value?: string | boolean) => {
    switch (field) {
      case 'fullName':
        return setFieldError('fullName', validateFullName(String(value ?? fullName)));
      case 'email':
        return setFieldError('email', validateEmailAddress(String(value ?? email)));
      case 'password':
        return setFieldError('password', validatePassword(String(value ?? password)));
      case 'confirmPassword':
        return setFieldError('confirmPassword', validateConfirmPassword(password, String(value ?? confirmPassword)));
      case 'acceptedTerms':
        return setFieldError('acceptedTerms', (value ?? acceptedTerms) ? null : 'Please accept the Terms of Service and Privacy Policy.');
      default:
        return undefined;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateSignupForm({
      fullName,
      email,
      password,
      confirmPassword,
      acceptedTerms,
    });

    setFieldErrors(validationErrors);
    const firstError = Object.values(validationErrors)[0];
    if (firstError) {
      setError(firstError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const normalized = normalizeSignupPayload({
        fullName,
        email,
        password,
        confirmPassword,
        acceptedTerms,
      });

      const response = await auth.signup(normalized.fullName, normalized.email, normalized.password);
      if (response && response.require_verification) {
        setSignupToken(response.signup_token);
        setVerificationMessage(response.message || 'A verification code has been sent to your email.');
        setIsVerificationStep(true);
        return;
      }

      const destination = getDashboardPathForRole(response.role);
      if (isExternalDestination(destination)) {
        window.location.href = destination;
        return;
      }
      navigate(destination);
    } catch (err: any) {
      const backendMessage = err.message || 'Signup failed';
      const mappedErrors = mapBackendSignupErrorToField(backendMessage);
      if (Object.keys(mappedErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...mappedErrors }));
      }
      setError(backendMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.length !== 6) return;

    setLoading(true);
    setError(null);
    try {
      const user = await auth.verifySignup(signupToken, verificationCode);
      const destination = getDashboardPathForRole(user.role);
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
    try {
      const normalized = normalizeSignupPayload({
        fullName,
        email,
        password,
        confirmPassword,
        acceptedTerms,
      });
      const response = await auth.signup(normalized.fullName, normalized.email, normalized.password);
      if (response && response.require_verification) {
        setSignupToken(response.signup_token);
        setVerificationMessage('A new verification code has been sent to your email.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const apiBase = getApiBaseUrl();
    window.location.href = `${apiBase}/api/auth/login/google`;
  };

  return (
    <AuthLayout
      type="signup"
      title={isVerificationStep ? 'Confirm Identity.' : 'Create workspace.'}
      description={
        isVerificationStep
          ? 'Enter the 6-digit confirmation code sent to your email.'
          : 'Initialize your 14-day enterprise trial. Zero payment details required.'
      }
    >
      {/* Global Error Banner */}
      {error && (
        <div className="mb-6 p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-sm flex items-start gap-2.5 text-rose-300 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span className="text-xs font-sans font-medium leading-relaxed">{error}</span>
        </div>
      )}

      {/* Verification Step */}
      {isVerificationStep ? (
        <form onSubmit={handleVerifyEmail} className="space-y-6">
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-mono text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">
                  Verification Code Dispatched
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  {verificationMessage || 'A 6-digit activation token has been dispatched to your email.'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-left">
            <div className="flex items-center justify-between">
              <label className="font-mono text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Activation Code
              </label>
              <span className="font-mono text-[10px] text-slate-500">6 DIGITS</span>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setError(null);
                }}
                className="w-full h-12 pl-10 pr-4 bg-slate-900/60 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-sm text-center font-mono text-lg tracking-[0.5em] text-white placeholder:text-slate-600 outline-none transition-colors"
                required
                maxLength={6}
                autoFocus
              />
            </div>
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
                setIsVerificationStep(false);
                setVerificationCode('');
                setVerificationMessage(null);
              }}
              className="text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-wider"
            >
              BACK TO SIGNUP
            </button>
          </div>

          <button
            type="submit"
            disabled={verificationCode.length !== 6 || loading}
            className="w-full h-11 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none text-white rounded-sm font-mono text-xs uppercase tracking-widest font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                VERIFYING TOKEN...
              </span>
            ) : (
              <>
                VERIFY & ACTIVATE WORKSPACE
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      ) : (
        /* Standard Signup Form */
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1 text-left">
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Full Name
            </label>
            <div className="relative group">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              <input
                type="text"
                placeholder="Eleanor Vance"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setFieldError('fullName', null);
                  setError(null);
                }}
                onBlur={() => validateSingleField('fullName')}
                className="w-full h-11 pl-10 pr-4 bg-slate-900/60 border border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:bg-slate-900 rounded-sm text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-all font-sans"
                required
                autoComplete="name"
              />
            </div>
            {fieldErrors.fullName && (
              <p className="font-mono text-xs text-rose-400 mt-1">{fieldErrors.fullName}</p>
            )}
          </div>

          {/* Work Email */}
          <div className="space-y-1 text-left">
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Work Email Address
            </label>
            <div className="relative group">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              <input
                type="email"
                placeholder="eleanor@grandhotel.com"
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

          {/* Password & Confirm Password Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            {/* Password */}
            <div className="space-y-1">
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
                    setFieldError('confirmPassword', null);
                    setError(null);
                  }}
                  onBlur={() => validateSingleField('password')}
                  className="w-full h-11 pl-10 pr-10 bg-slate-900/60 border border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:bg-slate-900 rounded-sm text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-all font-sans"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="font-mono text-xs text-rose-400 mt-1">{fieldErrors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Confirm
              </label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setFieldError('confirmPassword', null);
                    setError(null);
                  }}
                  onBlur={() => validateSingleField('confirmPassword')}
                  className="w-full h-11 pl-10 pr-10 bg-slate-900/60 border border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:bg-slate-900 rounded-sm text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-all font-sans"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="font-mono text-xs text-rose-400 mt-1">{fieldErrors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Password Strength Indicator */}
          {password && (
            <div className="pt-1 text-left space-y-1.5 animate-in fade-in">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-slate-400">
                <span>SECURITY LEVEL</span>
                <span className={passwordStrength.score >= 3 ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                  {passwordStrength.label}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 h-1">
                {[1, 2, 3, 4].map((seg) => (
                  <div
                    key={seg}
                    className={`h-full rounded-none transition-colors duration-200 ${
                      seg <= passwordStrength.score ? passwordStrength.color : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Terms & Privacy Agreement */}
          <div className="pt-2 text-left">
            <label className="flex items-start gap-2.5 cursor-pointer select-none group">
              <input
                type="checkbox"
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => {
                  setAcceptedTerms(e.target.checked);
                  setFieldError('acceptedTerms', null);
                  setError(null);
                }}
                onBlur={() => validateSingleField('acceptedTerms')}
                className="w-3.5 h-3.5 mt-0.5 rounded-none border border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 focus:ring-offset-0 accent-blue-600 cursor-pointer shrink-0"
              />
              <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors font-sans leading-snug">
                I agree to the{' '}
                <Link to="/terms" className="text-slate-200 underline decoration-slate-600 hover:text-white">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-slate-200 underline decoration-slate-600 hover:text-white">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            {fieldErrors.acceptedTerms && (
              <p className="font-mono text-xs text-rose-400 mt-1">{fieldErrors.acceptedTerms}</p>
            )}
          </div>

          {/* Submit Button (44px) */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-sm font-mono text-xs uppercase tracking-widest font-semibold transition-colors flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                INITIALIZING WORKSPACE...
              </span>
            ) : (
              <>
                INITIALIZE WORKSPACE
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#020617] px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                OR REGISTER WITH
              </span>
            </div>
          </div>

          {/* Google Workspace (44px) */}
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

          {/* Login Link */}
          <div className="text-center pt-3">
            <span className="text-xs text-slate-500 font-sans">Already an operator? </span>
            <Link
              to="/login"
              className="font-mono text-xs uppercase tracking-wider text-blue-400 hover:text-blue-300 transition-colors font-semibold ml-1 underline decoration-blue-500/30 underline-offset-4"
            >
              Sign In
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};

export default SignUpPage;