import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users, Droplets, MapPin, Utensils, Star, DollarSign, Wifi, Car,
    Waves, Dumbbell, Sparkles, Wine, LogIn, LogOut, Volume2, Bath,
    Bed, Shield, Palette, Smile, Wrench, BedDouble,
    TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import { Card } from '../atoms/Card';
import { SectionHeader } from '../molecules/SectionHeader';
import type { CategoryPerformanceItem, AspectPerformanceItem } from '../../../types/dashboard';

interface Props {
    categories?: (CategoryPerformanceItem | AspectPerformanceItem)[];
    aspects?: (CategoryPerformanceItem | AspectPerformanceItem)[];
}

const ICON_MAP: Record<string, React.ReactNode> = {
    Users:      <Users      size={16} />,
    Droplets:   <Droplets   size={16} />,
    MapPin:     <MapPin     size={16} />,
    Utensils:   <Utensils   size={16} />,
    Star:       <Star       size={16} />,
    DollarSign: <DollarSign size={16} />,
    Wifi:       <Wifi       size={16} />,
    Car:        <Car        size={16} />,
    Waves:      <Waves      size={16} />,
    Dumbbell:   <Dumbbell   size={16} />,
    Sparkles:   <Sparkles   size={16} />,
    Wine:       <Wine       size={16} />,
    LogIn:      <LogIn      size={16} />,
    LogOut:     <LogOut     size={16} />,
    Volume2:    <Volume2    size={16} />,
    Bath:       <Bath       size={16} />,
    Bed:        <Bed        size={16} />,
    Shield:     <Shield     size={16} />,
    Palette:    <Palette    size={16} />,
    Smile:      <Smile      size={16} />,
    Wrench:     <Wrench     size={16} />,
    BedDouble:  <BedDouble  size={16} />,
};

const getIcon = (name: string) => ICON_MAP[name] ?? <Star size={16} />;

const getTrendIcon = (type: string) => {
    if (type === 'up')   return <TrendingUp  size={12} className="text-emerald-500" />;
    if (type === 'down') return <TrendingDown size={12} className="text-rose-500" />;
    return <Minus size={12} className="text-gray-400" />;
};

const getTrendColor = (type: string) =>
    type === 'up' ? 'text-emerald-500' : type === 'down' ? 'text-rose-500' : 'text-gray-400';

export const CategoryPerformance: React.FC<Props> = ({ categories = [] }) => {
    const navigate = useNavigate();

    return (
        <Card hoverEffect className="shadow-sm p-6 flex flex-col h-full">
            <SectionHeader
                title="Aspect Performance"
                subtitle="Aspect Sentiment Breakdown"
                className="mb-6 items-center shrink-0"
            >
                <span className="text-[10px] text-gray-400 dark:text-slate-500 font-black uppercase tracking-widest bg-gray-50 dark:bg-slate-800 px-2 py-1 rounded-md border border-gray-100 dark:border-slate-700">
                    All Time
                </span>
            </SectionHeader>

            <div className="flex flex-col gap-6 flex-1">
                {categories.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-8 gap-3 min-h-[240px]">
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center">
                            <Star size={20} className="text-gray-300 dark:text-slate-600" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-gray-700 dark:text-white uppercase tracking-wide">No Aspect Data Available</p>
                            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                                Aspect metrics will appear once customer reviews are collected and analyzed.
                            </p>
                        </div>
                    </div>
                ) : (
                    categories.map((category) => (
                        <button
                            key={category.name}
                            onClick={() => navigate(`/reviews?category=${encodeURIComponent(category.name)}`)}
                            className="flex flex-col gap-3 group/cat text-left w-full cursor-pointer focus:outline-none bg-transparent border-none p-0"
                        >
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-50 text-[#4e80ee] dark:bg-blue-900/30 dark:text-blue-400 transition-all group-hover/cat:scale-110 group-hover/cat:bg-[#4e80ee] group-hover/cat:text-white">
                                        {getIcon(category.icon)}
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
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${getTrendColor(category.trendType)}`}>
                                            {category.trend}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full">
                                <div className="w-full h-2 bg-gray-50 dark:bg-slate-800 rounded-full overflow-hidden relative shadow-inner border border-gray-100/50 dark:border-slate-700/50">
                                    <div
                                        className="h-full rounded-full transition-all duration-1000 ease-out group-hover/cat:brightness-110"
                                        style={{
                                            width: `${category.score}%`,
                                            backgroundImage: 'linear-gradient(90deg, #4e80ee 0%, #7ba3f5 100%)'
                                        }}
                                    />
                                </div>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </Card>
    );
};

export const AspectPerformance = CategoryPerformance;
export default CategoryPerformance;
