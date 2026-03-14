import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SignUpPage = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accountType, setAccountType] = useState<'tenant' | 'observer'>('tenant');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const auth = useAuth();

  React.useEffect(() => {
    if (!auth.user) return;
    const setupComplete = localStorage.getItem('setupComplete') !== 'false';
    navigate(setupComplete ? '/dashboard' : '/setup');
  }, [auth.user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    if (!acceptedTerms) {
      alert('Please accept the Terms of Service and Privacy Policy');
      return;
    }

    setLoading(true);
    try {
      await auth.signup(fullName, email, password);
      // signup auto-signs in (AuthContext persists user)
      localStorage.setItem('setupComplete', 'false');
      navigate('/setup');
    } catch (err: any) {
      alert(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClasses =
    'w-full py-2.5 pl-10 pr-3.5 border border-gray-200 rounded-lg text-sm bg-gray-50 outline-none transition-colors box-border focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20';
  const passwordInputClasses =
    'w-full py-2.5 px-10 border border-gray-200 rounded-lg text-sm bg-gray-50 outline-none transition-colors box-border focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20';

  return (
    <div className="fixed inset-0 z-[9999] overflow-auto">
      <div className="min-h-full flex items-center justify-center bg-gray-200 py-10 px-5">
        <div className="bg-white rounded-xl shadow-sm p-10 w-full max-w-[480px] my-auto">
          <h1 className="text-[28px] font-semibold text-gray-800 text-center mb-2">Sign up</h1>
          <p className="text-sm text-gray-500 text-center mb-7">Create Your Account</p>

          <form onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="mb-[18px]">
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Full Name</label>
              <div className="relative flex items-center">
                <User size={16} className="absolute left-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputClasses}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="mb-[18px]">
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative flex items-center">
                <Mail size={16} className="absolute left-3.5 text-gray-400" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClasses}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="mb-[18px]">
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3.5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={passwordInputClasses}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3.5 text-gray-400 hover:text-gray-600 transition-colors bg-transparent border-none cursor-pointer p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="mb-[18px]">
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Confirm Password</label>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3.5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={passwordInputClasses}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3.5 text-gray-400 hover:text-gray-600 transition-colors bg-transparent border-none cursor-pointer p-0"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Account Type */}
            <div className="mb-[18px]">
              <label className="block text-[13px] font-semibold text-gray-700 mb-2.5">Account Type</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all border ${accountType === 'tenant'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                  onClick={() => setAccountType('tenant')}
                >
                  Tenant
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all border ${accountType === 'observer'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                  onClick={() => setAccountType('observer')}
                >
                  Group Observer
                </button>
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2 mb-5">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="w-4 h-4 cursor-pointer accent-blue-500 shrink-0 mt-0.5"
              />
              <span className="text-[13px] text-gray-600 leading-relaxed">
                I accept the{' '}
                <a href="/terms" className="text-blue-500 no-underline hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-blue-500 no-underline hover:underline">
                  Privacy Policy
                </a>
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-colors mb-4"
            >
              Create Account
            </button>
          </form>

          <p className="text-center text-[13px] text-gray-500">
            Already have an account?
            <a href="/login" className="text-blue-500 no-underline font-medium ml-1 hover:underline">
              Login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;