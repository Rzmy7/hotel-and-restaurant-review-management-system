import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // <--- 1. Import Router hooks
import { 
  LayoutDashboard, MessageSquare, BarChart3, Target, Plug, 
  Building2, Users, Settings, Bell, User, HelpCircle, Mail, LogOut, X 
} from 'lucide-react';

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
      {isOpen && <div className="fixed inset-0 bg-black/50 z-[999] animate-fadeIn" onClick={onClose}></div>}
      
      {/* Sidebar */}
      <nav className={`w-[260px] h-screen bg-white border-r border-gray-200 flex flex-col text-gray-600 overflow-hidden fixed -left-[260px] top-0 z-[1000] transition-[left] duration-300 ease-in-out ${isOpen ? 'left-0' : ''}`}>
      {/* 1. HEADER */}
      <div className="p-5 flex items-center gap-3 border-b border-transparent flex-shrink-0">
        <div className="w-9 h-9 bg-blue-500 text-white rounded-lg flex items-center justify-center font-bold text-sm">HR</div>
        <div className="flex flex-col flex-1">
          <span className="font-semibold text-gray-800 text-[15px]">ReviewHub</span>
          <span className="text-xs text-gray-400">Grand Hotel NYC</span>
        </div>
        <button className="bg-transparent border-none cursor-pointer text-gray-400 p-1 flex items-center justify-center rounded transition-colors duration-200 hover:bg-gray-100" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      {/* 2. MENU */}
      <div className="flex-1 overflow-y-auto p-2.5 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
        
        {/* Main Section */}
        <div>
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
          <SidebarItem 
            icon={<Target size={20} />} 
            text="Competitors" 
            active={isActive('/competitors')} 
            onClick={() => navigate('/competitors')} 
          />
          <SidebarItem 
            icon={<Plug size={20} />} 
            text="Sources" 
            active={isActive('/sources')} 
            onClick={() => navigate('/sources')} 
          />
        </div>

        <div className="h-px bg-gray-100 my-2.5"></div>

        {/* Organization Section */}
        <div>
          <div className="text-[11px] font-semibold text-gray-400 mt-5 mb-2.5 ml-2.5 tracking-wider uppercase">ORGANIZATION</div>
          <SidebarItem icon={<Building2 size={20} />} text="Groups & Branches" />
          <SidebarItem icon={<Users size={20} />} text="Subgroups" />
        </div>

        <div className="h-px bg-gray-100 my-2.5"></div>

        {/* System Section */}
        <div>
          <div className="text-[11px] font-semibold text-gray-400 mt-5 mb-2.5 ml-2.5 tracking-wider uppercase">SYSTEM</div>
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

        <div className="h-px bg-gray-100 my-2.5"></div>

        {/* Footer Items */}
        <div>
          <SidebarItem icon={<HelpCircle size={20} />} text="Help & Docs" />
          <SidebarItem icon={<Mail size={20} />} text="Contact Support" />
          <SidebarItem icon={<LogOut size={20} />} text="Logout" isDanger />
        </div>

        <div className="text-center text-[11px] text-gray-300 mt-5 mb-2.5">v2.4.1</div>
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
      className={`flex items-center py-2.5 px-3 mb-1 rounded-lg cursor-pointer relative transition-all duration-200 ${
        active ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
      } ${
        isDanger ? 'text-red-600' : ''
      }`}
      onClick={onClick}
    >
      <span className={`mr-3 ${
        active ? 'text-blue-600' : 'text-gray-500'
      } ${
        isDanger ? 'text-red-600' : ''
      }`}>{icon}</span>
      <span className="flex-1 text-sm font-medium">{text}</span>
      {badge && <span className="bg-blue-600 text-white text-[11px] px-1.5 py-0.5 rounded-xl font-bold">{badge}</span>}
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-blue-600 rounded-r"></div>}
    </div>
  );
};

export default Sidebar;