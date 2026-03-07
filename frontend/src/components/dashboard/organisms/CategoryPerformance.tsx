import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Droplets, MapPin, Utensils, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '../atoms/Card';
import { SectionHeader } from '../molecules/SectionHeader';

interface CategoryData {
    name: string;
    score: number;
    icon: 'Users' | 'Droplets' | 'MapPin' | 'Utensils';
    trend: string;
    count: number;
    trendType: 'up' | 'down' | 'neutral';
}

const iconMap = {
    Users: <Users size={16} />,
    Droplets: <Droplets size={16} />,
    MapPin: <MapPin size={16} />,
    Utensils: <Utensils size={16} />,
};

export const CategoryPerformance: React.FC = () => {
    const navigate = useNavigate();
    // Keeping mock data internal for now as it's not in the main response interface yet,
    // but adding the structure to allow future prop-injection.
    const categories: CategoryData[] = [
        {
            name: 'Staff',
            score: 85,
            icon: 'Users',
            trend: '+2.4%',
            count: 428,
            trendType: 'up'
        },
        {
            name: 'Cleanliness',
            score: 78,
            icon: 'Droplets',
            trend: '-1.2%',
            count: 312,
            trendType: 'down'
        },
        {
            name: 'Location',
            score: 92,
            icon: 'MapPin',
            trend: '+0.5%',
            count: 247,
            trendType: 'up'
        },
        {
            name: 'Food',
            score: 71,
            icon: 'Utensils',
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

    const handleCategoryClick = (category: string) => {
        navigate(`/reviews?category=${category}`);
    };

    return (
        <Card hoverEffect className="shadow-sm p-6 flex flex-col h-full">
            <SectionHeader
                title="Category Performance"
                subtitle="Domain Metrics"
                className="mb-8 items-center"
            >
                <span className="text-[10px] text-gray-400 dark:text-slate-500 font-black uppercase tracking-widest bg-gray-50 dark:bg-slate-800 px-2 py-1 rounded-md border border-gray-100 dark:border-slate-700">
                    Last 30 Days
                </span>
            </SectionHeader>

            <div className="flex flex-col gap-6 flex-1">
                {categories.map((category) => (
                    <button
                        key={category.name}
                        onClick={() => handleCategoryClick(category.name)}
                        className="flex flex-col gap-3 group/cat text-left w-full cursor-pointer focus:outline-none bg-transparent border-none p-0"
                    >
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-50 text-[#4e80ee] dark:bg-blue-900/30 dark:text-blue-400 transition-all group-hover/cat:scale-110 group-hover/cat:bg-[#4e80ee] group-hover/cat:text-white">
                                    {iconMap[category.icon]}
                                </div>
                                <div>
                                    <span className="text-sm font-black text-gray-800 dark:text-white block leading-tight">{category.name}</span>
                                    <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider">{category.count} reviews</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-black text-gray-800 dark:text-white block leading-tight">{category.score}%</span>
                                <div className="flex items-center gap-1 justify-end">
                                    {getTrendIcon(category.trendType)}
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${category.trendType === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {category.trend}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="w-full">
                            <div className="w-full h-2 bg-gray-50 dark:bg-slate-800 rounded-full overflow-hidden relative shadow-inner border border-gray-100/50 dark:border-slate-700/50">
                                <div
                                    className="h-full rounded-full transition-all duration-1000 ease-out bg-[#4e80ee] group-hover/cat:brightness-110"
                                    style={{
                                        width: `${category.score}%`,
                                        backgroundImage: 'linear-gradient(90deg, #4e80ee 0%, #7ba3f5 100%)'
                                    }}
                                ></div>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </Card>
    );
};

export default CategoryPerformance;
