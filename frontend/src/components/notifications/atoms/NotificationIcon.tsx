import React from 'react';
import { Megaphone, AlertTriangle, CheckCircle2, Mail } from 'lucide-react';

export type NotificationType = 'announcement' | 'alert' | 'success' | 'system';

interface NotificationIconProps {
    type: NotificationType;
    className?: string;
}

export const iconMap = {
    announcement: {
        icon: <Megaphone size={18} />,
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        color: 'text-amber-500 dark:text-amber-400',
        ring: 'ring-amber-100 dark:ring-amber-800/30',
    },
    alert: {
        icon: <AlertTriangle size={18} />,
        bg: 'bg-red-50 dark:bg-red-900/20',
        color: 'text-red-500 dark:text-red-400',
        ring: 'ring-red-100 dark:ring-red-800/30',
    },
    success: {
        icon: <CheckCircle2 size={18} />,
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        color: 'text-emerald-500 dark:text-emerald-400',
        ring: 'ring-emerald-100 dark:ring-emerald-800/30',
    },
    system: {
        icon: <Mail size={18} />,
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        color: 'text-blue-500 dark:text-blue-400',
        ring: 'ring-blue-100 dark:ring-blue-800/30',
    },
};

const NotificationIcon: React.FC<NotificationIconProps> = ({ type }) => {
    const style = iconMap[type];
    return (
        <div className={`w-10 h-10 rounded-xl ${style.bg} ${style.color} grid place-items-center shrink-0 ring-1 ${style.ring} transition-all duration-300 group-hover:scale-110`}>
            {style.icon}
        </div>
    );
};

export default NotificationIcon;
