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
    <div className="bg-white border border-gray-100 rounded-xl p-6 flex flex-col h-full shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center bg-rose-50 rounded-xl text-rose-600 border border-rose-100/50">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="m-0 text-sm font-black text-gray-700 uppercase tracking-widest">Recent Alerts</h3>
            <p className="m-0 text-[10px] text-gray-400 font-bold uppercase tracking-wider">Critical System Events</p>
          </div>
        </div>
        <button
          className="flex items-center gap-1 text-blue-600 font-bold text-xs hover:text-blue-700 transition-colors group/btn cursor-pointer bg-transparent border-none"
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
    </div>
  );
};

export default AlertsPanel;
