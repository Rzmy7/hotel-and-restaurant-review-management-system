import React, { useEffect, useState } from 'react';
import { Search, MoreVertical } from 'lucide-react';
import { fetchFeatureFlags } from '../services/mockService';
import type { FeatureFlag } from '../types';
import './FeatureFlags.css';

export const FeatureFlags: React.FC = () => {
    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const loadData = async () => {
            const data = await fetchFeatureFlags();
            setFlags(data);
            setLoading(false);
        };
        loadData();
    }, []);

    const toggleStatus = (id: string) => {
        setFlags(prevFlags => prevFlags.map(flag =>
            flag.id === id
                ? { ...flag, status: flag.status === 'Enabled' ? 'Disabled' : 'Enabled' }
                : flag
        ));
    };

    if (loading) return <div>Loading...</div>;

    const filteredFlags = flags.filter(flag =>
        flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        flag.key.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="feature-flags-container">
            <div className="dashboard-header" style={{ marginBottom: '24px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Enable or disable features across the platform</p>
            </div>

            <div className="feature-search-header">
                <div className="feature-search-wrapper">
                    <Search className="feature-search-icon" size={18} />
                    <input
                        type="text"
                        placeholder="Search feature flags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="feature-list">
                {filteredFlags.map((flag) => (
                    <div key={flag.id} className="feature-card">
                        <div className="feature-info">
                            <div className="feature-name-row">
                                <span className="feature-name">{flag.name}</span>
                                <span className="feature-key">{flag.key}</span>
                            </div>
                            <p className="feature-description">{flag.description}</p>
                        </div>
                        <div className="feature-actions">
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    className="toggle-input"
                                    checked={flag.status === 'Enabled'}
                                    onChange={() => toggleStatus(flag.id)}
                                />
                                <span className="toggle-slider"></span>
                                <span className="toggle-label">{flag.status}</span>
                            </label>
                            <button className="menu-btn">
                                <MoreVertical size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
