import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';

const AlertsPanel = () => {
  const navigate = useNavigate();

  const alerts = [
    {
      id: 1,
      message: 'Spike in negative reviews today (+15)',
      type: 'critical',
      time: '2h ago'
    },
    {
      id: 2,
      message: 'Booking.com sync failed for TripAdvisor',
      type: 'warning',
      time: '4h ago'
    },
    {
      id: 3,
      message: 'New competitor mention in Google Reviews',
      type: 'info',
      time: '5h ago'
    },
    {
      id: 4,
      message: 'Rating dropped below 4.0 on Expedia',
      type: 'critical',
      time: '1d ago'
    },
    {
      id: 5,
      message: 'System maintenance scheduled for midnight',
      type: 'info',
      time: '1d ago'
    },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col h-full shadow-sm">
      <div className="flex justify-between items-center mb-5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-red-50 rounded-lg text-red-600">
            <AlertTriangle size={18} />
          </div>
          <h3 className="m-0 text-base font-bold text-gray-800">Recent Alerts</h3>
        </div>
        <button
          className="flex items-center gap-1 text-blue-600 font-bold text-xs hover:text-blue-700 transition-colors group/btn"
          onClick={() => navigate('/notifications?filter=alert')}
        >
          View All
          <ChevronRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3 -mr-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all hover:shadow-sm ${alert.type === 'critical'
              ? 'bg-red-50/50 border-red-100 text-red-900 hover:bg-red-50'
              : alert.type === 'warning'
                ? 'bg-amber-50/50 border-amber-100 text-amber-900 hover:bg-amber-50'
                : 'bg-blue-50/50 border-blue-100 text-blue-900 hover:bg-blue-50'
              }`}
          >
            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${alert.type === 'critical'
              ? 'bg-red-500'
              : alert.type === 'warning'
                ? 'bg-amber-500'
                : 'bg-blue-500'
              }`} />
            <div className="flex-1 min-w-0">
              <p className="m-0 text-sm font-semibold leading-tight">{alert.message}</p>
              <p className="m-0 mt-1 text-[10px] font-bold opacity-50 uppercase tracking-wider">{alert.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertsPanel;
