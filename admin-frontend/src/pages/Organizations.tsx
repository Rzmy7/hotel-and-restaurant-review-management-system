import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Clock, Search, Plus, MoreVertical, Building } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { fetchOrganizations, fetchOrgStats } from '../services/mockService';
import type { Organization, OrganizationStats } from '../types';


export const Organizations: React.FC = () => {
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [stats, setStats] = useState<OrganizationStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Status');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        const loadData = async () => {
            const [orgData, statsData] = await Promise.all([
                fetchOrganizations(),
                fetchOrgStats()
            ]);
            setOrgs(orgData);
            setStats(statsData);
            setLoading(false);
        };
        loadData();
    }, []);



    // Filter Logic
    const filteredOrgs = orgs.filter(org => {
        const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'All Status' || org.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredOrgs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedOrgs = filteredOrgs.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="max-w-[1200px] mx-auto">
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <StatCard
                        label="Total Organizations"
                        value={stats.total.toLocaleString()}
                        trend=""
                        icon={Building2}
                    />
                    <StatCard
                        label="Active Organizations"
                        value={stats.active.toLocaleString()}
                        trend=""
                        icon={CheckCircle2}
                    />
                    <StatCard
                        label="Pending Organizations"
                        value={stats.pending.toLocaleString()}
                        trend=""
                        icon={Clock}
                    />
                </div>
            )}

            <div className="flex justify-between items-center mb-4 gap-4">
                <div className="flex-1 max-w-[400px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={18} />
                    <input
                        type="text"
                        placeholder="Search organizations..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className="w-full py-2.5 px-4 pl-10 border border-gray-200 rounded-md text-sm outline-none bg-white"
                    />
                </div>

                <div className="flex gap-4">
                    <select
                        className="py-2.5 px-4 border border-gray-200 rounded-md bg-white text-gray-900 text-sm cursor-pointer outline-none"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    >
                        <option>All Status</option>
                        <option>Active</option>
                        <option>Pending</option>
                        <option>Inactive</option>
                    </select>
                    <button className="bg-black text-white px-5 py-2.5 rounded-md text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity" onClick={() => alert('Add Organization Modal would open here')}>
                        <Plus size={18} />
                        Add Organization
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="text-left px-6 py-4 font-semibold text-gray-500 text-sm border-b border-gray-200">Organization Name</th>
                            <th className="text-left px-6 py-4 font-semibold text-gray-500 text-sm border-b border-gray-200">Domain</th>
                            <th className="text-left px-6 py-4 font-semibold text-gray-500 text-sm border-b border-gray-200">Number of Users</th>
                            <th className="text-left px-6 py-4 font-semibold text-gray-500 text-sm border-b border-gray-200">Status</th>
                            <th className="text-left px-6 py-4 font-semibold text-gray-500 text-sm border-b border-gray-200">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedOrgs.map((org) => (
                            <tr key={org.id} className="last:border-b-0">
                                <td className="px-6 py-4 text-gray-900 text-sm border-b border-gray-200">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500">
                                            <Building size={16} />
                                        </div>
                                        <span className="font-medium">{org.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-500 text-sm border-b border-gray-200">{org.domain}</td>
                                <td className="px-6 py-4 text-gray-900 text-sm border-b border-gray-200">
                                    <div className="flex items-center gap-2">
                                        <UsersIcon />
                                        {org.usersCount.toLocaleString()}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-900 text-sm border-b border-gray-200">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium inline-block ${org.status === 'Active' ? 'bg-green-100 text-green-800' :
                                        org.status === 'Pending' ? 'bg-orange-100 text-orange-700' :
                                            'bg-red-100 text-red-700'
                                        }`}>{org.status}</span>
                                </td>
                                <td className="px-6 py-4 text-gray-900 text-sm border-b border-gray-200">
                                    <button className="text-gray-500 bg-transparent border-none cursor-pointer p-0 hover:text-gray-700">
                                        <MoreVertical size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                        Showing {filteredOrgs.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + itemsPerPage, filteredOrgs.length)} of {filteredOrgs.length} organizations
                    </div>
                    <div className="flex gap-2">
                        <button
                            className="px-3 py-1.5 border border-gray-200 rounded-md bg-white text-sm text-gray-900 disabled:opacity-50"
                            disabled={currentPage === 1}
                            onClick={() => handlePageChange(currentPage - 1)}
                        >
                            Previous
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                className={`px-3 py-1.5 border border-gray-200 rounded-md text-sm ${currentPage === page ? 'bg-black text-white border-black' : 'bg-white text-gray-900'}`}
                                onClick={() => handlePageChange(page)}
                            >
                                {page}
                            </button>
                        ))}
                        <button
                            className="px-3 py-1.5 border border-gray-200 rounded-md bg-white text-sm text-gray-900 disabled:opacity-50"
                            disabled={currentPage === totalPages || totalPages === 0}
                            onClick={() => handlePageChange(currentPage + 1)}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper icon component
const UsersIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#9ca3af' }}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);
