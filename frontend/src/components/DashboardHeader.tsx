import { useState, useRef, useEffect } from 'react';
import { Bell, CalendarDays, Menu } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import NotificationPanel from './NotificationPanel';
import ProfileDropdown from './ProfileDropdown';

interface DashboardHeaderProps {
  onMenuClick?: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onMenuClick }) => {
  const { showToast } = useToast();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close panels on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    };
    if (showNotifications || showProfile) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications, showProfile]);

  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev);
    setShowProfile(false);
  };

  const toggleProfile = () => {
    setShowProfile((prev) => !prev);
    setShowNotifications(false);
  };

  return (
    <header className="flex justify-between items-center px-8 py-5 bg-white border-b border-gray-200 max-md:flex-col max-md:items-start max-md:gap-4 transition-all">
      <div className="flex items-start gap-4">
        <button className="bg-transparent border-none cursor-pointer text-gray-500 p-1 flex items-center justify-center rounded-md hover:bg-gray-100 transition mt-0.5" onClick={onMenuClick}>
          <Menu size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 m-0 leading-tight">Grand Plaza Hotel</h1>
          <p className="mt-1 text-[13px] text-gray-400 m-0 leading-none">Review Management Dashboard</p>
        </div>
      </div>

      <div className="flex items-center gap-3 max-md:w-full max-md:justify-end">
        <button
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 cursor-pointer transition hover:bg-gray-50 hover:border-gray-400"
          onClick={() => showToast('Date range picker coming soon', 'info')}
        >
          <CalendarDays size={16} />
          <span>Last 30 Days</span>
        </button>

        {/* Notification Bell + Panel */}
        <div className="relative" ref={notifRef}>
          <button
            className={`w-10 h-10 grid place-items-center bg-white border rounded-full text-gray-500 cursor-pointer relative transition hover:bg-gray-100 ${showNotifications
              ? 'border-blue-300 bg-blue-50 text-blue-600'
              : 'border-gray-200'
              } ${unreadCount > 0
                ? "after:content-[''] after:absolute after:top-2 after:right-2 after:w-2 after:h-2 after:bg-red-500 after:rounded-full after:border-2 after:border-white"
                : ''
              }`}
            onClick={toggleNotifications}
          >
            <Bell size={18} />
          </button>

          {showNotifications && (
            <NotificationPanel
              onClose={() => setShowNotifications(false)}
              onUnreadCountChange={(count) => setUnreadCount(count)}
            />
          )}
        </div>

        {/* Profile Avatar + Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            className={`w-10 h-10 grid place-items-center bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full font-bold text-base cursor-pointer border-2 transition-all ${showProfile
                ? 'border-blue-300 ring-2 ring-blue-200'
                : 'border-transparent hover:ring-2 hover:ring-blue-200'
              }`}
            onClick={toggleProfile}
          >
            L
          </button>

          {showProfile && (
            <ProfileDropdown onClose={() => setShowProfile(false)} />
          )}
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
