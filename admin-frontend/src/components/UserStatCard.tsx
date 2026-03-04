import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface UserStatCardProps {
    label: string;
    value: number;
    icon: LucideIcon;
    iconColor: string;
    iconBgColor: string;
}

export const UserStatCard: React.FC<UserStatCardProps> = ({
    label,
    value,
    icon: Icon,
    iconColor,
    iconBgColor
}) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg ${iconBgColor} flex items-center justify-center`}>
                <Icon size={24} className={iconColor} />
            </div>
            <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-semibold text-gray-900">{value}</p>
            </div>
        </div>
    );
};
