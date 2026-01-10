
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
    label: string;
    value: string;
    trend: string;
    icon: LucideIcon;
    trendPositive?: boolean;
}

export const StatCard = ({ label, value, trend, icon: Icon }: StatCardProps) => {
    return (
        <div className="white-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)'
                }}>
                    <Icon size={24} />
                </div>
                <div style={{
                    padding: '4px 8px',
                    background: '#eff6ff',
                    borderRadius: '20px',
                    color: 'var(--primary)',
                    fontSize: '0.75rem',
                    fontWeight: 600
                }}>
                    {trend}
                </div>
            </div>

            <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '8px' }}>
                    {label}
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {value}
                </div>
            </div>
        </div>
    );
};
