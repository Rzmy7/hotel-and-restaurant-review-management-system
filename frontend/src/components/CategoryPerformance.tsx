
import { Users, Droplets, MapPin, Utensils, TrendingUp, TrendingDown, Minus } from 'lucide-react';

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
    <div className="bg-white border border-gray-100 rounded-xl p-6 flex flex-col h-full shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="m-0 text-sm font-black text-gray-700 uppercase tracking-widest">Category Performance</h3>
          <p className="m-0 text-[10px] text-gray-400 font-bold uppercase tracking-wider">Domain Metrics</p>
        </div>
        <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-md border border-gray-100">Last 30 Days</span>
      </div>

      <div className="flex flex-col gap-6 flex-1">
        {categories.map((category) => (
          <div key={category.name} className="flex flex-col gap-3 group/cat">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-600 transition-transform group-hover/cat:scale-110" style={{ color: category.color }}>
                  {category.icon}
                </div>
                <div>
                  <span className="text-sm font-black text-gray-800 block leading-tight">{category.name}</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{category.count} reviews</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-gray-800 block leading-tight">{category.score}%</span>
                <div className="flex items-center gap-1 justify-end">
                  {getTrendIcon(category.trendType)}
                  <span className={`text-[10px] font-black uppercase tracking-widest ${category.trendType === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {category.trend}
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full">
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden relative shadow-inner">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${category.score}%`,
                    backgroundColor: category.color,
                    backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 100%)'
                  }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryPerformance;
