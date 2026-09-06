import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthLayout } from '../components/shared/AuthLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

const ForgotPasswordPage = () => {
  const { forgotPassword } = useAuth();
  const location = useLocation();
  const loginEmail = location.state?.loginEmail as string | undefined;

  const [email, setEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    // Explicit check requested by user: email must match the one entered in login page
    if (loginEmail && email !== loginEmail) {
      setError("Please enter the correct login email.");
      setLoading(false);
      return;
    }

    try {
      await forgotPassword(email);
      setMessage('A password reset link has been sent to your email address.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Reset Password" 
      description="Enter your email to receive a recovery link"
    >
      {message && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-xl flex items-start gap-3 mb-6 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <span className="text-sm font-bold text-emerald-700 leading-snug">{message}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-xl flex items-center gap-3 mb-6 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 text-rose-500" />
          <span className="text-sm font-bold text-rose-700">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
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
              onChange={(e) => setEmail(e.target.value)}
              className="pl-11"
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-sm uppercase tracking-widest"
          isLoading={loading}
        >
          {loading ? 'Processing...' : 'Send Recovery Link'}
        </Button>

        <p className="text-center mt-8">
          <Link 
            to="/login" 
            className="text-gray-500 font-bold hover:text-blue-600 transition-colors uppercase text-[12px] tracking-widest inline-flex items-center gap-2"
          >
            Back to login
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
