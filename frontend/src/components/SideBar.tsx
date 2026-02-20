import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, MessageSquare, BarChart3, Target, Plug,
  Building2, Users, Settings, Bell, User, HelpCircle, Mail,
  LogOut, ChevronLeft
} from 'lucide-react';

interface SidebarProps {
  isExpanded: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isExpanded, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  // Click handler: if clicking the icon of the page you're already on, toggle the sidebar.
  // Otherwise, navigate to that page.
  const handleItemClick = (path: string) => {
    if (isActive(path)) {
      onToggle(); // toggle sidebar (expand if collapsed, collapse if expanded)
    } else {
      navigate(path);
    }
  };

  return (
    <nav
      style={{ width: isExpanded ? 260 : 68 }}
      className="h-full bg-white border-r border-gray-200 flex flex-col font-sans text-gray-600 shrink-0 relative transition-[width] duration-300 ease-in-out overflow-hidden"
    >
      {/* 1. HEADER */}
      <div
        className={`
          flex items-center border-b border-gray-100 shrink-0 h-[68px] 
          ${isExpanded ? 'px-4' : 'px-0 justify-center'}
        `}
      >
        {/* Logo mark — always visible, Expand if collapsed */}
        <div
          onClick={!isExpanded ? onToggle : undefined}
          className="w-9 h-9 bg-blue-500 text-white rounded-lg flex items-center justify-center font-bold text-sm shrink-0 cursor-pointer"
        >
          HR
        </div>

        {/* Brand text — fades + collapses */}
        <div
          className={`
            flex flex-col overflow-hidden whitespace-nowrap
            transition-all duration-300 ease-in-out
            ${isExpanded ? 'opacity-100 w-[140px] ml-3' : 'opacity-0 w-0 ml-0'}
          `}
        >
          <span className="font-semibold text-gray-800 text-[15px]">ReviewHub</span>
          <span className="text-xs text-gray-400">Grand Hotel NYC</span>
        </div>

        {/* Collapse-only chevron — only visible when expanded */}
        {isExpanded && (
          <button
            onClick={onToggle}
            title="Collapse sidebar"
            className="ml-auto shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all duration-200 border border-transparent hover:border-blue-100 cursor-pointer bg-transparent"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* 2. SCROLLABLE MENU */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded">

        {/* Main Section */}
        <div>
          <SidebarItem
            icon={<LayoutDashboard size={20} />}
            text="Dashboard"
            active={isActive('/dashboard')}
            onClick={() => handleItemClick('/dashboard')}
            isExpanded={isExpanded}
          />
          <SidebarItem
            icon={<MessageSquare size={20} />}
            text="Reviews"
            active={isActive('/reviews')}
            onClick={() => handleItemClick('/reviews')}
            isExpanded={isExpanded}
          />
          <SidebarItem icon={<BarChart3 size={20} />} text="Insights" isExpanded={isExpanded} />
          <SidebarItem icon={<Target size={20} />} text="Competitors" isExpanded={isExpanded} />
          <SidebarItem
            icon={<Plug size={20} />}
            text="Sources"
            active={isActive('/sources')}
            onClick={() => handleItemClick('/sources')}
            isExpanded={isExpanded}
          />
        </div>

        <div className="h-px bg-gray-100 my-2 mx-3" />

        {/* Organization Section */}
        <div>
          <SectionLabel text="ORGANIZATION" isExpanded={isExpanded} />
          <SidebarItem icon={<Building2 size={20} />} text="Groups & Branches" isExpanded={isExpanded} />
          <SidebarItem icon={<Users size={20} />} text="Subgroups" isExpanded={isExpanded} />
        </div>

        <div className="h-px bg-gray-100 my-2 mx-3" />

        {/* System Section */}
        <div>
          <SectionLabel text="SYSTEM" isExpanded={isExpanded} />
          <SidebarItem
            icon={<Settings size={20} />}
            text="Settings"
            active={isActive('/settings')}
            onClick={() => handleItemClick('/settings')}
            isExpanded={isExpanded}
          />
          <SidebarItem
            icon={<Bell size={20} />}
            text="Notifications"
            badge="3"
            isExpanded={isExpanded}
          />
          <SidebarItem
            icon={<User size={20} />}
            text="Profile"
            active={isActive('/profile')}
            onClick={() => handleItemClick('/profile')}
            isExpanded={isExpanded}
          />
        </div>
      </div>

      {/* 3. FOOTER — pinned to bottom */}
      <div className="border-t border-gray-100 py-2 shrink-0">
        <SidebarItem icon={<HelpCircle size={20} />} text="Help & Docs" isExpanded={isExpanded} />
        <SidebarItem icon={<Mail size={20} />} text="Contact Support" isExpanded={isExpanded} />
        <SidebarItem icon={<LogOut size={20} />} text="Logout" isDanger isExpanded={isExpanded} />

        {/* Version tag */}
        <div
          className={`
            text-center text-[11px] text-gray-300 mt-1 whitespace-nowrap
            transition-opacity duration-300
            ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          `}
        >
          v2.4.1
        </div>
      </div>
    </nav>
  );
};

// --- Section Label ---
const SectionLabel = ({ text, isExpanded }: { text: string; isExpanded: boolean }) => (
  <div
    className={`
      text-[11px] font-semibold text-gray-400 mx-3 tracking-[0.5px] uppercase
      overflow-hidden whitespace-nowrap
      transition-all duration-300 ease-in-out
      ${isExpanded ? 'opacity-100 h-6 leading-6 mt-4 mb-1' : 'opacity-0 h-0 mt-0 mb-0'}
    `}
  >
    {text}
  </div>
);

// --- Sidebar Item ---
interface SidebarItemProps {
  icon: React.ReactNode;
  text: string;
  active?: boolean;
  badge?: string;
  isDanger?: boolean;
  onClick?: () => void;
  isExpanded: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  icon, text, active = false, badge, isDanger = false, onClick, isExpanded
}) => {
  return (
    <div className="relative px-2 mb-0.5">
      <div
        className={`
          flex items-center h-10 rounded-lg cursor-pointer relative
          transition-colors duration-200
          hover:bg-gray-50
          ${active ? 'bg-blue-50 text-blue-500' : ''}
          ${isDanger ? 'text-red-600' : ''}
          ${isExpanded ? 'px-3 gap-3' : 'justify-center'}
        `}
        onClick={onClick}
        title={!isExpanded ? (badge ? `${text} (${badge})` : text) : undefined}
      >
        {/* Active indicator bar */}
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-blue-500 rounded-r" />
        )}

        {/* Icon */}
        <span className={`shrink-0 flex items-center justify-center w-5 h-5 ${active ? 'text-blue-500' : isDanger ? 'text-red-600' : 'text-gray-500'}`}>
          {icon}
        </span>

        {/* Text label — uses fixed width transition for smooth collapse */}
        <span
          style={{
            width: isExpanded ? 160 : 0,
            opacity: isExpanded ? 1 : 0,
          }}
          className="text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out"
        >
          {text}
        </span>

        {/* Badge — only when expanded */}
        {badge && isExpanded && (
          <span className="ml-auto bg-blue-500 text-white text-[11px] px-1.5 py-0.5 rounded-xl font-bold shrink-0">
            {badge}
          </span>
        )}

        {/* Badge dot — when collapsed */}
        {badge && !isExpanded && (
          <span className="absolute top-1.5 right-2 w-2 h-2 bg-blue-500 rounded-full" />
        )}
      </div>
    </div>
  );
};

export default Sidebar;