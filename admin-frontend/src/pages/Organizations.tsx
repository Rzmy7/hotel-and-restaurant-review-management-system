import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Clock, Search, Plus, MoreVertical, Building } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { fetchOrganizations, fetchOrgStats } from '../services/mockService';
import type { Organization, OrganizationStats } from '../types';
import './Organizations.css';

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

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'Active': return 'status-badge status-active';
            case 'Pending': return 'status-badge status-pending';
            case 'Inactive': return 'status-badge status-inactive';
            default: return 'status-badge';
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

    if (loading) return <div>Loading...</div>;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {stats && (
                <div className="org-stats-grid">
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

            <div className="table-controls">
                <div className="search-input-wrapper">
                    <Search className="search-icon" size={18} />
                    <input
                        type="text"
                        placeholder="Search organizations..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    />
                </div>

                <div className="filter-group">
                    <select
                        className="status-select"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    >
                        <option>All Status</option>
                        <option>Active</option>
                        <option>Pending</option>
                        <option>Inactive</option>
                    </select>
                    <button className="btn-primary" onClick={() => alert('Add Organization Modal would open here')}>
                        <Plus size={18} />
                        Add Organization
                    </button>
                </div>
            </div>

            <div className="white-card" style={{ overflow: 'hidden' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Organization Name</th>
                            <th>Domain</th>
                            <th>Number of Users</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedOrgs.map((org) => (
                            <tr key={org.id}>
                                <td>
                                    <div className="org-cell">
                                        <div className="org-icon-placeholder">
                                            <Building size={16} />
                                        </div>
                                        <span style={{ fontWeight: 500 }}>{org.name}</span>
                                    </div>
                                </td>
                                <td style={{ color: 'var(--text-secondary)' }}>{org.domain}</td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <UsersIcon />
                                        {org.usersCount.toLocaleString()}
                                    </div>
                                </td>
                                <td>
                                    <span className={getStatusClass(org.status)}>{org.status}</span>
                                </td>
                                <td>
                                    <button style={{ color: 'var(--text-secondary)' }}>
                                        <MoreVertical size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="pagination">
                    <div className="page-info">
                        Showing {filteredOrgs.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + itemsPerPage, filteredOrgs.length)} of {filteredOrgs.length} organizations
                    </div>
                    <div className="page-controls">
                        <button
                            className="page-btn"
                            disabled={currentPage === 1}
                            onClick={() => handlePageChange(currentPage - 1)}
                        >
                            Previous
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                className={`page-btn ${currentPage === page ? 'active' : ''}`}
                                onClick={() => handlePageChange(page)}
                            >
                                {page}
                            </button>
                        ))}
                        <button
                            className="page-btn"
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
