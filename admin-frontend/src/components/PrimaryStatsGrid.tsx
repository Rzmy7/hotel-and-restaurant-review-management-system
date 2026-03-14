import React from 'react';
import { Building2, Users, Building, MessageSquare } from 'lucide-react';
import { StatCard } from './StatCard';
import type { DashboardStats } from '../types';

interface PrimaryStatsGridProps {
    stats: DashboardStats;
}

export const PrimaryStatsGrid: React.FC<PrimaryStatsGridProps> = ({ stats }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
                label="Total Organizations"
                value={stats.totalOrganizations.toLocaleString()}
                trend={`+${stats.organizationsGrowth}%`}
                icon={Building2}
            />
            <StatCard
                label="Total Users"
                value={stats.totalUsers.toLocaleString()}
                trend={`+${stats.usersGrowth}%`}
                icon={Users}
            />
            <StatCard
                label="Active Organizations"
                value={stats.activeHotels.toLocaleString()}
                trend={`+${stats.hotelsGrowth}%`}
                icon={Building}
            />
            <StatCard
                label="Total Reviews"
                value={stats.totalReviews.toLocaleString()}
                trend={`+${stats.reviewsGrowth}%`}
                icon={MessageSquare}
            />
        </div>
    );
};
