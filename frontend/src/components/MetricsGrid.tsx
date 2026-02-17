import { Star, Link2, MessageSquare, Frown } from 'lucide-react';
import { MetricCard } from './MetricCard';

const metrics = [
  {
    label: 'Average Rating',
    value: '4.3',
    change: '+0.2',
    tone: 'up' as const,
    icon: <Star size={18} />,
  },
  {
    label: 'Active Sources',
    value: '3',
    change: '',
    tone: 'neutral' as const,
    icon: <Link2 size={18} />,
  },
  {
    label: 'Total Reviews',
    value: '1,247',
    change: '+12%',
    tone: 'up' as const,
    icon: <MessageSquare size={18} />,
  },
  {
    label: 'Negative Reviews',
    value: '89',
    change: '-3%',
    tone: 'down' as const,
    icon: <Frown size={18} />,
  },
];

const MetricsGrid = () => {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {metrics.map((item) => (
        <MetricCard
          key={item.label}
          label={item.label}
          value={item.value}
          change={item.change}
          changeType={item.tone}
          icon={item.icon}
        />
      ))}
    </section>
  );
};

export default MetricsGrid;
