import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ForgotPasswordPage = () => {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await forgotPassword(email);
      setMessage('Password reset link sent. Please check your email.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f3f4f6', padding: 16 }}>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 420, background: '#fff', padding: 24, borderRadius: 10, border: '1px solid #e5e7eb' }}>
        <h1 style={{ marginTop: 0, marginBottom: 8 }}>Forgot Password</h1>
        <p style={{ marginTop: 0, marginBottom: 16, color: '#6b7280' }}>Enter your account email to receive a reset link.</p>

        <label htmlFor="email" style={{ display: 'block', marginBottom: 6 }}>Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: 10, marginBottom: 12, border: '1px solid #d1d5db', borderRadius: 8 }}
        />

        {message && <p style={{ color: '#065f46', marginBottom: 12 }}>{message}</p>}
        {error && <p style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: '#0284c7', color: '#fff' }}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>

        <p style={{ marginBottom: 0, marginTop: 12 }}>
          <Link to="/login">Back to login</Link>
        </p>
      </form>
    </div>
  );
};

export default ForgotPasswordPage;
