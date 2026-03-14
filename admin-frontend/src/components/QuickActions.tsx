import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Users, 
    Building2, 
    Activity, 
    Settings, 
    Flag, 
    Bot,
    ChevronRight,
    Zap
} from 'lucide-react';

interface QuickAction {
    label: string;
    description: string;
    icon: React.ElementType;
    path: string;
    color: string;
    bgColor: string;
}

const quickActions: QuickAction[] = [
    {
        label: 'Manage Users',
        description: 'View and manage all platform users',
        icon: Users,
        path: '/users',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100'
    },
    {
        label: 'Organizations',
        description: 'Manage tenant organizations',
        icon: Building2,
        path: '/organizations',
        color: 'text-purple-600',
        bgColor: 'bg-purple-100'
    },
    {
        label: 'Embeddings',
        description: 'Manage embedding services',
        icon: Activity,
        path: '/embeddings',
        color: 'text-green-600',
        bgColor: 'bg-green-100'
    },
    {
        label: 'Feature Flags',
        description: 'Toggle platform features',
        icon: Flag,
        path: '/feature-flags',
        color: 'text-amber-600',
        bgColor: 'bg-amber-100'
    },
    {
        label: 'API Manage',
        description: 'Manage API keys and endpoints',
        icon: Bot,
        path: '/settings',
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-100'
    },
    {
        label: 'Platform Settings',
        description: 'Global platform configuration',
        icon: Settings,
        path: '/settings',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100'
    }
];

export const QuickActions: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                <Zap size={20} className="text-amber-500" />
                <h3 className="font-semibold text-gray-900">Quick Actions</h3>
            </div>
            <div className="p-3">
                <div className="grid grid-cols-2 gap-2">
                    {quickActions.map((action) => {
                        const Icon = action.icon;
                        return (
                            <button
                                key={action.label}
                                onClick={() => navigate(action.path)}
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                            >
                                <div className={`p-2 rounded-lg ${action.bgColor}`}>
                                    <Icon size={18} className={action.color} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {action.label}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                        {action.description}
                                    </p>
                                </div>
                                <ChevronRight 
                                    size={16} 
                                    className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" 
                                />
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
