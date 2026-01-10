import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react';

const SignUpPage = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accountType, setAccountType] = useState<'tenant' | 'observer'>('tenant');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    if (!acceptedTerms) {
      alert('Please accept the Terms of Service and Privacy Policy');
      return;
    }
    console.log('Sign up attempt:', { fullName, email, password, accountType });
    navigate('/setup');
  };

  const styles = {
    pageWrapper: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      overflow: 'auto',
    },
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#e5e7eb',
      padding: '40px 20px',
    },
    signupCard: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      padding: '40px',
      width: '100%',
      maxWidth: '480px',
      margin: 'auto',
    },
    title: {
      fontSize: '28px',
      fontWeight: 600,
      color: '#1f2937',
      textAlign: 'center' as const,
      marginBottom: '8px',
    },
    subtitle: {
      fontSize: '14px',
      color: '#6b7280',
      textAlign: 'center' as const,
      marginBottom: '28px',
    },
    formGroup: {
      marginBottom: '18px',
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
      boxSizing: 'border-box' as const,
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
      boxSizing: 'border-box' as const,
    },
    eyeIcon: {
      position: 'absolute' as const,
      right: '14px',
      color: '#9ca3af',
      cursor: 'pointer',
      width: '16px',
      height: '16px',
    },
    accountTypeLabel: {
      display: 'block',
      fontSize: '13px',
      fontWeight: 600,
      color: '#374151',
      marginBottom: '10px',
    },
    accountTypeButtons: {
      display: 'flex',
      gap: '12px',
      marginBottom: '18px',
    },
    accountTypeButton: {
      flex: 1,
      padding: '10px',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.2s',
      backgroundColor: 'white',
      color: '#6b7280',
    },
    accountTypeButtonActive: {
      flex: 1,
      padding: '10px',
      border: '1px solid #0284c7',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.2s',
      backgroundColor: '#0284c7',
      color: 'white',
    },
    termsRow: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '8px',
      marginBottom: '20px',
    },
    checkbox: {
      width: '16px',
      height: '16px',
      cursor: 'pointer',
      accentColor: '#0284c7',
      flexShrink: 0,
      marginTop: '2px',
    },
    termsText: {
      fontSize: '13px',
      color: '#4b5563',
      lineHeight: '1.5',
    },
    termsLink: {
      color: '#0284c7',
      textDecoration: 'none',
    },
    createButton: {
      width: '100%',
      padding: '11px',
      backgroundColor: '#0284c7',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
      marginBottom: '16px',
      transition: 'background-color 0.2s',
    },
    loginText: {
      textAlign: 'center' as const,
      fontSize: '13px',
      color: '#6b7280',
    },
    loginLink: {
      color: '#0284c7',
      textDecoration: 'none',
      fontWeight: 500,
      cursor: 'pointer',
      marginLeft: '4px',
    },
  };

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.container}>
        <div style={styles.signupCard}>
          <h1 style={styles.title}>Sign up</h1>
          <p style={styles.subtitle}>Create Your Account</p>

          <form onSubmit={handleSubmit}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Full Name</label>
              <div style={styles.inputWrapper}>
                <User style={styles.icon} />
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
            </div>

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

            <div style={styles.formGroup}>
              <label style={styles.label}>Confirm Password</label>
              <div style={styles.inputWrapper}>
                <Lock style={styles.icon} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={styles.passwordInput}
                  required
                />
                {showConfirmPassword ? (
                  <EyeOff
                    style={styles.eyeIcon}
                    onClick={() => setShowConfirmPassword(false)}
                  />
                ) : (
                  <Eye
                    style={styles.eyeIcon}
                    onClick={() => setShowConfirmPassword(true)}
                  />
                )}
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={styles.accountTypeLabel}>Account Type</label>
              <div style={styles.accountTypeButtons}>
                <button
                  type="button"
                  style={accountType === 'tenant' ? styles.accountTypeButtonActive : styles.accountTypeButton}
                  onClick={() => setAccountType('tenant')}
                >
                  Tenant
                </button>
                <button
                  type="button"
                  style={accountType === 'observer' ? styles.accountTypeButtonActive : styles.accountTypeButton}
                  onClick={() => setAccountType('observer')}
                >
                  Group Observer
                </button>
              </div>
            </div>

            <div style={styles.termsRow}>
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                style={styles.checkbox}
              />
              <span style={styles.termsText}>
                I accept the{' '}
                <a href="/terms" style={styles.termsLink}>
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" style={styles.termsLink}>
                  Privacy Policy
                </a>
              </span>
            </div>

            <button type="submit" style={styles.createButton}>
              Create Account
            </button>
          </form>

          <p style={styles.loginText}>
            Already have an account?
            <a href="/login" style={styles.loginLink}>
              Login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;