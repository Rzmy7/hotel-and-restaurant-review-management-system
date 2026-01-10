import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SetupLayout from '../components/SetupLayout';

interface ReviewSource {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
}

const AddSourcesPage = () => {
  const navigate = useNavigate();
  const [customSourceUrl, setCustomSourceUrl] = useState('');
  const [sources, setSources] = useState<ReviewSource[]>([
    { id: '1', name: 'Google Reviews', icon: 'G', connected: false },
    { id: '2', name: 'Booking.com', icon: 'G', connected: false },
    { id: '3', name: 'Google Reviews', icon: 'G', connected: true },
    { id: '4', name: 'Booking.com', icon: 'G', connected: false },
    { id: '5', name: 'Google Reviews', icon: 'G', connected: false },
    { id: '6', name: 'Trip Advisor', icon: 'G', connected: false },
  ]);

  const handleContinue = () => {
    navigate('/setup/schedule');
  };

  const handleBack = () => {
    navigate('/setup');
  };

  const handleConnect = (sourceId: string) => {
    setSources(sources.map(source =>
      source.id === sourceId ? { ...source, connected: !source.connected } : source
    ));
  };

  const handleConnectCustomSource = () => {
    if (customSourceUrl.trim()) {
      console.log('Connecting custom source:', customSourceUrl);
      alert('Custom source connection feature coming soon!');
    }
  };

  const styles = {
    title: {
      fontSize: '28px',
      fontWeight: 600,
      color: '#1f2937',
      textAlign: 'center' as const,
      marginBottom: '40px',
    },
    sourcesGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '16px',
      marginBottom: '30px',
    },
    sourceCard: {
      border: '2px dashed #cbd5e1',
      borderRadius: '8px',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#ffffff',
      transition: 'border-color 0.2s',
    },
    sourceCardConnected: {
      border: '2px solid #cbd5e1',
      backgroundColor: '#f8fafc',
    },
    sourceInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    sourceIcon: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      backgroundColor: '#e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '18px',
      fontWeight: 600,
      color: '#6b7280',
    },
    sourceName: {
      fontSize: '14px',
      fontWeight: 500,
      color: '#1f2937',
    },
    addButton: {
      padding: '6px 20px',
      backgroundColor: '#e5e7eb',
      color: '#374151',
      border: 'none',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    },
    connectedButton: {
      padding: '6px 16px',
      backgroundColor: '#1f2937',
      color: 'white',
      border: 'none',
      borderRadius: '50px',
      fontSize: '13px',
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      cursor: 'pointer',
    },
    customSourceSection: {
      marginTop: '30px',
      paddingTop: '30px',
      borderTop: '1px solid #e5e7eb',
    },
    sectionTitle: {
      fontSize: '15px',
      fontWeight: 600,
      color: '#1f2937',
      textAlign: 'center' as const,
      marginBottom: '6px',
    },
    sectionSubtitle: {
      fontSize: '13px',
      color: '#6b7280',
      textAlign: 'center' as const,
      marginBottom: '20px',
    },
    customSourceInput: {
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
    },
    urlInput: {
      flex: 1,
      padding: '12px 16px',
      border: '2px dashed #cbd5e1',
      borderRadius: '8px',
      fontSize: '13px',
      outline: 'none',
      color: '#6b7280',
      backgroundColor: '#ffffff',
    },
    connectButton: {
      padding: '12px 32px',
      backgroundColor: '#e5e7eb',
      color: '#374151',
      border: 'none',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: 500,
      cursor: 'pointer',
      whiteSpace: 'nowrap' as const,
      transition: 'background-color 0.2s',
    },
  };

  return (
    <SetupLayout
      currentStep={2}
      onContinue={handleContinue}
      onBack={handleBack}
    >
      <h1 style={styles.title}>Connect your Review Sources</h1>

      <div style={styles.sourcesGrid}>
        {sources.map((source) => (
          <div
            key={source.id}
            style={{
              ...styles.sourceCard,
              ...(source.connected ? styles.sourceCardConnected : {}),
            }}
          >
            <div style={styles.sourceInfo}>
              <div style={styles.sourceIcon}>{source.icon}</div>
              <div style={styles.sourceName}>{source.name}</div>
            </div>
            {source.connected ? (
              <button
                style={styles.connectedButton}
                onClick={() => handleConnect(source.id)}
              >
                Connected
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 6L9 17L4 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ) : (
              <button
                style={styles.addButton}
                onClick={() => handleConnect(source.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#d1d5db';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                }}
              >
                Add
              </button>
            )}
          </div>
        ))}
      </div>

      <div style={styles.customSourceSection}>
        <div style={styles.sectionTitle}>Don't you see your source ?</div>
        <div style={styles.sectionSubtitle}>
          Manually add a source by providing the URL to the review page
        </div>
        <div style={styles.customSourceInput}>
          <input
            type="text"
            placeholder="https://www.booking.com/hotel/us/westin-beach-resort-cosmo.html"
            value={customSourceUrl}
            onChange={(e) => setCustomSourceUrl(e.target.value)}
            style={styles.urlInput}
          />
          <button
            style={styles.connectButton}
            onClick={handleConnectCustomSource}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#d1d5db';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e7eb';
            }}
          >
            Connect
          </button>
        </div>
      </div>
    </SetupLayout>
  );
};

export default AddSourcesPage;
