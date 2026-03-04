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
                    {organizations.map((org) => (
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
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                startIndex={startIndex}
                onPageChange={onPageChange}
                itemLabel="organizations"
            />
        </div>
    );
};
