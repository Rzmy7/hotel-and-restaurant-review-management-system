import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Source {
  id: number;
  platform: string;
  status: 'Active' | 'Paused';
  lastSynced: string;
  schedule: string;
}

interface EditSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: Source | null;
  onSave: (source: Source) => void;
}

const EditSourceModal = ({ isOpen, onClose, source, onSave }: EditSourceModalProps) => {
  const [platform, setPlatform] = useState('');
  const [propertyUrl, setPropertyUrl] = useState('https://example.com/tripadvisor');
  const [apiKey, setApiKey] = useState('**********');
  const [schedule, setSchedule] = useState('Hourly');
  const [sourceStatus, setSourceStatus] = useState(false);

  useEffect(() => {
    if (source) {
      setPlatform(source.platform);
      setSchedule(source.schedule);
      setSourceStatus(source.status === 'Active');
    }
  }, [source]);

  if (!isOpen || !source) return null;

  const handleSave = () => {
    if (source) {
      const updatedSource = {
        ...source,
        platform,
        schedule,
        status: sourceStatus ? 'Active' as const : 'Paused' as const,
      };
      onSave(updatedSource);
      onClose();
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this source?')) {
      console.log('Deleting source:', source.id);
      onClose();
    }
  };

  const styles = {
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '12px',
      width: '100%',
      maxWidth: '800px',
      padding: '0',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      maxHeight: '90vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column' as const,
    },
    header: {
      padding: '20px 24px',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    headerLeft: {
      flex: 1,
    },
    title: {
      fontSize: '18px',
      fontWeight: 600,
      color: '#111827',
      margin: '0 0 4px 0',
    },
    subtitle: {
      fontSize: '14px',
      color: '#6b7280',
      margin: 0,
    },
    closeBtn: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '4px',
      color: '#6b7280',
      display: 'flex',
      alignItems: 'center',
      borderRadius: '4px',
    },
    body: {
      padding: '24px',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '32px',
      overflowY: 'auto' as const,
      flex: 1,
    },
    column: {
      display: 'flex',
      flexDirection: 'column' as const,
    },
    formGroup: {
      marginBottom: '20px',
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: 500,
      color: '#374151',
      marginBottom: '8px',
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      color: '#1f2937',
      backgroundColor: 'white',
      cursor: 'pointer',
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      color: '#1f2937',
      boxSizing: 'border-box' as const,
    },
    toggleContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: '20px',
    },
    toggleLabel: {
      fontSize: '13px',
      color: '#6b7280',
    },
    toggle: {
      position: 'relative' as const,
      width: '44px',
      height: '24px',
      backgroundColor: sourceStatus ? '#3b82f6' : '#d1d5db',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    },
    toggleKnob: {
      position: 'absolute' as const,
      top: '2px',
      left: sourceStatus ? '22px' : '2px',
      width: '20px',
      height: '20px',
      backgroundColor: 'white',
      borderRadius: '50%',
      transition: 'left 0.2s',
    },
    statsSection: {
      backgroundColor: '#f9fafb',
      padding: '20px',
      borderRadius: '8px',
    },
    statsTitle: {
      fontSize: '16px',
      fontWeight: 600,
      color: '#111827',
      marginBottom: '16px',
    },
    statItem: {
      marginBottom: '16px',
    },
    statLabel: {
      fontSize: '13px',
      color: '#6b7280',
      marginBottom: '4px',
    },
    statValue: {
      fontSize: '14px',
      fontWeight: 500,
      color: '#111827',
    },
    progressBar: {
      width: '100%',
      height: '8px',
      backgroundColor: '#e5e7eb',
      borderRadius: '4px',
      overflow: 'hidden',
      marginTop: '4px',
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#10b981',
      borderRadius: '4px',
      transition: 'width 0.3s',
    },
    deleteBtn: {
      padding: '10px 20px',
      border: '1px solid #fecaca',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 500,
      color: '#dc2626',
      backgroundColor: 'white',
      cursor: 'pointer',
      transition: 'all 0.2s',
      marginTop: '24px',
    },
    footer: {
      padding: '16px 24px',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
    },
    cancelBtn: {
      padding: '10px 20px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 500,
      color: '#374151',
      backgroundColor: 'white',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    saveBtn: {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 500,
      color: 'white',
      backgroundColor: '#111827',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <h2 style={styles.title}>Edit Source</h2>
            <p style={styles.subtitle}>{source.platform}</p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* Left Column - Form */}
          <div style={styles.column}>
            {/* Platform Select */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Source Platform</label>
              <select
                style={styles.select}
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                <option value="TripAdvisor">TripAdvisor</option>
                <option value="Booking.com">Booking.com</option>
                <option value="Google Reviews">Google Reviews</option>
                <option value="Airbnb">Airbnb</option>
              </select>
            </div>

            {/* Property URL */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Property / Hotel URL</label>
              <input
                type="text"
                style={styles.input}
                value={propertyUrl}
                onChange={(e) => setPropertyUrl(e.target.value)}
              />
            </div>

            {/* API Key */}
            <div style={styles.formGroup}>
              <label style={styles.label}>API Key</label>
              <input
                type="password"
                style={styles.input}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>

            {/* Schedule */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Schedule</label>
              <select
                style={styles.select}
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
              >
                <option value="Hourly">Hourly</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
              </select>
            </div>

            {/* Source Status Toggle */}
            <div style={styles.toggleContainer}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                  Source Status
                </div>
                <div style={styles.toggleLabel}>
                  {sourceStatus ? 'Active and collecting reviews' : 'Paused'}
                </div>
              </div>
              <div
                style={styles.toggle}
                onClick={() => setSourceStatus(!sourceStatus)}
              >
                <div style={styles.toggleKnob}></div>
              </div>
            </div>

            {/* Delete Button */}
            <button
              style={styles.deleteBtn}
              onClick={handleDelete}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              Delete Source
            </button>
          </div>

          {/* Right Column - Statistics */}
          <div style={styles.column}>
            <div style={styles.statsSection}>
              <h3 style={styles.statsTitle}>Source Statistics</h3>

              <div style={styles.statItem}>
                <div style={styles.statLabel}>Last Run Time</div>
                <div style={styles.statValue}>{source.lastSynced}</div>
              </div>

              <div style={styles.statItem}>
                <div style={styles.statLabel}>Next Run Time</div>
                <div style={styles.statValue}>In 45 minutes</div>
              </div>

              <div style={styles.statItem}>
                <div style={styles.statLabel}>Success Rate</div>
                <div style={{ ...styles.statValue, color: '#10b981' }}>96%</div>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: '96%' }}></div>
                </div>
              </div>

              <div style={styles.statItem}>
                <div style={styles.statLabel}>Error Count</div>
                <div style={styles.statValue}>0 errors</div>
              </div>

              <div style={styles.statItem}>
                <div style={styles.statLabel}>Source ID</div>
                <div style={{ ...styles.statValue, fontFamily: 'monospace' }}>60800081</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button
            style={styles.cancelBtn}
            onClick={onClose}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            Cancel
          </button>
          <button
            style={styles.saveBtn}
            onClick={handleSave}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#000000'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#111827'}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditSourceModal;
