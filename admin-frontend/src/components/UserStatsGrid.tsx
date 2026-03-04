import React from 'react';
import { Users, UserCheck, UserPlus } from 'lucide-react';
import { UserStatCard } from './UserStatCard';

interface UserStatsGridProps {
    allActiveUsers: number;
    todayActiveUsers: number;
    todayRegistered: number;
}

export const UserStatsGrid: React.FC<UserStatsGridProps> = ({
    allActiveUsers,
    todayActiveUsers,
    todayRegistered
}) => {
    return (
        <div className="grid grid-cols-3 gap-6">
            <UserStatCard
                label="All Active Users"
                value={allActiveUsers}
                icon={Users}
                iconColor="text-blue-500"
                iconBgColor="bg-blue-50"
            />
            <UserStatCard
                label="Today Active Users"
                value={todayActiveUsers}
                icon={UserCheck}
                iconColor="text-green-500"
                iconBgColor="bg-green-50"
            />
            <UserStatCard
                label="Today Registered"
                value={todayRegistered}
                icon={UserPlus}
                iconColor="text-purple-500"
                iconBgColor="bg-purple-50"
            />
        </div>
    );
};
