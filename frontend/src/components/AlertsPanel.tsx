const AlertsPanel = () => {
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

  const alertStyles = {
    critical: 'bg-red-50 border-red-200 text-red-900',
    warning: 'bg-yellow-50 border-yellow-200 text-amber-900',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Alerts</h3>
        <button className="text-blue-500 font-semibold text-sm hover:underline">View All</button>
      </div>

      <div className="flex flex-col gap-3 mt-4">
        {alerts.map((alert) => (
          <div key={alert.id} className={`flex items-start gap-2.5 p-3 rounded-lg border ${alertStyles[alert.type as keyof typeof alertStyles]}`}>
            <span className="w-2 h-2 rounded-full bg-current mt-1.5 flex-shrink-0"></span>
            <p className="text-sm font-medium flex-1">{alert.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertsPanel;
