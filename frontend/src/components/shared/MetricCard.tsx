import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { MetricTrend } from '../../types/dashboard';

interface MetricCardProps extends MetricTrend {
  icon: React.ReactNode;
  label: string;
}

const MetricCard = ({
  icon,
  label,
  value,
  change,
  changeType = 'neutral',
  colorScheme = 'blue'
}: MetricCardProps) => {

  const schemes = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-[#4e80ee]',
      border: 'hover:border-blue-200'
    },
    amber: {
      bg: 'bg-amber-50',
      icon: 'text-amber-600',
      border: 'hover:border-amber-200'
    },
    indigo: {
      bg: 'bg-indigo-50',
      icon: 'text-indigo-600',
      border: 'hover:border-indigo-200'
    },
    rose: {
      bg: 'bg-rose-50',
      icon: 'text-rose-600',
      border: 'hover:border-rose-200'
    },
    emerald: {
      bg: 'bg-emerald-50',
      icon: 'text-emerald-600',
      border: 'hover:border-emerald-200'
    }
  };

  const changeStyles = {
    up: {
      text: "text-emerald-600",
      bg: "bg-emerald-50",
      icon: <TrendingUp size={12} className="stroke-[3px]" />
    },
    down: {
      text: "text-rose-600",
      bg: "bg-rose-50",
      icon: <TrendingDown size={12} className="stroke-[3px]" />
    },
    neutral: {
      text: "text-gray-500",
      bg: "bg-gray-50",
      icon: <Minus size={12} className="stroke-[3px]" />
    }
  };

  const scheme = schemes[colorScheme];
  const trend = changeStyles[changeType];

  return (
    <div className={`p-4 bg-white border border-gray-100 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-gray-200/40 hover:-translate-y-0.5 group ${scheme.border} relative overflow-hidden`}>
      <div className="flex justify-between items-center mb-3">
        <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${scheme.bg} ${scheme.icon} transition-transform duration-300 group-hover:scale-105`}>
          {icon}
        </div>

        {change && (
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${trend.bg} ${trend.text} border border-transparent`}>
            {trend.icon}
            <span>{change}</span>
          </div>
        )}
      </div>

      <div className="space-y-0.5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-gray-900 tracking-tight">{value}</span>
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
