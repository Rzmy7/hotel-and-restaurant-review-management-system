import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import type { Alert } from '../../../types/dashboard';
import { Card } from '../atoms/Card';
import { SectionHeader } from '../molecules/SectionHeader';

export interface AlertsPanelProps {
    alerts: Alert[];
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts }) => {
    const navigate = useNavigate();

    return (
        <Card hoverEffect className="shadow-sm p-6 flex flex-col" style={{ maxHeight: 340 }}>
            <SectionHeader
                title="Recent Alerts"
                subtitle="Critical System Events"
                icon={<AlertTriangle size={18} />}
                iconClassName="bg-rose-50 text-rose-600 border border-rose-100/50"
                className="mb-8 items-center shrink-0"
            >
                <button
                    className="flex items-center gap-1 text-blue-600 font-bold text-xs hover:text-blue-700 transition-colors group/btn cursor-pointer bg-transparent border-none"
                    onClick={() => navigate('/notifications?filter=alert')}
                >
                    View All
                    <ChevronRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
                </button>
            </SectionHeader>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 -mr-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent" style={{ maxHeight: 220 }}>
                {alerts.map((alert) => (
                    <div
                        key={alert.id}
                        className={`flex items-start gap-3 p-4 rounded-xl border transition-all hover:shadow-md group/item ${alert.type === 'critical'
                            ? 'bg-rose-50/20 border-rose-100/30 text-rose-900 hover:bg-rose-50/40'
                            : alert.type === 'warning'
                                ? 'bg-amber-50/20 border-amber-100/30 text-amber-900 hover:bg-amber-50/40'
                                : 'bg-blue-50/20 border-blue-100/30 text-blue-900 hover:bg-blue-50/40'
                            }`}
                    >
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${alert.type === 'critical'
                            ? 'bg-rose-500'
                            : alert.type === 'warning'
                                ? 'bg-amber-500'
                                : 'bg-blue-500'
                            }`} />
                        <div className="flex-1 min-w-0">
                            <p className="m-0 text-[13px] font-bold leading-tight group-hover/item:translate-x-0.5 transition-transform">{alert.message}</p>
                            <p className="m-0 mt-1.5 text-[9px] font-black opacity-50 uppercase tracking-widest">{alert.time}</p>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default AlertsPanel;
