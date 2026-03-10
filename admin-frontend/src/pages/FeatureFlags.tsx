import React, { useEffect, useState } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SearchBar } from '../components/SearchBar';
import { ToggleSwitch } from '../components/ToggleSwitch';
import { fetchFeatureFlags } from '../services/mockService';
import type { FeatureFlag } from '../types';

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

    if (loading) {
        return <LoadingSpinner size={32} />;
    }

    const filteredFlags = flags.filter(flag =>
        flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        flag.key.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-5xl pt-4 space-y-4">
            {/* Search */}
            <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search feature flags..."
            />

            {/* Feature Flags List */}
            <div className="space-y-3">
                {filteredFlags.map((flag) => (
                    <div 
                        key={flag.id} 
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center justify-between hover:shadow-md transition-shadow"
                    >
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">{flag.name}</h3>
                            <p className="text-sm text-gray-600">{flag.description}</p>
                            <p className="text-xs text-gray-400 mt-1 font-mono">{flag.key}</p>
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                            {/* Toggle Switch */}
                            <div className="flex items-center gap-2">
                                <ToggleSwitch
                                    checked={flag.status === 'Enabled'}
                                    onChange={() => toggleStatus(flag.id)}
                                />
                                <span className={`text-sm font-medium min-w-[60px] transition-colors ${
                                    flag.status === 'Enabled' ? 'text-blue-600' : 'text-gray-500'
                                }`}>
                                    {flag.status}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
