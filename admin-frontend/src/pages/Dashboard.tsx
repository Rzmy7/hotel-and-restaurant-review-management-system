import React, { useEffect, useState } from 'react';
import { Building2, Users, Building, Loader, MessageSquare, Activity } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { UsageChart } from '../components/UsageChart';
import { ReviewsChart } from '../components/ReviewsChart';
import { AlertsPanel } from '../components/AlertsPanel';
import { QuickActions } from '../components/QuickActions';
import { RecentActivity } from '../components/RecentActivity';
import { 
    fetchDashboardStats, 
    fetchUsageData, 
    fetchReviewData, 
    fetchSystemAlerts, 
    fetchRecentActivity 
} from '../services/mockService';
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
            setLoading(false);
        };

        loadData();
    }, []);

    const handleDismissAlert = (id: string) => {
        setAlerts(prev => prev.filter(alert => alert.id !== id));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader size={32} className="animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pt-4">
            {/* Stats Grid - Row 1 */}
            {stats && (
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
                        label="Active Hotels"
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
            )}

            {/* Stats Grid - Row 2 */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Active Users Today</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {stats.activeUsersToday.toLocaleString()}
                                </p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-lg">
                                <Activity className="text-green-600" size={24} />
                            </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                            <div className="flex -space-x-2">
                                {[...Array(5)].map((_, i) => (
                                    <div 
                                        key={i} 
                                        className="w-6 h-6 rounded-full border-2 border-white"
                                        style={{ backgroundColor: ['#bfdbfe', '#e9d5ff', '#fed7aa', '#bbf7d0', '#fecaca'][i] }}
                                    />
                                ))}
                            </div>
                            <span className="text-xs text-gray-500">+{stats.activeUsersToday - 5} more online</span>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Total Reviews Collected</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {stats.totalReviews.toLocaleString()}
                                </p>
                            </div>
                            <div className="p-3 bg-cyan-100 rounded-lg">
                                <MessageSquare className="text-cyan-600" size={24} />
                            </div>
                        </div>
                        <div className="mt-3">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-green-600">+{stats.reviewsGrowth}%</span>
                                <span className="text-xs text-gray-500">vs last month</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">System Uptime</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {stats.systemUptime}%
                                </p>
                            </div>
                            <div className="p-3 bg-emerald-100 rounded-lg">
                                <Activity className="text-emerald-600" size={24} />
                            </div>
                        </div>
                        <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                    className="bg-emerald-500 h-2 rounded-full" 
                                    style={{ width: `${stats.systemUptime}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Charts Section */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <UsageChart data={usageData} />
                        <ReviewsChart data={reviewData} />
                    </div>
                    
                    {/* Quick Actions */}
                    <QuickActions />
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    {/* Alerts Panel */}
                    <AlertsPanel 
                        alerts={alerts} 
                        onDismiss={handleDismissAlert}
                    />

                    {/* Recent Activity */}
                    <RecentActivity activities={activities} />
                </div>
            </div>
        </div>
    );
};
