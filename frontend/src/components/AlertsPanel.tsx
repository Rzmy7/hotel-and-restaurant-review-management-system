import { useToast } from '../contexts/ToastContext';


const AlertsPanel = () => {
  const { showToast } = useToast();
  const alerts = [
    {
      id: 1,
      message: 'Spike in negative reviews today (+15)',
      type: 'critical',
    },
    {
      id: 2,
      message: 'Booking.com sync failed',
      type: 'warning',
    },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex justify-between items-center mb-5">
        <h3 className="m-0 text-base font-bold text-gray-800">Alerts</h3>
        <button
          className="bg-none border-none text-blue-500 font-semibold text-sm cursor-pointer hover:underline"
          onClick={() => showToast('Alerts center coming soon', 'info')}
        >
          View All
        </button>
      </div>

      <div className="flex flex-col gap-3 mt-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-start gap-2.5 p-3 rounded-lg border ${alert.type === 'critical'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
          >
            <span className="w-2 h-2 rounded-full bg-current mt-1.5 shrink-0"></span>
            <p className="m-0 text-sm font-medium flex-1">{alert.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertsPanel;
