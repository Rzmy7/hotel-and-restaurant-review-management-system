import React, { useEffect, useState } from 'react';
import { Building2, Users, Building, Loader } from 'lucide-react';
import { StatCard } from '../components/StatCard';
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
        <div className="max-w-[1200px] mx-auto">
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
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

            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-[400px] flex flex-col">
                    <div className="mb-6">
                        <div className="text-base font-semibold text-gray-900 mb-1">Platform Usage Over Time</div>
                        <div className="text-sm text-gray-500">Active users per month</div>
                    </div>
                    <div className="flex-1 relative">
                        <svg viewBox="0 0 600 250" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                            {/* Horizontal Grid Lines */}
                            {[0, 1, 2, 3, 4].map(i => (
                                <line
                                    key={i}
                                    x1="20"
                                    y1={20 + (i * 50)}
                                    x2="580"
                                    y2={20 + (i * 50)}
                                    className="stroke-gray-200 stroke-1 [stroke-dasharray:4_4]"
                                />
                            ))}

                            {/* The Line */}
                            <polyline
                                points={chartPoints.map(p => `${p.x},${p.y}`).join(' ')}
                                className="fill-none stroke-blue-500 stroke-[3] line-cap-round line-join-round"
                            />

                            {/* Dots */}
                            {chartPoints.map((p, i) => (
                                <circle key={i} cx={p.x} cy={p.y} className="fill-white stroke-blue-500 stroke-[2] r-[4px]" />
                            ))}

                            {/* X Axis Labels */}
                            {chartPoints.map((p, i) => (
                                <text key={i} x={p.x} y="245" textAnchor="middle" className="text-[10px] fill-gray-500">{p.label}</text>
                            ))}
                        </svg>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-[400px] flex flex-col">
                    <div className="mb-6">
                        <div className="text-base font-semibold text-gray-900 mb-1">Reviews by Organization</div>
                        <div className="text-sm text-gray-500">Total reviews collected</div>
                    </div>
                    <div className="flex-1 flex items-end justify-between gap-3 pt-5">
                        {reviewData.map((item, index) => (
                            <div key={index} className="flex flex-col items-center gap-2 flex-1 h-full">
                                <div className="w-full bg-gray-100 rounded relative overflow-hidden h-full">
                                    <div className="absolute bottom-0 left-0 w-full bg-blue-500 rounded transition-all duration-1000 ease-out" style={{ height: `${item.value}%` }}></div>
                                </div>
                                <div className="text-xs text-gray-500 text-center overflow-hidden text-ellipsis whitespace-nowrap max-w-full">{item.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
