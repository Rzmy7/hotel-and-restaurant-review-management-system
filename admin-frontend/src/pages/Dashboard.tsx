import React, { useEffect, useState } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PrimaryStatsGrid } from '../components/PrimaryStatsGrid';
import { SecondaryStatsGrid } from '../components/SecondaryStatsGrid';
import { ChartsAndActions } from '../components/ChartsAndActions';
import { DashboardSidebar } from '../components/DashboardSidebar';
import { 
    fetchDashboardStats, 
    fetchUsageData, 
    fetchReviewData, 
    fetchSystemAlerts, 
    fetchRecentActivity 
} from '../services/dashboardService';
import type { DashboardStats, ChartDataPoint, SystemAlert, RecentActivity as RecentActivityType } from '../types';

export const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [usageData, setUsageData] = useState<ChartDataPoint[]>([]);
    const [reviewData, setReviewData] = useState<ChartDataPoint[]>([]);
    const [alerts, setAlerts] = useState<SystemAlert[]>([]);
    const [activities, setActivities] = useState<RecentActivityType[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [statsData, usage, reviews, alertsData, activitiesData] = await Promise.all([
                    fetchDashboardStats(),
                    fetchUsageData(),
                    fetchReviewData(),
                    fetchSystemAlerts(),
                    fetchRecentActivity()
                ]);

                setStats(statsData);
                setUsageData(usage);
                setReviewData(reviews);
                setAlerts(alertsData);
                setActivities(activitiesData);
            } catch (error) {
                console.error('Failed to load dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const handleDismissAlert = (id: string) => {
        setAlerts(prev => prev.filter(alert => alert.id !== id));
    };

    if (loading) {
        return <LoadingSpinner size={32} />;
    }

    return (
        <div className="space-y-6 pt-4">
            {/* Primary Stats Grid */}
            {stats && <PrimaryStatsGrid stats={stats} />}

            {/* Secondary Stats Grid */}
            {stats && <SecondaryStatsGrid stats={stats} />}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Charts and Actions */}
                <ChartsAndActions usageData={usageData} reviewData={reviewData} />

                {/* Sidebar with Alerts and Activity */}
                <DashboardSidebar 
                    alerts={alerts} 
                    activities={activities} 
                    onDismissAlert={handleDismissAlert}
                />
            </div>
        </div>
    );
};
