import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // <--- 1. Import Router hooks
import { 
  LayoutDashboard, MessageSquare, BarChart3, Target, Plug, 
  Building2, Users, Settings, Bell, User, HelpCircle, Mail, LogOut, X 
} from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();   // Tool to change pages
  const location = useLocation();   // Tool to read current URL

  // Helper: Returns true if the current URL matches the path
  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Overlay */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose}></div>}
      
      {/* Sidebar */}
      <nav className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      {/* 1. HEADER */}
      <div className="sidebar-header">
        <div className="logo-avatar">HR</div>
        <div className="header-info">
          <span className="brand-name">ReviewHub</span>
          <span className="hotel-name">Grand Hotel NYC</span>
        </div>
        <button className="close-btn" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      {/* 2. MENU */}
      <div className="sidebar-menu">
        
        {/* Main Section */}
        <div className="menu-section">
          <SidebarItem 
            icon={<LayoutDashboard size={20} />} 
            text="Dashboard" 
            active={isActive('/dashboard')} 
            onClick={() => navigate('/dashboard')} 
          />
          <SidebarItem 
            icon={<MessageSquare size={20} />} 
            text="Reviews" 
            active={isActive('/reviews')} 
            onClick={() => navigate('/reviews')} 
          />
          {/* Note: You can add routes for these later in App.tsx */}
          <SidebarItem icon={<BarChart3 size={20} />} text="Insights" />
          <SidebarItem icon={<Target size={20} />} text="Competitors" />
          <SidebarItem 
            icon={<Plug size={20} />} 
            text="Sources" 
            active={isActive('/sources')} 
            onClick={() => navigate('/sources')} 
          />
        </div>

        <div className="divider"></div>

        {/* Organization Section */}
        <div className="menu-section">
          <div className="section-title">ORGANIZATION</div>
          <SidebarItem icon={<Building2 size={20} />} text="Groups & Branches" />
          <SidebarItem icon={<Users size={20} />} text="Team" />
        </div>

        <div className="divider"></div>

        {/* System Section */}
        <div className="menu-section">
          <div className="section-title">SYSTEM</div>
          <SidebarItem 
            icon={<Settings size={20} />} 
            text="Settings" 
            active={isActive('/settings')} 
            onClick={() => navigate('/settings')} 
          />
          <SidebarItem icon={<Bell size={20} />} text="Notifications" badge="3" />
          <SidebarItem 
            icon={<User size={20} />} 
            text="Profile" 
            active={isActive('/profile')} 
            onClick={() => navigate('/profile')}          
          />
        </div>

        <div className="divider"></div>

        {/* Footer Items */}
        <div className="menu-section">
          <SidebarItem icon={<HelpCircle size={20} />} text="Help & Docs" />
          <SidebarItem icon={<Mail size={20} />} text="Contact Support" />
          <SidebarItem icon={<LogOut size={20} />} text="Logout" isDanger />
        </div>

        <div className="version-tag">v2.4.1</div>
        <div style={{ height: '20px' }}></div>
      </div>
    </nav>
    </>
  );
};

// Reusable component (Stays the same)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SidebarItem = ({ icon, text, active = false, badge, isDanger = false, onClick }: any) => {
  return (
    <div 
      className={`sidebar-item ${active ? 'active' : ''} ${isDanger ? 'danger' : ''}`}
      onClick={onClick}
    >
      <span className="icon">{icon}</span>
      <span className="text">{text}</span>
      {badge && <span className="badge">{badge}</span>}
      {active && <div className="active-bar"></div>}
    </div>
  );
};

export default Sidebar;

//pasindu dilshan