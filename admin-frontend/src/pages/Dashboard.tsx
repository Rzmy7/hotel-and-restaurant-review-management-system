import React, { useEffect, useState } from 'react';
import { Building2, Users, Building, Loader } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { fetchDashboardStats, fetchUsageData, fetchReviewData } from '../services/mockService';
import type { DashboardStats, ChartDataPoint } from '../types';
import './Dashboard.css';

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
            <div className="flex-center" style={{ height: '50vh' }}>
                <Loader size={32} className="animate-spin" />
            </div>
        );
    }



    const getPoints = (data: ChartDataPoint[], width: number, height: number) => {
        const padding = 20;
        const maxVal = Math.max(...data.map(d => d.value));
        return data.map((d, i) => {
            const x = padding + (i * ((width - padding * 2) / (data.length - 1)));
            const y = height - padding - ((d.value / maxVal) * (height - padding * 2));
            return { x, y, value: d.value, label: d.label };
        });
    };

    const chartPoints = getPoints(usageData, 600, 250); // Approximated viewBox dimensions

    return (
        <div className="dashboard-container">
            {stats && (
                <div className="dashboard-grid">
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

            <div className="charts-grid">
                <div className="white-card chart-card">
                    <div className="chart-header">
                        <div className="chart-title">Platform Usage Over Time</div>
                        <div className="chart-subtitle">Active users per month</div>
                    </div>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <svg viewBox="0 0 600 250" className="line-chart-svg" preserveAspectRatio="none">
                            {/* Horizontal Grid Lines */}
                            {[0, 1, 2, 3, 4].map(i => (
                                <line
                                    key={i}
                                    x1="20"
                                    y1={20 + (i * 50)}
                                    x2="580"
                                    y2={20 + (i * 50)}
                                    className="grid-line"
                                />
                            ))}

                            {/* The Line */}
                            <polyline
                                points={chartPoints.map(p => `${p.x},${p.y}`).join(' ')}
                                className="line-path"
                            />

                            {/* Dots */}
                            {chartPoints.map((p, i) => (
                                <circle key={i} cx={p.x} cy={p.y} className="chart-dot" />
                            ))}

                            {/* X Axis Labels */}
                            {chartPoints.map((p, i) => (
                                <text key={i} x={p.x} y="245" textAnchor="middle" className="axis-text">{p.label}</text>
                            ))}
                        </svg>
                    </div>
                </div>

                <div className="white-card chart-card">
                    <div className="chart-header">
                        <div className="chart-title">Reviews by Organization</div>
                        <div className="chart-subtitle">Total reviews collected</div>
                    </div>
                    <div className="chart-content">
                        {reviewData.map((item, index) => (
                            <div key={index} className="bar-chart-item" style={{ height: '100%' }}>
                                <div className="bar" style={{ height: '100%', width: '30px' }}>
                                    <div className="bar-fill" style={{ height: `${item.value}%` }}></div>
                                </div>
                                <div className="bar-label">{item.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
