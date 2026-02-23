import { useState, useRef, useEffect } from 'react';
import { Bell, CalendarDays } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import NotificationPanel from './NotificationPanel';
import ProfileDropdown from './ProfileDropdown';

interface DashboardHeaderProps {
  hotelName: string;
  hotelStatus: string;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ hotelName, hotelStatus }) => {
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
    <header className="sticky top-0 z-[40] flex justify-between items-center px-8 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100 max-md:flex-col max-md:items-start max-md:gap-4 transition-all duration-300">
      <div className="flex items-center gap-4">
        <div className="relative group">
          <h1 className="text-xl font-black text-gray-900 m-0 leading-tight tracking-tight group-hover:text-blue-600 transition-colors duration-300">
            {hotelName}
          </h1>
          <p className="mt-0.5 text-[10px] font-bold text-gray-400 m-0 leading-none uppercase tracking-[0.2em]">
            {hotelStatus}
          </p>
          <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 group-hover:w-full transition-all duration-500"></div>
        </div>
      </div>

      <div className="flex items-center gap-4 max-md:w-full max-md:justify-end">
        {/* Modern Date Range Picker */}
        <button
          className="flex items-center gap-2 px-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-[13px] font-bold text-gray-600 cursor-pointer transition-all hover:bg-white hover:border-blue-400 hover:text-blue-600 hover:shadow-md active:scale-95 shadow-sm"
          onClick={() => showToast('Date range picker coming soon', 'info')}
        >
          <CalendarDays size={16} className="text-gray-400 group-hover:text-blue-500" />
          <span>Last 30 Days</span>
        </button>

        {/* Improved Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            className={`w-10 h-10 grid place-items-center rounded-xl cursor-pointer relative transition-all duration-300 active:scale-90 ${showNotifications
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
              : 'bg-white border border-gray-200 text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:shadow-sm'
              }`}
            onClick={toggleNotifications}
          >
            <Bell size={20} className={showNotifications ? 'animate-bounce' : ''} />
            {unreadCount > 0 && !showNotifications && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white ring-2 ring-red-500/20 shadow-sm animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <NotificationPanel
              onClose={() => setShowNotifications(false)}
              onUnreadCountChange={(count) => setUnreadCount(count)}
            />
          )}
        </div>

        {/* User Profile - Sophisticated Avatar */}
        <div className="relative" ref={profileRef}>
          <button
            className={`w-10 h-10 flex items-center justify-center rounded-xl font-black text-sm cursor-pointer border-2 transition-all duration-300 hover:shadow-lg ${showProfile
              ? 'bg-blue-600 text-white border-blue-200 ring-4 ring-blue-50 scale-105'
              : 'bg-blue-500 text-white border-transparent hover:scale-105 active:scale-95'
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
