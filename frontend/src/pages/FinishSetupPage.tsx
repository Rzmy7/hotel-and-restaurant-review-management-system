import { CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SetupLayout from '../components/SetupLayout';

const FinishSetupPage = () => {
  const navigate = useNavigate();

  const handleContinue = () => {
    navigate('/dashboard');
  };

  const handleBack = () => {
    navigate('/setup/schedule');
  };

  const styles = {
    content: {
      textAlign: 'center' as const,
      padding: '40px 0',
    },
    iconWrapper: {
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      backgroundColor: '#d1fae5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 30px',
    },
    title: {
      fontSize: '32px',
      fontWeight: 600,
      color: '#1f2937',
      marginBottom: '16px',
    },
    description: {
      fontSize: '16px',
      color: '#6b7280',
      marginBottom: '40px',
      lineHeight: '1.6',
    },
    summaryBox: {
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      padding: '24px',
      textAlign: 'left' as const,
      marginTop: '30px',
    },
    summaryTitle: {
      fontSize: '16px',
      fontWeight: 600,
      color: '#1f2937',
      marginBottom: '16px',
    },
    summaryItem: {
      fontSize: '14px',
      color: '#6b7280',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    dot: {
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      backgroundColor: '#3b82f6',
    },
  };

  return (
    <SetupLayout
      currentStep={4}
      onContinue={handleContinue}
      onBack={handleBack}
    >
      <div style={styles.content}>
        <div style={styles.iconWrapper}>
          <CheckCircle2 size={48} color="#10b981" strokeWidth={2} />
        </div>

        <h1 style={styles.title}>Setup Complete!</h1>
        <p style={styles.description}>
          Your organization has been successfully configured.<br />
          You can now start monitoring your reviews and insights.
        </p>

        <div style={styles.summaryBox}>
          <div style={styles.summaryTitle}>What's Next?</div>
          <div style={styles.summaryItem}>
            <div style={styles.dot} />
            <span>View your dashboard and analytics</span>
          </div>
          <div style={styles.summaryItem}>
            <div style={styles.dot} />
            <span>Monitor reviews from all connected sources</span>
          </div>
          <div style={styles.summaryItem}>
            <div style={styles.dot} />
            <span>Get AI-powered insights and recommendations</span>
          </div>
          <div style={styles.summaryItem}>
            <div style={styles.dot} />
            <span>Manage your team and settings</span>
          </div>
        </div>
      </div>
    </SetupLayout>
  );
};

export default FinishSetupPage;
