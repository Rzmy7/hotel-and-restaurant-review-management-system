import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronDown, Check, Plus, Building2 } from 'lucide-react';
import { navigationConfig } from '../../config/navigation';
import type { SidebarItemData, SidebarGroupData } from '../../types/navigation';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { useNavigationBlocker } from '../../contexts/NavigationBlockerContext';
import { useAuth } from '../../context/AuthContext';
import { notificationsService } from '../../services/notificationsService';
import LogoutConfirmationModal from './LogoutConfirmationModal';

/**
 * Props for the Sidebar component.
 */
interface SidebarProps {
  /** Whether the sidebar is currently in its expanded state. */
  isExpanded: boolean;
  /** Callback to toggle the expanded/collapsed state of the sidebar. */
  onToggle: () => void;
}

/**
 * Main Navigation Sidebar component.
 * Manages its own logout confirmation state and renders navigation sections and footer.
 */
const Sidebar: React.FC<SidebarProps> = ({ isExpanded, onToggle }) => {
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const refreshUnreadCount = async () => {
      try {
        const result = await notificationsService.getUnreadCount();
        if (isMounted) {
          setUnreadNotificationsCount(Math.max(0, Number(result.count || 0)));
        }
      } catch (error) {
        console.error('Failed to load unread notifications count:', error);
      }
    };

    refreshUnreadCount();
    const intervalId = window.setInterval(refreshUnreadCount, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const sectionsWithLiveBadges: SidebarGroupData[] = navigationConfig.sections.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      if (item.id !== 'notifications') {
        return item;
      }

      return {
        ...item,
        badge: unreadNotificationsCount > 0 ? String(unreadNotificationsCount) : undefined,
      };
    }),
  }));

  /**
   * Finalizes the logout process after user confirmation.
   */
  const handleLogoutConfirm = () => {
    logout();
    navigate('/login');
    setIsLogoutModalOpen(false);
  };

  return (
    <>
      <nav
        style={{ width: isExpanded ? 260 : 68 }}
        className="h-full bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800 flex flex-col font-sans shrink-0 relative transition-[width] duration-300 ease-in-out z-20"
      >
      <SidebarHeader isExpanded={isExpanded} onToggle={onToggle} />

      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 no-scrollbar">
        {sectionsWithLiveBadges.map((section, idx) => (
          <SidebarSection
            key={section.id}
            section={section}
            isExpanded={isExpanded}
            showDivider={idx > 0}
            onToggle={onToggle}
          />
        ))}
      </div>

        <SidebarFooter items={navigationConfig.footer} isExpanded={isExpanded} onLogoutClick={() => setIsLogoutModalOpen(true)} />
      </nav>

      <LogoutConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogoutConfirm}
      />
    </>
  );
};

/**
 * SidebarHeader component.
 * Renders the organization switcher and the sidebar toggle button.
 */
