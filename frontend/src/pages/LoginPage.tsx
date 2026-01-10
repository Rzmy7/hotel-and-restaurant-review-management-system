import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login attempt:', { email, password, rememberMe });
    navigate('/dashboard');
  };

  const handleGoogleLogin = () => {
    console.log('Google login');
  };

  const handleFacebookLogin = () => {
    console.log('Facebook login');
  };

  const styles = {
    pageWrapper: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
    },
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#e5e7eb',
      padding: '20px',
    },
    loginCard: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      padding: '48px 40px',
      width: '100%',
      maxWidth: '400px',
    },
    title: {
      fontSize: '28px',
      fontWeight: 600,
      color: '#1f2937',
      textAlign: 'center' as const,
      marginBottom: '32px',
    },
    formGroup: {
      marginBottom: '20px',
    },
    label: {
      display: 'block',
      fontSize: '13px',
      fontWeight: 500,
      color: '#374151',
      marginBottom: '6px',
    },
    inputWrapper: {
      position: 'relative' as const,
      display: 'flex',
      alignItems: 'center',
    },
    icon: {
      position: 'absolute' as const,
      left: '14px',
      color: '#9ca3af',
      width: '16px',
      height: '16px',
    },
    input: {
      width: '100%',
      padding: '10px 14px 10px 40px',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      fontSize: '14px',
      outline: 'none',
      transition: 'border-color 0.2s',
      backgroundColor: '#f9fafb',
    },
    passwordInput: {
      width: '100%',
      padding: '10px 40px 10px 40px',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      fontSize: '14px',
      outline: 'none',
      transition: 'border-color 0.2s',
      backgroundColor: '#f9fafb',
    },
    eyeIcon: {
      position: 'absolute' as const,
      right: '14px',
      color: '#9ca3af',
      cursor: 'pointer',
      width: '16px',
      height: '16px',
    },
    rememberRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      marginTop: '16px',
    },
    rememberMe: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    checkbox: {
      width: '15px',
      height: '15px',
      cursor: 'pointer',
      accentColor: '#0284c7',
    },
    checkboxLabel: {
      fontSize: '13px',
      color: '#4b5563',
      cursor: 'pointer',
      userSelect: 'none' as const,
    },
    forgotPassword: {
      fontSize: '13px',
      color: '#0284c7',
      textDecoration: 'none',
      cursor: 'pointer',
    },
    signInButton: {
      width: '100%',
      padding: '11px',
      backgroundColor: '#0284c7',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
      marginBottom: '20px',
      transition: 'background-color 0.2s',
    },
    signUpText: {
      textAlign: 'center' as const,
      fontSize: '13px',
      color: '#6b7280',
      marginBottom: '20px',
    },
    signUpLink: {
      color: '#0284c7',
      textDecoration: 'none',
      fontWeight: 500,
      cursor: 'pointer',
      marginLeft: '4px',
    },
    divider: {
      textAlign: 'center' as const,
      fontSize: '13px',
      color: '#9ca3af',
      marginBottom: '20px',
      position: 'relative' as const,
    },
    socialButtons: {
      display: 'flex',
      gap: '12px',
    },
    socialButton: {
      flex: 1,
      padding: '10px 16px',
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: 500,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      transition: 'background-color 0.2s, border-color 0.2s',
      color: '#374151',
    },
  };

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.container}>
        <div style={styles.loginCard}>
          <h1 style={styles.title}>Login</h1>

          <form onSubmit={handleSubmit}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Email</label>
              <div style={styles.inputWrapper}>
                <Mail style={styles.icon} />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrapper}>
                <Lock style={styles.icon} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.passwordInput}
                  required
                />
                {showPassword ? (
                  <EyeOff
                    style={styles.eyeIcon}
                    onClick={() => setShowPassword(false)}
                  />
                ) : (
                  <Eye
                    style={styles.eyeIcon}
                    onClick={() => setShowPassword(true)}
                  />
                )}
              </div>
            </div>

            <div style={styles.rememberRow}>
              <label style={styles.rememberMe}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={styles.checkbox}
                />
                <span style={styles.checkboxLabel}>Remember me</span>
              </label>
              <a href="/forgot-password" style={styles.forgotPassword}>
                Forgot password?
              </a>
            </div>

            <button type="submit" style={styles.signInButton}>
              Sign In
            </button>
          </form>

          <p style={styles.signUpText}>
            Don't have an account?
            <a href="/signup" style={styles.signUpLink}>
              Sign up
            </a>
          </p>

          <div style={styles.divider}>Or continue with</div>

          <div style={styles.socialButtons}>
            <button
              type="button"
              style={styles.socialButton}
              onClick={handleGoogleLogin}
            >
              <svg width="16" height="16" viewBox="0 0 18 18">
                <path
                  fill="#4285F4"
                  d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
                />
                <path
                  fill="#34A853"
                  d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
                />
                <path
                  fill="#FBBC05"
                  d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"
                />
                <path
                  fill="#EA4335"
                  d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                />
              </svg>
              Google
            </button>
            <button
              type="button"
              style={styles.socialButton}
              onClick={handleFacebookLogin}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;