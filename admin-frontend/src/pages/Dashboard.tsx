import React, { useEffect, useState } from 'react';
import { Building2, Users, MessageSquare, Bot } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { StatCard } from '../components/StatCard';
import { SystemHealthBar } from '../components/SystemHealthBar';
import { UsageChart } from '../components/UsageChart';
import { ReviewsChart } from '../components/ReviewsChart';
import { AlertsPanel } from '../components/AlertsPanel';
import { RecentActivity } from '../components/RecentActivity';
import {
    fetchDashboardStats,
    fetchUsageData,
    fetchReviewData,
    fetchSystemAlerts,
    fetchRecentActivity,
    dismissAlert as dismissAlertApi,
} from '../services/dashboardService';
import { fetchServerStatuses } from '../services/monitoringService';
import type {
    DashboardStats,
    ChartDataPoint,
    SystemAlert,
    RecentActivity as RecentActivityType,
    ServerStatus,
} from '../types';

export const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [usageData, setUsageData] = useState<ChartDataPoint[]>([]);
    const [reviewData, setReviewData] = useState<ChartDataPoint[]>([]);
    const [alerts, setAlerts] = useState<SystemAlert[]>([]);
    const [activities, setActivities] = useState<RecentActivityType[]>([]);
    const [servers, setServers] = useState<ServerStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [serversLoading, setServersLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [statsData, usage, reviews, alertsData, activitiesData] =
                    await Promise.all([
                        fetchDashboardStats().catch(err => { console.error('fetchDashboardStats failed:', err); return null; }),
                        fetchUsageData().catch(err => { console.error('fetchUsageData failed:', err); return []; }),
                        fetchReviewData().catch(err => { console.error('fetchReviewData failed:', err); return []; }),
                        fetchSystemAlerts().catch(err => { console.error('fetchSystemAlerts failed:', err); return []; }),
                        fetchRecentActivity().catch(err => { console.error('fetchRecentActivity failed:', err); return []; }),
                    ]);

                if (statsData) {
                    setStats(statsData);
                }
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

    // Load server statuses separately (may be slower due to health checks)
    useEffect(() => {
        const loadServers = async () => {
            try {
                const serverData = await fetchServerStatuses();
                setServers(serverData);
            } catch (error) {
                console.error('Failed to load server statuses:', error);
            } finally {
                setServersLoading(false);
            }
        };

        loadServers();

        // Auto-refresh server statuses every 30 seconds
        const interval = setInterval(async () => {
            try {
                const serverData = await fetchServerStatuses();
                setServers(serverData);
            } catch (error) {
                console.error('Failed to refresh server statuses:', error);
            }
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const handleDismissAlert = (id: string) => {
        setAlerts((prev) => prev.filter((alert) => alert.id !== id));
        // Fire-and-forget: persist dismiss to backend
        dismissAlertApi(id).catch(err => console.error('dismissAlert failed:', err));
    };

    if (loading) {
        return <LoadingSpinner size={32} />;
    }

    return (
        <div className="space-y-6 pt-4">
            {/* ─── KPI Stats Grid ─── */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        label="Total Organizations"
                        value={stats.totalOrganizations.toLocaleString()}
                        trend={`+${stats.organizationsGrowth}%`}
                        icon={Building2}
                        iconColor="text-blue-500"
                        iconBg="bg-blue-50"
                    />
                    <StatCard
                        label="Total Users"
                        value={stats.totalUsers.toLocaleString()}
                        trend={`+${stats.usersGrowth}%`}
                        icon={Users}
                        iconColor="text-purple-500"
                        iconBg="bg-purple-50"
                    />
                    <StatCard
                        label="Total Reviews"
                        value={stats.totalReviews.toLocaleString()}
                        trend={`+${stats.reviewsGrowth}%`}
                        icon={MessageSquare}
                        iconColor="text-emerald-500"
                        iconBg="bg-emerald-50"
                    />
                    <StatCard
                        label="AI Jobs Processed"
                        value={stats.aiJobsProcessed.toLocaleString()}
                        trend={`+${stats.aiJobsGrowth}%`}
                        icon={Bot}
                        iconColor="text-amber-500"
                        iconBg="bg-amber-50"
                    />
                </div>
            )}

            {/* ─── System Health Overview ─── */}
            <SystemHealthBar servers={servers} loading={serversLoading} />

            {/* ─── Charts Row ─── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <UsageChart data={usageData} />
                <ReviewsChart data={reviewData} />
            </div>

            {/* ─── Activity + Alerts Grid ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RecentActivity activities={activities} />
                <AlertsPanel alerts={alerts} onDismiss={handleDismissAlert} />
            </div>
        </div>
    );
};
