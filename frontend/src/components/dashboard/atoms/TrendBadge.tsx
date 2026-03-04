import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export type TrendType = 'up' | 'down' | 'neutral';

export interface TrendBadgeProps {
    type: TrendType;
    value: string | number;
    className?: string;
}

export const TrendBadge: React.FC<TrendBadgeProps> = ({ type, value, className = '' }) => {
    const styles = {
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

    const currentStyle = styles[type];

    return (
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${currentStyle.bg} ${currentStyle.text} border border-transparent ${className}`}>
            {currentStyle.icon}
            <span>{value}</span>
        </div>
    );
};
