import React, { useEffect, useState } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SearchBar } from '../components/SearchBar';
import { ToggleSwitch } from '../components/ToggleSwitch';
import { fetchFeatureFlags } from '../services/mockService';
import { featureFlagsService } from '../services/featureFlagsService';
import type { FeatureFlag } from '../types';

export const FeatureFlags: React.FC = () => {
    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await featureFlagsService.getFeatureFlags();
                setFlags(data);
            } catch {
                const fallback = await fetchFeatureFlags();
                setFlags(fallback);
            }
            setLoading(false);
        };
        loadData();
    }, []);

    const toggleStatus = async (id: string) => {
        const currentFlag = flags.find((flag) => flag.id === id);
        if (!currentFlag) return;

        const nextStatus = currentFlag.status === 'Enabled' ? 'Disabled' : 'Enabled';
        setFlags(prevFlags => prevFlags.map(flag =>
            flag.id === id
                ? { ...flag, status: nextStatus }
                : flag
        ));

        try {
            const updated = await featureFlagsService.updateFeatureFlag(currentFlag.key, {
                status: nextStatus,
                ...(currentFlag.limit ? { limit: currentFlag.limit } : {}),
            });

            setFlags(prevFlags => prevFlags.map(flag => (flag.id === id ? updated : flag)));
        } catch {
            setFlags(prevFlags => prevFlags.map(flag =>
                flag.id === id
                    ? { ...flag, status: currentFlag.status }
                    : flag
            ));
        }
    };

    if (loading) {
        return <LoadingSpinner size={32} />;
    }

    const filteredFlags = flags.filter(flag =>
        flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        flag.key.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 pt-4">
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
