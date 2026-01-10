import React, { useEffect, useState } from 'react';
import { Search, Plus, MoreVertical } from 'lucide-react';
import { fetchUsers } from '../services/mockService';
import type { User } from '../types';
import './Users.css';

export const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('All Roles');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        const loadData = async () => {
            const userData = await fetchUsers();
            setUsers(userData);
            setLoading(false);
        };
        loadData();
    }, []);

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2);
    };

    // Filter Logic
    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'All Roles' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="users-table-controls">
                <div className="user-search-wrapper">
                    <div className="search-input-wrapper" style={{ flex: 1, maxWidth: 'none' }}>
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                    <select
                        className="role-select"
                        value={roleFilter}
                        onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                    >
                        <option>All Roles</option>
                        <option>Admin</option>
                        <option>Manager</option>
                        <option>User</option>
                    </select>
                </div>
                <button className="btn-primary" onClick={() => alert('Add User Modal would open here')}>
                    <Plus size={18} />
                    Add User
                </button>
            </div>

            <div className="white-card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: '30%' }}>Name</th>
                            <th style={{ width: '30%' }}>Email</th>
                            <th style={{ width: '15%' }}>Role</th>
                            <th style={{ width: '15%' }}>Status</th>
                            <th style={{ width: '10%' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedUsers.map((user) => (
                            <tr key={user.id}>
                                <td>
                                    <div className="user-name-cell">
                                        <div
                                            className="avatar-initials"
                                            style={{ backgroundColor: user.avatarColor || '#e5e7eb' }}
                                        >
                                            {getInitials(user.name)}
                                        </div>
                                        <span>{user.name}</span>
                                    </div>
                                </td>
                                <td style={{ color: 'var(--text-secondary)' }}>
                                    {user.email}
                                </td>
                                <td>
                                    <span className="role-badge">{user.role}</span>
                                </td>
                                <td>
                                    <span className={`status-badge-sm ${user.status === 'Active' ? 'status-active-sm' : 'status-suspended-sm'}`}>
                                        {user.status}
                                    </span>
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
                        Showing {filteredUsers.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
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
