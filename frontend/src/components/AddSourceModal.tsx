import { useState } from 'react';
import { X } from 'lucide-react';

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddSourceModal = ({ isOpen, onClose }: AddSourceModalProps) => {
  const [platform, setPlatform] = useState('');
  const [propertyUrl, setPropertyUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [schedule, setSchedule] = useState('Daily');
  const [sourceStatus, setSourceStatus] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    // Handle form submission here
    console.log({ platform, propertyUrl, apiKey, schedule, sourceStatus });
    onClose();
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
      maxWidth: '500px',
      padding: '0',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    },
    header: {
      padding: '20px 24px',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontSize: '18px',
      fontWeight: 600,
      color: '#111827',
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
    testBtn: {
      padding: '8px 16px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: 500,
      color: '#3b82f6',
      backgroundColor: 'white',
      cursor: 'pointer',
      transition: 'all 0.2s',
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
    submitBtn: {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 500,
      color: 'white',
      backgroundColor: '#6b7280',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Source Platform</h2>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* Platform Select */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Source Platform</label>
            <select
              style={styles.select}
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              <option value="">Select a platform</option>
              <option value="booking">Booking.com</option>
              <option value="tripadvisor">TripAdvisor</option>
              <option value="google">Google Reviews</option>
              <option value="airbnb">Airbnb</option>
            </select>
          </div>

          {/* Property URL */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Property / Hotel URL</label>
            <input
              type="text"
              style={styles.input}
              placeholder="https://example.com/hotel"
              value={propertyUrl}
              onChange={(e) => setPropertyUrl(e.target.value)}
            />
          </div>

          {/* API Key */}
          <div style={styles.formGroup}>
            <label style={styles.label}>API Key (optional)</label>
            <input
              type="text"
              style={styles.input}
              placeholder="Enter API key if available"
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

          {/* Test Connection Button */}
          <button
            style={styles.testBtn}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            Test Connection
          </button>

          {/* Source Status Toggle */}
          <div style={styles.toggleContainer}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                Source Status
              </div>
              <div style={styles.toggleLabel}>
                Enable to start collecting reviews immediately
              </div>
            </div>
            <div
              style={styles.toggle}
              onClick={() => setSourceStatus(!sourceStatus)}
            >
              <div style={styles.toggleKnob}></div>
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
            style={styles.submitBtn}
            onClick={handleSubmit}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6b7280'}
          >
            Add Source
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddSourceModal;
