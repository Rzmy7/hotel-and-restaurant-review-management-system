interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
}

const MetricCard = ({ icon, label, value, change, changeType = 'neutral' }: MetricCardProps) => {
  const changeColors = {
    up: "text-emerald-600 bg-emerald-100",
    down: "text-red-600 bg-red-100",
    neutral: "text-gray-500 bg-gray-100"
  };

  return (
    <div className="flex items-center gap-3.5 p-[18px] bg-white border border-gray-200 rounded-xl transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
      <div className="w-11 h-11 grid place-items-center bg-blue-50 text-blue-500 rounded-[10px]">{icon}</div>
      <div className="flex-1">
        <p className="mb-1.5 text-[13px] text-gray-500 font-medium">{label}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-[26px] font-bold text-gray-800">{value}</span>
          {change && (
            <span className={`text-[13px] font-semibold px-2 py-1 rounded-md ${changeColors[changeType]}`}>
              {change}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
