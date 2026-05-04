import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthLayout } from '../components/shared/AuthLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
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
        window.location.href = destination;   // Admin → External admin-frontend
        return;
      }
      navigate(destination);   // User → Internal /dashboard
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
      const result = await auth.login(normalized.email, normalized.password);

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
        role: result.user.role || (result.user.roles && result.user.roles[0])
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
      setLoading(false);   // loading state is reset regarless wheather the operation success or fail
    }
  };

  const handleGoogleLogin = () => {
    // Open backend Google OAuth flow (backend will redirect to Google)
    const apiBase = getApiBaseUrl();
    window.location.href = `${apiBase}/api/auth/login/google`;
  };

  const handleVerifyTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await auth.verifyLogin2fa(email, otpCode);
      const userStr = JSON.stringify({
        user_id: result.user.user_id,
        email: result.user.email,
        full_name: result.user.full_name || result.user.name || result.user.first_name || 'User',
        role: result.user.role || (result.user.roles && result.user.roles[0])
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
      const result = await auth.login(email, password);
      if ('require_2fa' in result && result.require_2fa) {
        setTwoFactorMessage(result.message || 'A new verification code has been sent to your email.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setResendLoading(false);
    }
  };

  const twoFactorHint = useMemo(() => {   // generate message for OTP screen
    if (!isTwoFactorStep) return null;
    return twoFactorMessage || 'Enter the 6-digit code sent to your email.';
  }, [isTwoFactorStep, twoFactorMessage]);


  return (
    <AuthLayout
      title="Welcome Back"
      description="Enter your credentials to access your account"
    >
      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-xl flex items-center justify-between mb-6 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500" />
            <span className="text-sm font-bold text-rose-700">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-500 hover:text-rose-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/*when enable 2FA*/ }
      <form onSubmit={isTwoFactorStep ? handleVerifyTwoFactor : handleSubmit} className="space-y-5">
        {isTwoFactorStep && (
          <div className="rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/80 dark:bg-blue-900/20 p-4 mb-6 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-black text-blue-900 dark:text-blue-200 uppercase tracking-wide">Two-Factor Authentication</p>
                <p className="text-sm text-blue-800 dark:text-blue-100 mt-1">{twoFactorHint}</p>
              </div>
            </div>
          </div>
        )}

        {isTwoFactorStep ? (
          <div className="space-y-1.5">
            <label className="text-[13px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider ml-1">
              Verification Code
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-colors group-focus-within:text-blue-500" />
              <Input
                type="text"
                inputMode="numeric"
                placeholder="123456"
                value={otpCode}
                onChange={(e) => {
                  setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setFieldError('verificationCode', null);
                  setError(null);
                }}
                onBlur={() => validateSingleField('verificationCode')}
                className="pl-11 tracking-[0.4em] text-center"
                required
                maxLength={6}
              />
            </div>
            {fieldErrors.verificationCode && <p className="text-xs text-rose-500 ml-1">{fieldErrors.verificationCode}</p>}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendLoading}
                className="text-sm font-bold text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                {resendLoading ? 'Resending...' : 'Resend Code'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsTwoFactorStep(false);
                  setOtpCode('');
                  setTwoFactorMessage(null);
                  setSearchParams({});
                }}
                className="text-sm font-bold text-gray-500 hover:text-gray-300"
              >
                Back to login
              </button>
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-sm uppercase tracking-widest mt-2"
              isLoading={loading}
              disabled={otpCode.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </Button>
          </div>
        ) : (
        <>
        <div className="space-y-1.5">
          <label className="text-[13px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider ml-1">
            Email Address
          </label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-colors group-focus-within:text-blue-500" />
            <Input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldError('email', null);
                setError(null);
              }}
              onBlur={() => validateSingleField('email')}
              className="pl-11"
              required
            />
          </div>
          {fieldErrors.email && <p className="text-xs text-rose-500 ml-1">{fieldErrors.email}</p>}
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center px-1">
            <label className="text-[13px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-[12px] font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Forgot?
            </Link>
          </div>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-colors group-focus-within:text-blue-500" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldError('password', null);
                setError(null);
              }}
              onBlur={() => validateSingleField('password')}
              className="px-11"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {fieldErrors.password && <p className="text-xs text-rose-500 ml-1">{fieldErrors.password}</p>}
        </div>

        <div className="flex items-center gap-3 px-1">
          <div className="relative flex items-center">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
            />
          </div>
          <label htmlFor="remember" className="text-sm font-bold text-gray-600 dark:text-gray-400 cursor-pointer select-none">
            Keep me signed in
          </label>
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-sm uppercase tracking-widest"
          isLoading={loading}
        >
          {loading ? 'Authenticating...' : isTwoFactorStep ? 'Verify Code' : 'Sign In To Dashboard'}
        </Button>
        </>

        )}

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100 dark:border-slate-800"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white dark:bg-slate-800 px-4 text-[12px] font-black text-gray-400 uppercase tracking-[0.2em]">
              Or continue with
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full h-12 flex items-center justify-center gap-3 bg-white dark:bg-slate-700 border-2 border-gray-100 dark:border-slate-600 rounded-xl font-bold text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-600 transition-all active:scale-[0.98]"
        >
          <svg width="20" height="20" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" />
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
          </svg>
          Google Workspace
        </button>

        <p className="text-center mt-8">
          <span className="text-gray-500 font-medium">New to system? </span>
          <Link
            to="/signup"
            className="text-blue-600 font-black hover:text-blue-700 transition-colors uppercase text-sm tracking-tight"
          >
            Create Account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
