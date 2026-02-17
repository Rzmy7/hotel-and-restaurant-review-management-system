import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Clock, Search, Plus, MoreVertical, Building, Loader, ChevronDown } from 'lucide-react';
import { Pagination } from '../components/Pagination';
import { fetchOrganizations, fetchOrgStats } from '../services/mockService';
import type { Organization, OrganizationStats } from '../types';

export const Organizations: React.FC = () => {
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [stats, setStats] = useState<OrganizationStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Status');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

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

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'Active': return 'bg-green-100 text-green-600';
            case 'Pending': return 'bg-yellow-100 text-yellow-600';
            case 'Inactive': return 'bg-red-100 text-red-500';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader size={32} className="animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pt-4">
            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Total Organizations */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
                        <div>
                            <div className="text-sm text-gray-500 mb-1">Total Organizations</div>
                            <div className="text-3xl font-bold text-gray-900">{stats.total.toLocaleString()}</div>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                            <Building2 size={24} />
                        </div>
                    </div>

                    {/* Active Organizations */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
                        <div>
                            <div className="text-sm text-gray-500 mb-1">Active Organizations</div>
                            <div className="text-3xl font-bold text-gray-900">{stats.active.toLocaleString()}</div>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-500">
                            <CheckCircle2 size={24} />
                        </div>
                    </div>

                    {/* Pending Organizations */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
                        <div>
                            <div className="text-sm text-gray-500 mb-1">Pending Organizations</div>
                            <div className="text-3xl font-bold text-gray-900">{stats.pending.toLocaleString()}</div>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-500">
                            <Clock size={24} />
                        </div>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                    {/* Search Input */}
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2.5 flex-1 max-w-xl">
                        <Search size={18} className="text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search organizations..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="bg-transparent border-none outline-none text-sm text-gray-600 placeholder-gray-400 w-full"
                        />
                    </div>
                    
                    {/* Status Filter */}
                    <div className="relative">
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm text-gray-600 cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option>All Status</option>
                            <option>Active</option>
                            <option>Pending</option>
                            <option>Inactive</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* Add Organization Button */}
                <button 
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    onClick={() => alert('Add Organization Modal would open here')}
                >
                    <Plus size={18} />
                    Add Organization
                </button>
            </div>

            {/* Organizations Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-100">
                            <th className="px-6 py-4 text-left text-sm font-medium text-gray-500" style={{ width: '35%' }}>Organization Name</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-gray-500" style={{ width: '30%' }}>Domain</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-gray-500" style={{ width: '20%' }}>Status</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-gray-500" style={{ width: '15%' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedOrgs.map((org) => (
                            <tr key={org.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                                            <Building size={18} />
                                        </div>
                                        <span className="font-medium text-gray-900">{org.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-500">{org.domain}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(org.status)}`}>
                                        {org.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <button className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
                                        <MoreVertical size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredOrgs.length}
                    itemsPerPage={itemsPerPage}
                    startIndex={startIndex}
                    onPageChange={handlePageChange}
                    itemLabel="organizations"
                />
            </div>
        </div>
    );
};
