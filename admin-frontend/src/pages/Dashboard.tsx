import React, { useEffect, useState } from 'react';
import { Building2, Users, Building, Loader } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { UsageChart } from '../components/UsageChart';
import { ReviewsChart } from '../components/ReviewsChart';
import { fetchDashboardStats, fetchUsageData, fetchReviewData } from '../services/mockService';
import type { DashboardStats, ChartDataPoint } from '../types';

export const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [usageData, setUsageData] = useState<ChartDataPoint[]>([]);
    const [reviewData, setReviewData] = useState<ChartDataPoint[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            const [statsData, usage, reviews] = await Promise.all([
                fetchDashboardStats(),
                fetchUsageData(),
                fetchReviewData()
            ]);
            setStats(statsData);
            setUsageData(usage);
            setReviewData(reviews);
            setLoading(false);
        };

        loadData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader size={32} className="animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pt-4">
            {/* Stats Grid */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                        label="Active Hotels"
                        value={stats.activeHotels.toLocaleString()}
                        trend={`+${stats.hotelsGrowth}%`}
                        icon={Building}
                    />
                </div>
            )}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <UsageChart data={usageData} />
                <ReviewsChart data={reviewData} />
            </div>
        </div>
    );
};
