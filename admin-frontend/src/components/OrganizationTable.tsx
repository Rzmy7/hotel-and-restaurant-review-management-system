import React from 'react';
import { Building, Pencil, Trash2 } from 'lucide-react';
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
    onEdit: (org: Organization) => void;
    onDelete: (org: Organization) => void;
}

export const OrganizationTable: React.FC<OrganizationTableProps> = ({
    organizations,
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    startIndex,
    onPageChange,
    onEdit,
    onDelete,
}) => {


    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-gray-100 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider" style={{ width: '45%' }}>Organization Name</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider" style={{ width: '40%' }}>Owner</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider" style={{ width: '15%' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {organizations.map((org) => (
                        <tr key={org.id} className="border-b border-gray-50 dark:border-slate-700 hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-all duration-200 group">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/30 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                                        <Building size={20} />
                                    </div>
                                    <span className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{org.name}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-gray-600 dark:text-slate-300 font-medium">{org.owner || '—'}</td>

                            <td className="px-6 py-4">
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => onEdit(org)}
                                        title="Edit organization"
                                        className="p-2 text-gray-400 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition-all duration-200"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button
                                        onClick={() => onDelete(org)}
                                        title="Delete organization"
                                        className="p-2 text-gray-400 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 rounded-lg transition-all duration-200"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
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