const SidebarHeader: React.FC<{ isExpanded: boolean; onToggle: () => void }> = ({ isExpanded, onToggle }) => {
  const organizations = useOrganizationStore(state => state.organizations);
  const currentOrg = useOrganizationStore(state => state.currentOrg);
  const switchOrganization = useOrganizationStore(state => state.switchOrganization);
  const addOrganization = useOrganizationStore(state => state.addOrganization);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentOrg) return null;

  /**
   * Generates initials for the organization name to display in the logo.
   */
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="relative shrink-0 z-50 px-2 pt-2" ref={dropdownRef}>
      <div className="flex items-center gap-1">
        <div
          onClick={() => {
            if (!isExpanded) {
              onToggle();
            } else {
              setIsDropdownOpen(!isDropdownOpen);
            }
          }}
          className={`
            flex items-center h-[60px] cursor-pointer rounded-xl transition-all duration-300 flex-1
            ${isExpanded ? 'px-3 hover:bg-gray-50 dark:hover:bg-slate-800' : 'justify-center'}
            ${isDropdownOpen ? 'bg-gray-50 dark:bg-slate-800' : ''}
          `}
        >
          <div
            className={`
              w-10 h-10 bg-brand text-white rounded-xl flex items-center justify-center font-bold text-lg shrink-0
              shadow-lg shadow-brand/20 transition-transform group-hover:scale-105 active:scale-95
            `}
          >
            {getInitials(currentOrg.name)}
          </div>

          <div className={`
            flex flex-col overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ml-3
            ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 ml-0'}
          `}>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-black dark:text-white text-sm tracking-tight truncate max-w-[110px]">
                {currentOrg.name}
              </span>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-none mt-0.5">
              {currentOrg.status === 'Active' ? 'ReviewHub' : 'Inactive'}
            </span>
          </div>
        </div>

        {isExpanded && (
          <button
            onClick={onToggle}
            className="w-8 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand hover:bg-brand/5 dark:hover:bg-slate-800 transition-all duration-200 shrink-0"
          >
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      {/* Dropdown Menu */}
      {isDropdownOpen && isExpanded && (
        <div className="absolute left-2 right-2 top-[70px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
          <div className="p-2 max-h-[300px] overflow-y-auto no-scrollbar">
            <div className="px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              My Organizations
            </div>
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  switchOrganization(org.id);
                  setIsDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 group/item ${org.id === currentOrg.id
                  ? 'bg-brand/5 text-brand dark:bg-blue-900/30 dark:text-blue-400'
                  : 'hover:bg-gray-50 text-gray-700 hover:text-brand dark:hover:bg-slate-700 dark:text-gray-300 dark:hover:text-blue-400'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${org.id === currentOrg.id ? 'bg-brand text-white' : 'bg-gray-100 text-gray-500 group-hover/item:bg-brand/10 group-hover/item:text-brand dark:bg-slate-700 dark:text-gray-400 dark:group-hover/item:bg-blue-900/30 dark:group-hover/item:text-blue-400'
                    }`}>
                    <Building2 size={14} />
                  </div>
                  <div className="text-[13px] font-bold text-left truncate max-w-[150px]">
                    {org.name}
                  </div>
                </div>
                {org.id === currentOrg.id && <Check size={14} className="text-brand dark:text-blue-400" />}
              </button>
            ))}
          </div>

          <div className="p-2 bg-gray-50/80 dark:bg-slate-800/80 border-t border-gray-100 dark:border-slate-700">
            <button
              onClick={() => {
                addOrganization();
                setIsDropdownOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-[13px] font-bold text-gray-600 dark:text-gray-300 hover:border-brand/40 hover:text-brand dark:hover:border-blue-500/50 dark:hover:text-blue-400 hover:shadow-sm transition-all active:scale-[0.98]"
            >
              <div className="w-8 h-8 rounded-lg bg-brand/5 text-brand flex items-center justify-center">
                <Plus size={16} />
              </div>
              <span>Add New Source</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * SidebarSection component.
 * Groups navigation items under a label and manages vertical spacing.
 */
const SidebarSection: React.FC<{
  section: SidebarGroupData;
  isExpanded: boolean;
  showDivider: boolean;
  onToggle: () => void;
}> = ({ section, isExpanded, showDivider, onToggle }) => {
  return (
    <div className="mb-1">
      {showDivider && <div className="h-px bg-gray-50 dark:bg-slate-800/80 my-2 mx-2" />}
      {section.label && (
        <div className={`
          text-[10px] font-bold text-gray-400 px-3 py-1.5 tracking-[1px] uppercase overflow-hidden whitespace-nowrap transition-all duration-300
          ${isExpanded ? 'opacity-100' : 'opacity-0 h-0 py-0'}
        `}>
          {section.label}
        </div>
      )}
      <div className="space-y-0.5">
        {section.items.map(item => (
          <SidebarItem key={item.id} item={item} isExpanded={isExpanded} onToggle={onToggle} />
        ))}
      </div>
    </div>
  );
};

/**
 * SidebarItem component.
 * Renders an individual navigation link with icon, label, and optional badge.
 * Handles interaction logic including navigation blocking and special actions like logout.
 */
const SidebarItem: React.FC<{
  item: SidebarItemData;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ item, isExpanded, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { attemptNavigation } = useNavigationBlocker();
  const { logout } = useAuth();
  
  // Highlighting: Check if current path matches item path or is a sub-route of it
  const isActive = item.path 
    ? item.path === '/' 
      ? location.pathname === '/' 
      : location.pathname.startsWith(item.path)
    : false;

  /**
   * Handles the item click event.
   * Intercepts logout or navigation-blocked routes.
   */
  const handleClick = () => {
    if (!item.path) return;

    if (item.id === 'logout') {
      onToggle(); // Open modal/handle logout
      return;
    }

    if (isActive) {
      onToggle();
    } else {
      if (attemptNavigation(item.path)) {
        navigate(item.path);
      }
    }
  };

  return (
    <div
      onClick={handleClick}
      title={!isExpanded ? item.label : undefined}
      className={`
        group flex items-center h-10 rounded-xl cursor-pointer relative transition-all duration-200
        ${isActive
          ? 'bg-brand text-white shadow-md shadow-brand/20 dark:shadow-blue-900/20'
          : item.isDanger
            ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
            : 'text-gray-500 hover:bg-gray-50 hover:text-black dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-white'}
        ${isExpanded ? 'px-3 gap-3' : 'justify-center mx-1'}
      `}
    >
      <span className={`shrink-0 transition-transform duration-200 ${!isActive && 'group-hover:scale-110'}`}>
        {item.icon}
      </span>

      <span className={`
        text-[14px] font-semibold whitespace-nowrap overflow-hidden transition-all duration-300
        ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}
      `}>
        {item.label}
      </span>

      {item.badge && isExpanded && (
        <span className={`
          ml-auto text-[10px] px-1.5 py-0.5 rounded-lg font-bold shrink-0
          ${isActive ? 'bg-white text-brand' : 'bg-brand text-white'}
        `}>
          {item.badge}
        </span>
      )}

      {item.badge && !isExpanded && (
        <span className="absolute top-2 right-2 w-2 h-2 bg-brand rounded-full border-2 border-white" />
      )}
    </div>
  );
};

/**
 * SidebarFooter component.
 * Renders footer navigation items (Help, Logout, etc.) and application version.
 */
const SidebarFooter: React.FC<{
  items: SidebarItemData[];
  isExpanded: boolean;
  onLogoutClick: () => void;
}> = ({ items, isExpanded, onLogoutClick }) => {
  return (
    <div className="mt-auto px-3 pb-3 pt-6 border-t border-gray-50 dark:border-slate-800/80">
      <div className="space-y-0.5">
        {items.map(item => (
          <SidebarItem
            key={item.id}
            item={item}
            isExpanded={isExpanded}
            onToggle={item.id === 'logout' ? onLogoutClick : () => { }}
          />
        ))}
      </div>
      <div className={`
        text-center text-[10px] text-gray-300 mt-4 transition-opacity duration-300 font-medium
        ${isExpanded ? 'opacity-100' : 'opacity-0'}
      `}>
        VERSION 2.4.1
      </div>
    </div>
  );
};

export default Sidebar;