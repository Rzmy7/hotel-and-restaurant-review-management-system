import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Flag, 
  Settings as SettingsIcon, 
  Check,
  Database,
  Search,
  Key
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/organizations', icon: Building2, label: 'Organizations' },
    { to: '/users', icon: Users, label: 'Users' },
    { to: '/feature-flags', icon: Flag, label: 'Feature Flags' },
    { to: '/settings', icon: SettingsIcon, label: 'Admin Setting' },
    { to: '/embeddings', icon: Database, label: 'Embeddings' },
    { to: '/scraping', icon: Search, label: 'Scraping' },
    { to: '/api-manage', icon: Key, label: 'API Manage' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-100 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white">
          <Check size={18} strokeWidth={3} />
        </div>
        <span className="text-lg font-semibold text-gray-900">AdminPanel</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-200'
              }`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
