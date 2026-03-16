import React, { useEffect, useState } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { OrganizationStatsGrid } from '../components/OrganizationStatsGrid';
import { OrganizationFilters } from '../components/OrganizationFilters';
import { OrganizationTable } from '../components/OrganizationTable';
import { fetchOrganizations, fetchOrgStats } from '../services/adminDataService';
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
            try {
                const [orgData, statsData] = await Promise.all([
                    fetchOrganizations(),
                    fetchOrgStats()
                ]);
                setOrgs(orgData);
                setStats(statsData);
            } catch (error) {
                console.error('Failed to load organizations data:', error);
            } finally {
                setLoading(false);
            }
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


    if (loading) {
        return <LoadingSpinner size={32} />;
    }

    return (
        <div className="space-y-8 pt-4">
            {/* Stats Cards */}
            {stats && <OrganizationStatsGrid stats={stats} />}

            {/* Filters */}
            <OrganizationFilters
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                onSearchChange={(value) => { setSearchQuery(value); setCurrentPage(1); }}
                onStatusChange={(value) => { setStatusFilter(value); setCurrentPage(1); }}
            />

            {/* Organizations Table */}
            <OrganizationTable
                organizations={paginatedOrgs}
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredOrgs.length}
                itemsPerPage={itemsPerPage}
                startIndex={startIndex}
                onPageChange={handlePageChange}
            />
        </div>
    );
};
