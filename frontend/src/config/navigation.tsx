import {
    LayoutDashboard,
    MessageSquare,
    BarChart3,
    Target,
    Plug,
    Building2,
    Users,
    Settings,
    Bell,
    User,
    HelpCircle,
    Mail,
    LogOut
} from 'lucide-react';
import type { NavigationConfig } from '../types/navigation';

export const navigationConfig: NavigationConfig = {
    sections: [
        {
            id: 'main',
            items: [
                {
                    id: 'dashboard',
                    label: 'Dashboard',
                    icon: <LayoutDashboard size={20} />,
                    path: '/dashboard'
                },
                {
                    id: 'reviews',
                    label: 'Reviews',
                    icon: <MessageSquare size={20} />,
                    path: '/reviews'
                },
                {
                    id: 'insights',
                    label: 'Insights',
                    icon: <BarChart3 size={20} />,
                    path: '/insights'
                },
                {
                    id: 'competitors',
                    label: 'Competitors',
                    icon: <Target size={20} />,
                    path: '/competitors'
                },
                {
                    id: 'sources',
                    label: 'Sources',
                    icon: <Plug size={20} />,
                    path: '/sources'
                }
            ]
        },
        {
            id: 'organization',
            label: 'ORGANIZATION',
            items: [
                {
                    id: 'groups',
                    label: 'Groups & Branches',
                    icon: <Building2 size={20} />,
                    path: '/groups'
                },
                {
                    id: 'subgroups',
                    label: 'Subgroups',
                    icon: <Users size={20} />,
                    path: '/subgroups'
                }
            ]
        },
        {
            id: 'system',
            label: 'SYSTEM',
            items: [
                {
                    id: 'settings',
                    label: 'Settings',
                    icon: <Settings size={20} />,
                    path: '/settings'
                },
                {
                    id: 'notifications',
                    label: 'Notifications',
                    icon: <Bell size={20} />,
                    path: '/notifications'
                },
                {
                    id: 'profile',
                    label: 'Profile',
                    icon: <User size={20} />,
                    path: '/profile'
                }
            ]
        }
    ],
    footer: [
        {
            id: 'help',
            label: 'Help & Docs',
            icon: <HelpCircle size={20} />,
            path: '/help'
        },
        {
            id: 'contact',
            label: 'Contact Support',
            icon: <Mail size={20} />,
            path: '/support'
        },
        {
            id: 'logout',
            label: 'Logout',
            icon: <LogOut size={20} />,
            isDanger: true,
            path: '/logout'
        }
    ]
};
