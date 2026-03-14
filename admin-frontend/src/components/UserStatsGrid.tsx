import React from 'react';
import { Users, UserCheck, UserPlus, TrendingUp, Activity } from 'lucide-react';

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* All Active Users */}
            <div className="group relative bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-6 border border-blue-200/50 hover:shadow-lg hover:shadow-blue-100/50 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-blue-600 mb-1">All Active Users</p>
                        <h3 className="text-3xl font-bold text-blue-900">{allActiveUsers}</h3>
                        <div className="flex items-center gap-1 mt-2 text-xs text-blue-600">
                            <TrendingUp size={14} />
                            <span>Total active</span>
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform duration-300">
                        <Users size={24} />
                    </div>
                </div>
            </div>

            {/* Today Active Users */}
            <div className="group relative bg-gradient-to-br from-green-50 to-green-100/50 rounded-2xl p-6 border border-green-200/50 hover:shadow-lg hover:shadow-green-100/50 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-green-600 mb-1">Today Active Users</p>
                        <h3 className="text-3xl font-bold text-green-900">{todayActiveUsers}</h3>
                        <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                            <Activity size={14} className="animate-pulse" />
                            <span>Online today</span>
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-200 group-hover:scale-110 transition-transform duration-300">
                        <UserCheck size={24} />
                    </div>
                </div>
            </div>

            {/* Today Registered */}
            <div className="group relative bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-6 border border-purple-200/50 hover:shadow-lg hover:shadow-purple-100/50 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-purple-600 mb-1">Today Registered</p>
                        <h3 className="text-3xl font-bold text-purple-900">{todayRegistered}</h3>
                        <div className="flex items-center gap-1 mt-2 text-xs text-purple-600">
                            <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                            <span>New signups</span>
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center text-white shadow-lg shadow-purple-200 group-hover:scale-110 transition-transform duration-300">
                        <UserPlus size={24} />
                    </div>
                </div>
            </div>
        </div>
    );
};
