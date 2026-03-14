import React from 'react';
import { iconMap } from './NotificationIcon';
import type { NotificationType } from './NotificationIcon';

interface TypeBadgeProps {
    type: NotificationType;
}

const TypeBadge: React.FC<TypeBadgeProps> = ({ type }) => {
    const style = iconMap[type];
    return (
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${style.bg} ${style.color} border border-transparent dark:border-${style.color.split('-')[1]}-800/30`}>
            {type}
        </span>
    );
};

export default TypeBadge;
