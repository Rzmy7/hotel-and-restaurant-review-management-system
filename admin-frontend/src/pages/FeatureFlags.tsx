import React, { useEffect, useState } from 'react';
import { Search, MoreVertical, Loader } from 'lucide-react';
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
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader size={32} className="animate-spin text-blue-500" />
            </div>
        );
    }

    const filteredFlags = flags.filter(flag =>
        flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        flag.key.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-5xl pt-4">
            {/* Search */}
            <div className="mb-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search feature flags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Feature Flags List */}
            <div className="space-y-3">
                {filteredFlags.map((flag) => (
                    <div 
                        key={flag.id} 
                        className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center justify-between hover:shadow-md transition-shadow"
                    >
                        <div className="flex-1">
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className="font-medium text-gray-900">{flag.name}</span>
                                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                    {flag.key}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500">{flag.description}</p>
                        </div>
                        <div className="flex items-center gap-6">
                            {/* Toggle Switch */}
                            <label className="flex items-center gap-2 cursor-pointer">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={flag.status === 'Enabled'}
                                        onChange={() => toggleStatus(flag.id)}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-500 transition-colors"></div>
                                    <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></div>
                                </div>
                                <span className={`text-sm min-w-[60px] ${flag.status === 'Enabled' ? 'text-blue-600' : 'text-gray-500'}`}>
                                    {flag.status}
                                </span>
                            </label>
                            <button className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                                <MoreVertical size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
