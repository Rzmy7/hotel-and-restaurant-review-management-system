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
  Key,
  Activity
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/organizations', icon: Building2, label: 'Organizations' },
    { to: '/users', icon: Users, label: 'Users' },
    { to: '/feature-flags', icon: Flag, label: 'Feature Flags' },
    { to: '/embeddings', icon: Database, label: 'Embeddings' },
    { to: '/scraping', icon: Search, label: 'Scraping' },
    { to: '/api-manage', icon: Key, label: 'API Management' },
    { to: '/monitoring', icon: Activity, label: 'Monitoring' },
    { to: '/settings', icon: SettingsIcon, label: 'Admin Setting' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white shadow-md">
          <Check size={20} strokeWidth={3} />
        </div>
        <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">AdminPanel</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-50 to-blue-50/50 text-blue-600 shadow-sm border border-blue-100'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} className={isActive ? 'text-blue-600' : 'text-gray-500'} strokeWidth={isActive ? 2.5 : 2} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Profile */}
      <div className="px-3 py-4 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white transition-colors cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold shadow-md">
            AD
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">Admin User</div>
            <div className="text-xs text-gray-500 truncate">admin@company.com</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
