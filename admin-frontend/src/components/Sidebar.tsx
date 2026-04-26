import React, { useState, useEffect } from 'react';
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
  Activity,
  CreditCard,
  Megaphone,
  MessageSquareText,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { getFrontendLoginUrl } from '../config/frontend';

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
    { to: '/subscription-plans', icon: CreditCard, label: 'Subscription Plans' },
    { to: '/broadcasting', icon: Megaphone, label: 'Broadcasting' },
    { to: '/reply-generation', icon: MessageSquareText, label: 'Reply Generation' },
    { to: '/review-processing', icon: Sparkles, label: 'Review Processing' },
    { to: '/settings', icon: SettingsIcon, label: 'Admin Setting' },
  ];

  const [userProfile, setUserProfile] = useState<{name: string, email: string, initials: string}>({
    name: 'Admin User',
    email: 'admin@company.com',
    initials: 'AD'
  });
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser');
    if (storedUser) {
      try {
        const payload = JSON.parse(storedUser);
        const name = payload.full_name || payload.name || 'Admin User';
        const email = payload.email || 'admin@company.com';
        
        let initials = 'AD';
        if (name) {
          const parts = name.split(' ');
          if (parts.length >= 2) {
            initials = (parts[0][0] + parts[1][0]).toUpperCase();
          } else {
            initials = name.substring(0, 2).toUpperCase();
          }
        }
        
        setUserProfile({ name, email, initials });
      } catch (e) {
        console.error("Failed to parse authUser in sidebar", e);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('authUser');
    window.location.href = getFrontendLoginUrl('logout=true');
  };

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
      <div className="px-3 py-4 border-t border-gray-100 bg-gray-50/50 relative">
        {showLogout && (
          <div className="absolute bottom-full left-0 w-full px-3 mb-2">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-2 animate-in fade-in slide-in-from-bottom-2">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        )}
        <div 
          onClick={() => setShowLogout(!showLogout)}
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white transition-colors cursor-pointer relative"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold shadow-md">
            {userProfile.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">{userProfile.name}</div>
            <div className="text-xs text-gray-500 truncate">{userProfile.email}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
