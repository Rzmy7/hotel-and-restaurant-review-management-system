
import { Users, Droplets, MapPin, Utensils, TrendingUp, TrendingDown, Minus, ThumbsUp, ThumbsDown } from 'lucide-react';

const CategoryPerformance = () => {
  const categories = [
    {
      name: 'Staff',
      score: 85,
      color: '#3b82f6',
      icon: <Users size={16} />,
      trend: '+2.4%',
      count: 428,
      trendType: 'up'
    },
    {
      name: 'Cleanliness',
      score: 78,
      color: '#06b6d4',
      icon: <Droplets size={16} />,
      trend: '-1.2%',
      count: 312,
      trendType: 'down'
    },
    {
      name: 'Location',
      score: 92,
      color: '#8b5cf6',
      icon: <MapPin size={16} />,
      trend: '+0.5%',
      count: 247,
      trendType: 'up'
    },
    {
      name: 'Food',
      score: 71,
      color: '#f59e0b',
      icon: <Utensils size={16} />,
      trend: '+5.1%',
      count: 260,
      trendType: 'up'
    },
  ];

  const getTrendIcon = (type: string) => {
    if (type === 'up') return <TrendingUp size={12} className="text-emerald-500" />;
    if (type === 'down') return <TrendingDown size={12} className="text-rose-500" />;
    return <Minus size={12} className="text-gray-400" />;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col h-full shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="m-0 text-base font-bold text-gray-800">Category Performance</h3>
        <span className="text-xs text-gray-400 font-medium">Last 30 days</span>
      </div>

      <div className="flex flex-col gap-6 flex-1">
        {categories.map((category) => (
          <div key={category.name} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gray-50 text-gray-600" style={{ color: category.color }}>
                  {category.icon}
                </div>
                <div>
                  <span className="text-sm font-bold text-gray-800 block leading-tight">{category.name}</span>
                  <span className="text-[11px] text-gray-400 font-medium">{category.count} reviews</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-gray-800 block leading-tight">{category.score}%</span>
                <div className="flex items-center gap-1 justify-end">
                  {getTrendIcon(category.trendType)}
                  <span className={`text-[11px] font-semibold ${category.trendType === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {category.trend}
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full">
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out shadow-sm"
                  style={{
                    width: `${category.score}%`,
                    backgroundColor: category.color,
                    backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 100%)'
                  }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Insights Section to fill white space */}
      <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 gap-4">
        <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
          <div className="flex items-center gap-2 mb-2">
            <ThumbsUp size={14} className="text-emerald-600" />
            <span className="text-xs font-bold text-emerald-800">Key Strength</span>
          </div>
          <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">
            Location continues to outperform with a consistent 92% approval rating.
          </p>
        </div>

        <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100/50">
          <div className="flex items-center gap-2 mb-2">
            <ThumbsDown size={14} className="text-rose-600" />
            <span className="text-xs font-bold text-rose-800">Needs Attention</span>
          </div>
          <p className="text-[11px] text-rose-700 leading-relaxed font-medium">
            Food quality has improved, but cleanliness saw a 1.2% dip this month.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CategoryPerformance;
