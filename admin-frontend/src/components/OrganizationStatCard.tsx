import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface OrganizationStatCardProps {
    label: string;
    value: number;
    icon: LucideIcon;
    iconColor: string;
    iconBgColor: string;
}

export const OrganizationStatCard: React.FC<OrganizationStatCardProps> = ({
    label,
    value,
    icon: Icon,
    iconColor,
    iconBgColor
}) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
            <div>
                <div className="text-sm text-gray-500 mb-1">{label}</div>
                <div className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</div>
            </div>
            <div className={`w-12 h-12 rounded-xl ${iconBgColor} flex items-center justify-center ${iconColor}`}>
                <Icon size={24} />
            </div>
        </div>
    );
};
