interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
}

const MetricCard = ({ icon, label, value, change, changeType = 'neutral' }: MetricCardProps) => {
  const changeClasses = {
    up: 'text-emerald-600 bg-emerald-100',
    down: 'text-red-600 bg-red-100',
    neutral: 'text-gray-600 bg-gray-100'
  };

  return (
    <div className="flex items-center gap-3.5 p-4.5 bg-white border border-gray-200 rounded-xl transition-all hover:shadow-lg">
      <div className="w-11 h-11 grid place-items-center bg-blue-50 text-blue-500 rounded-lg">{icon}</div>
      <div className="flex-1">
        <p className="mb-1.5 text-xs text-gray-500 font-medium">{label}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">{value}</span>
          {change && (
            <span className={`text-xs font-semibold px-2 py-1 rounded-md ${changeClasses[changeType]}`}>
              {change}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
