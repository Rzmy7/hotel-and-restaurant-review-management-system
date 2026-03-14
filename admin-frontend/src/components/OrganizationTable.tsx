import React from 'react';
import { Building, MoreVertical } from 'lucide-react';
import { Pagination } from './Pagination';
import type { Organization } from '../types';

interface OrganizationTableProps {
    organizations: Organization[];
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    startIndex: number;
    onPageChange: (page: number) => void;
}

export const OrganizationTable: React.FC<OrganizationTableProps> = ({
    organizations,
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    startIndex,
    onPageChange
}) => {
    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'Active': return 'bg-green-100 text-green-600';
            case 'Pending': return 'bg-yellow-100 text-yellow-600';
            case 'Inactive': return 'bg-red-100 text-red-500';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100/30">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider" style={{ width: '35%' }}>Organization Name</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider" style={{ width: '30%' }}>Domain</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider" style={{ width: '20%' }}>Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider" style={{ width: '15%' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {organizations.map((org) => (
                        <tr key={org.id} className="border-b border-gray-50 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-transparent transition-all duration-200 group">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-600 border border-blue-200/50 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                                        <Building size={20} />
                                    </div>
                                    <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{org.name}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-gray-600 font-medium">{org.domain}</td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${getStatusBadgeClass(org.status)}`}>
                                    {org.status}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 hover:shadow-md">
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
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                startIndex={startIndex}
                onPageChange={onPageChange}
                itemLabel="organizations"
            />
        </div>
    );
};
