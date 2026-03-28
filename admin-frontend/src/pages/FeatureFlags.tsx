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

    const updateLimit = async (id: string, inputValue: string) => {
        const currentFlag = flags.find((flag) => flag.id === id);
        if (!currentFlag) return;

        const parsedValue = Number.parseInt(inputValue, 10);
        const nextLimit = Number.isNaN(parsedValue) ? undefined : Math.max(1, parsedValue);

        setFlags(prevFlags => prevFlags.map(flag =>
            flag.id === id
                ? {
                    ...flag,
                    limit: nextLimit
                }
                : flag
        ));

        if (nextLimit === undefined) {
            return;
        }

        try {
            const updated = await featureFlagsService.updateFeatureFlag(currentFlag.key, {
                status: currentFlag.status,
                limit: nextLimit,
            });

            setFlags(prevFlags => prevFlags.map(flag => (flag.id === id ? updated : flag)));
        } catch {
            // Keep local value for now; next successful update syncs backend.
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
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                            {flag.key === 'reply_regeneration_limit' && (
                                <div className="flex items-center gap-2">
                                    <label
                                        htmlFor={`reply-limit-${flag.id}`}
                                        className="text-sm font-medium text-gray-700"
                                    >
                                        Limit
                                    </label>
                                    <input
                                        id={`reply-limit-${flag.id}`}
                                        type="number"
                                        min={1}
                                        value={flag.limit ?? ''}
                                        onChange={(e) => updateLimit(flag.id, e.target.value)}
                                        className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            )}
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
