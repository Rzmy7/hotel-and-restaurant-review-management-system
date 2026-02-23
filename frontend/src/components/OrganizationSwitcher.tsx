import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Building2, Check } from 'lucide-react';
import type { Organization } from '../types/dashboard';

interface OrganizationSwitcherProps {
    currentOrg: Organization;
    organizations: Organization[];
    onSwitch: (orgId: string) => void;
    onAdd: () => void;
}

const OrganizationSwitcher: React.FC<OrganizationSwitcherProps> = ({
    currentOrg,
    organizations,
    onSwitch,
    onAdd,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 group cursor-pointer text-left focus:outline-none"
            >
                <div className="relative">
                    <h1 className="text-xl font-black text-gray-900 m-0 leading-tight tracking-tight group-hover:text-blue-600 transition-colors duration-300">
                        {currentOrg.name}
                    </h1>
                    <p className="mt-0.5 text-[10px] font-bold text-gray-400 m-0 leading-none uppercase tracking-[0.2em]">
                        {currentOrg.status === 'Active' ? 'Review Analytics Hub' : 'System Offline'}
                    </p>
                    <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 group-hover:w-full transition-all duration-500"></div>
                </div>
                <ChevronDown
                    size={18}
                    className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} group-hover:text-blue-500`}
                />
            </button>

            {isOpen && (
                <div className="absolute left-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 max-h-[300px] overflow-y-auto">
                        <div className="px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            Your Organizations
                        </div>
                        {organizations.map((org) => (
                            <button
                                key={org.id}
                                onClick={() => {
                                    onSwitch(org.id);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group/item ${org.id === currentOrg.id
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'hover:bg-gray-50 text-gray-700 hover:text-blue-600'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${org.id === currentOrg.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 group-hover/item:bg-blue-100 group-hover/item:text-blue-600'
                                        }`}>
                                        <Building2 size={16} />
                                    </div>
                                    <div className="text-sm font-bold text-left truncate max-w-[160px]">
                                        {org.name}
                                    </div>
                                </div>
                                {org.id === currentOrg.id && <Check size={16} className="text-blue-600" />}
                            </button>
                        ))}
                    </div>

                    <div className="p-2 bg-gray-50/80 border-t border-gray-100">
                        <button
                            onClick={() => {
                                onAdd();
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:shadow-md transition-all active:scale-[0.98]"
                        >
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Plus size={18} />
                            </div>
                            <span>Add New Organization</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrganizationSwitcher;
