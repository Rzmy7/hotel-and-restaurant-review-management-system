import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SetupLayout from '../components/SetupLayout';
import { Clock, Calendar } from 'lucide-react';

type ScheduleType = 'hourly' | 'daily' | 'weekly';

const ChooseSchedulePage = () => {
  const navigate = useNavigate();
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleType>('daily');

  const handleContinue = () => {
    navigate('/setup/finish');
  };

  const handleBack = () => {
    navigate('/setup/sources');
  };

  const styles = {
    title: {
      fontSize: '32px',
      fontWeight: 600,
      color: '#1f2937',
      textAlign: 'center' as const,
      marginBottom: '12px',
    },
    subtitle: {
      fontSize: '15px',
      color: '#9ca3af',
      textAlign: 'center' as const,
      marginBottom: '50px',
    },
    optionsContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '20px',
      marginBottom: '60px',
    },
    optionCard: (selected: boolean) => ({
      border: selected ? '2px solid #d1d5db' : '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '32px 24px',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      cursor: 'pointer',
      position: 'relative' as const,
      backgroundColor: selected ? '#fafafa' : '#ffffff',
      transition: 'all 0.2s',
      boxShadow: selected ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none',
    }),
    radioContainer: {
      position: 'absolute' as const,
      top: '16px',
      right: '16px',
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      border: '2px solid #d1d5db',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'white',
    },
    radioInner: {
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      backgroundColor: '#1f2937',
    },
    recommendedBadge: {
      position: 'absolute' as const,
      top: '10px',
      left: '10px',
      backgroundColor: '#fef3c7',
      color: '#92400e',
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 600,
    },
    iconWrapper: (color: string) => ({
      width: '64px',
      height: '64px',
      borderRadius: '50%',
      backgroundColor: `${color} 15`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '20px',
    }),
    optionTitle: {
      fontSize: '20px',
      fontWeight: 600,
      color: '#1f2937',
      marginBottom: '8px',
      textAlign: 'center' as const,
    },
    optionDescription: {
      fontSize: '13px',
      color: '#9ca3af',
      textAlign: 'center' as const,
      lineHeight: '1.5',
    },
  };

  const scheduleOptions = [
    {
      id: 'hourly' as ScheduleType,
      title: 'Hourly Fetching',
      description: 'Ideal for high-activity hotels with frequent reviews',
      icon: Clock,
      iconColor: '#ef4444',
    },
    {
      id: 'daily' as ScheduleType,
      title: 'Daily Fetching',
      description: 'Balanced schedule for most organizations',
      icon: Calendar,
      iconColor: '#ec4899',
      recommended: true,
    },
    {
      id: 'weekly' as ScheduleType,
      title: 'Weekly Fetching',
      description: 'For low-traffic sources or test environments',
      icon: Calendar,
      iconColor: '#06b6d4',
    },
  ];

  return (
    <SetupLayout
      currentStep={3}
      onContinue={handleContinue}
      onBack={handleBack}
    >
      <h1 style={styles.title}>Choose How Often to Fetch Reviews</h1>
      <p style={styles.subtitle}>
        Select one of the recommended schedules. You can modify this anytime in
        source settings
      </p>

      <div style={styles.optionsContainer}>
        {scheduleOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedSchedule === option.id;

          return (
            <div
              key={option.id}
              style={styles.optionCard(isSelected)}
              onClick={() => setSelectedSchedule(option.id)}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = '#d1d5db';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }
              }}
            >
              {option.recommended && (
                <div style={styles.recommendedBadge}>Recommended</div>
              )}

              <div style={styles.radioContainer}>
                {isSelected && <div style={styles.radioInner} />}
              </div>

              <div style={styles.iconWrapper(option.iconColor)}>
                <Icon size={32} color={option.iconColor} strokeWidth={2} />
              </div>

              <div style={styles.optionTitle}>{option.title}</div>
              <div style={styles.optionDescription}>{option.description}</div>
            </div>
          );
        })}
      </div>
    </SetupLayout>
  );
};

export default ChooseSchedulePage;
