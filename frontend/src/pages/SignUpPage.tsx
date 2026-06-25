import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthLayout } from '../components/shared/AuthLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
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

      const user = await auth.signup(normalized.fullName, normalized.email, normalized.password);
      const destination = getDashboardPathForRole(user.role);
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

  const handleGoogleLogin = () => {
    // Open backend Google OAuth flow (backend will redirect to Google)
    const apiBase = getApiBaseUrl();
    window.location.href = `${apiBase}/api/auth/login/google`;
  };

  return (
    <AuthLayout 
      type="signup"
      title="Create Your Workspace" 
      description="Start your 14-day free trial. No credit card required."
    >
      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-xl flex items-center gap-3 mb-6 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 text-rose-500" />
          <span className="text-sm font-bold text-rose-700">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[13px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider ml-1">
            Full Name
          </label>
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-colors group-focus-within:text-blue-500" />
            <Input
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setFieldError('fullName', null);
                setError(null);
              }}
              onBlur={() => validateSingleField('fullName')}
              className="pl-11"
              required
            />
          </div>
          {fieldErrors.fullName && <p className="text-xs text-rose-500 ml-1">{fieldErrors.fullName}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-[12px] font-bold text-slate-400 uppercase tracking-wider ml-1">
            Work Email
          </label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 transition-colors group-focus-within:text-blue-500" />
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-slate-400 uppercase tracking-wider ml-1">
              Password
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 transition-colors group-focus-within:text-blue-500" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldError('password', null);
                  setFieldError('confirmPassword', null);
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
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.password && <p className="text-xs text-rose-500 ml-1">{fieldErrors.password}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-slate-400 uppercase tracking-wider ml-1">
              Confirm
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 transition-colors group-focus-within:text-blue-500" />
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setFieldError('confirmPassword', null);
                  setError(null);
                }}
                onBlur={() => validateSingleField('confirmPassword')}
                className="px-11"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.confirmPassword && <p className="text-xs text-rose-500 ml-1">{fieldErrors.confirmPassword}</p>}
          </div>
        </div>

        <div className="flex items-start gap-3 py-2 px-1">
          <div className="relative flex items-center mt-0.5">
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
              className="w-4 h-4 rounded border-slate-700 bg-[#0B1021] text-blue-600 focus:ring-blue-500/20 accent-blue-600 cursor-pointer"
            />
          </div>
          <label htmlFor="terms" className="text-[12px] font-medium text-gray-500 dark:text-gray-400 leading-snug cursor-pointer select-none">
            I agree to the <Link to="/terms" className="text-blue-600 font-bold hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-blue-600 font-bold hover:underline">Privacy Policy</Link>
          </label>
        </div>
        {fieldErrors.acceptedTerms && <p className="text-xs text-rose-500 ml-1">{fieldErrors.acceptedTerms}</p>}

        <Button
          type="submit"
          className="w-full h-12 text-sm uppercase tracking-widest mt-4"
          isLoading={loading}
        >
          {loading ? 'Creating Account...' : 'Get Started Now'}
        </Button>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100 dark:border-slate-800"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white dark:bg-slate-800 px-4 text-[12px] font-black text-gray-400 uppercase tracking-[0.2em]">
              Or join with
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

        <p className="text-center mt-6">
          <span className="text-gray-500 font-medium text-sm">Already a member? </span>
          <Link 
            to="/login" 
            className="text-blue-600 font-black hover:text-blue-700 transition-colors uppercase text-sm tracking-tight"
          >
            Sign In
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default SignUpPage;