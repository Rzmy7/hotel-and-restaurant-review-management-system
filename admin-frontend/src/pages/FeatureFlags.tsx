import React, { useEffect, useState } from 'react';
import { Search, MoreVertical } from 'lucide-react';
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

    if (loading) return <div>Loading...</div>;

    const filteredFlags = flags.filter(flag =>
        flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        flag.key.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-[1200px] mx-auto">
            <div className="mb-6">
                <p className="text-gray-500 text-sm">Enable or disable features across the platform</p>
            </div>

            <div className="mb-6">
                <div className="relative max-w-[400px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={18} />
                    <input
                        type="text"
                        placeholder="Search feature flags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full py-3 px-4 pl-10 border border-gray-200 rounded-md text-sm outline-none bg-white"
                    />
                </div>
            </div>

            <div className="flex flex-col gap-4">
                {filteredFlags.map((flag) => (
                    <div key={flag.id} className="bg-white border border-gray-200 rounded-lg p-6 flex items-center justify-between hover:shadow transition-shadow">
                        <div className="flex-1">
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className="font-medium text-[0.95rem] text-gray-900">{flag.name}</span>
                                <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{flag.key}</span>
                            </div>
                            <p className="text-gray-500 text-sm m-0">{flag.description}</p>
                        </div>
                        <div className="flex items-center gap-6">
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
                            <button className="text-gray-500 bg-transparent border-none cursor-pointer p-1 rounded hover:bg-gray-100">
                                <MoreVertical size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
