import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ResetPasswordPage = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const { resetPassword } = useAuth();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!token) {
            setError('Invalid reset link');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await resetPassword(token, password);
            navigate('/login');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f3f4f6', padding: 16 }}>
            <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 420, background: '#fff', padding: 24, borderRadius: 10, border: '1px solid #e5e7eb' }}>
                <h1 style={{ marginTop: 0, marginBottom: 8 }}>Reset Password</h1>
                <p style={{ marginTop: 0, marginBottom: 16, color: '#6b7280' }}>Choose a new password for your account.</p>

                <label htmlFor="newPassword" style={{ display: 'block', marginBottom: 6 }}>New Password</label>
                <input
                    id="newPassword"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ width: '100%', padding: 10, marginBottom: 12, border: '1px solid #d1d5db', borderRadius: 8 }}
                />

                <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: 6 }}>Confirm Password</label>
                <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={{ width: '100%', padding: 10, marginBottom: 12, border: '1px solid #d1d5db', borderRadius: 8 }}
                />

                {error && <p style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</p>}

                <button type="submit" disabled={loading} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: '#0284c7', color: '#fff' }}>
                    {loading ? 'Resetting...' : 'Reset Password'}
                </button>

                <p style={{ marginBottom: 0, marginTop: 12 }}>
                    <Link to="/login">Back to login</Link>
                </p>
            </form>
        </div>
    );
};

export default ResetPasswordPage;
