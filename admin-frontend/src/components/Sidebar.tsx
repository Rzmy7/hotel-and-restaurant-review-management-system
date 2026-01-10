import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, Users, Flag, Settings as SettingsIcon, Check } from 'lucide-react';
import './Sidebar.css';

export const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-icon">
          <Check size={18} strokeWidth={3} />
        </div>
        <span className="logo-text">AdminPanel</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/organizations" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Building2 size={20} />
          <span>Organizations</span>
        </NavLink>

        <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Users size={20} />
          <span>Users</span>
        </NavLink>

        <NavLink to="/feature-flags" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Flag size={20} />
          <span>Feature Flags</span>
        </NavLink>

        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <SettingsIcon size={20} />
          <span>Admin Settings</span>
        </NavLink>
      </nav>

      <div className="user-profile">
        <div className="avatar">AD</div>
        <div className="user-info">
          <span className="user-name">Admin User</span>
          <span className="user-email">admin@company.com</span>
        </div>
      </div>
    </aside>
  );
};
