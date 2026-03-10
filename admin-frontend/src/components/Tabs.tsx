import React from 'react';

export interface Tab {
    id: string;
    label: string;
}

interface TabsProps {
    tabs: Tab[];
    activeTab: string;
    onChange: (tabId: string) => void;
    className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = '' }) => {
    return (
        <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-1 ${className}`}>
            <div className="flex gap-1">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`flex-1 px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                            activeTab === tab.id
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                        onClick={() => onChange(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>
    );
};
