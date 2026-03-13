import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, Users, Flag, Settings as SettingsIcon, Check } from 'lucide-react';


export const Sidebar: React.FC = () => {
  return (
    <aside className="w-[280px] h-screen bg-gray-100 flex flex-col p-6 fixed left-0 top-0 z-50 border-r-0">
      <div className="flex items-center gap-2 mb-8 pl-1">
        <div className="w-8 h-8 bg-black rounded-lg text-white flex items-center justify-center">
          <Check size={18} strokeWidth={3} />
        </div>
        <span className="font-bold text-base text-gray-900">AdminPanel</span>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        <NavLink to="/" className={({ isActive }) => `flex items-center gap-4 p-4 rounded-lg font-medium text-[15px] transition-all duration-200 ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-black/5 hover:text-gray-900'}`}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/organizations" className={({ isActive }) => `flex items-center gap-4 p-4 rounded-lg font-medium text-[15px] transition-all duration-200 ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-black/5 hover:text-gray-900'}`}>
          <Building2 size={20} />
          <span>Organizations</span>
        </NavLink>

        <NavLink to="/users" className={({ isActive }) => `flex items-center gap-4 p-4 rounded-lg font-medium text-[15px] transition-all duration-200 ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-black/5 hover:text-gray-900'}`}>
          <Users size={20} />
          <span>Users</span>
        </NavLink>

        <NavLink to="/feature-flags" className={({ isActive }) => `flex items-center gap-4 p-4 rounded-lg font-medium text-[15px] transition-all duration-200 ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-black/5 hover:text-gray-900'}`}>
          <Flag size={20} />
          <span>Feature Flags</span>
        </NavLink>

        <NavLink to="/settings" className={({ isActive }) => `flex items-center gap-4 p-4 rounded-lg font-medium text-[15px] transition-all duration-200 ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-black/5 hover:text-gray-900'}`}>
          <SettingsIcon size={20} />
          <span>Admin Settings</span>
        </NavLink>
      </nav>

      <div className="flex items-center gap-4 pt-6 border-t border-gray-200">
        <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center font-semibold text-sm text-gray-900">AD</div>
        <div className="flex flex-col">
          <span className="font-semibold text-sm text-gray-900">Admin User</span>
          <span className="text-xs text-gray-500">admin@company.com</span>
        </div>
      </div>
    </aside>
  );
};
