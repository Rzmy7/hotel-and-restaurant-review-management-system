import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CalendarDays, Sun, Moon } from "lucide-react";
import { useToast } from "../../contexts/ToastContext";
import NotificationPanel from "../shared/NotificationPanel";
import ProfileDropdown from "../shared/ProfileDropdown";
import OrganizationSwitcher from "../shared/OrganizationSwitcher";
import { useOrganizationStore } from "../../stores/useOrganizationStore";
import { notificationsService } from "../../services/notificationsService";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";

const DashboardHeader: React.FC = () => {
  const navigate = useNavigate();
  const { exchangeTokenForOrganization } = useAuth();
  const organizations = useOrganizationStore((state) => state.organizations);
  const currentOrg = useOrganizationStore((state) => state.currentOrg);
  const switchOrganization = useOrganizationStore(
    (state) => state.switchOrganization,
  );
  const { showToast } = useToast();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme, darkModeAllowed } = useTheme();

  // Close panels on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setShowProfile(false);
      }
    };
    if (showNotifications || showProfile) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications, showProfile]);

  useEffect(() => {
    const refreshUnreadCount = async () => {
      try {
        const result = await notificationsService.getUnreadCount();
        setUnreadCount(result.count || 0);
      } catch (error) {
        console.error("Failed to load unread notifications count:", error);
      }
    };

    refreshUnreadCount();
    const intervalId = window.setInterval(refreshUnreadCount, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev);
    setShowProfile(false);
  };

  const toggleProfile = () => {
    setShowProfile((prev) => !prev);
    setShowNotifications(false);
  };

  return (
    <header className="sticky top-0 z-[40] flex justify-between items-center px-8 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 max-md:flex-col max-md:items-start max-md:gap-4 transition-all duration-300">
      <div className="flex items-center gap-4">
        {currentOrg && (
          <OrganizationSwitcher
            currentOrg={currentOrg}
            organizations={organizations}
            onSwitch={async (orgId) => {
              try {
                await exchangeTokenForOrganization(orgId);
                switchOrganization(orgId);
              } catch (e) {
                showToast("Failed to switch organization", "error");
              }
            }}
            onAdd={() => navigate("/setup")}
          />
        )}
      </div>

      <div className="flex items-center gap-4 max-md:w-full max-md:justify-end">
        {/* Modern Date Range Picker */}
        <button
          className="flex items-center gap-2 px-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-[13px] font-bold text-gray-600 cursor-pointer transition-all hover:bg-white hover:border-blue-400 hover:text-blue-600 hover:shadow-md active:scale-95 shadow-sm dark:bg-slate-800/50 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800 dark:hover:text-blue-400 dark:hover:border-blue-500"
          onClick={() => showToast("Date range picker coming soon", "info")}
        >
          <CalendarDays
            size={16}
            className="text-gray-400 group-hover:text-blue-500"
          />
          <span>Last 30 Days</span>
        </button>

        {/* Theme Toggle Button */}
        {darkModeAllowed && (
          <button
            onClick={() => {
              const isDark =
                theme === "dark" ||
                (theme === "system" &&
                  window.matchMedia("(prefers-color-scheme: dark)").matches);
              setTheme(isDark ? "light" : "dark");
            }}
            className="w-10 h-10 grid place-items-center rounded-full cursor-pointer transition-all duration-300 active:scale-90 bg-gray-50 border border-gray-200 text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-gray-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
            aria-label="Toggle Dark Mode"
          >
            {theme === "dark" ||
            (theme === "system" &&
              window.matchMedia("(prefers-color-scheme: dark)").matches) ? (
              <Sun size={20} />
            ) : (
              <Moon size={20} />
            )}
          </button>
        )}

        {/* Improved Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            className={`w-10 h-10 grid place-items-center rounded-xl cursor-pointer relative transition-all duration-300 active:scale-90 ${
              showNotifications
                ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/20"
                : "bg-white border border-gray-200 text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:hover:border-blue-500 dark:hover:text-blue-400"
            }`}
            onClick={toggleNotifications}
          >
            <Bell
              size={20}
              className={showNotifications ? "animate-bounce" : ""}
            />
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
            className={`w-10 h-10 flex items-center justify-center rounded-xl font-black text-sm cursor-pointer border-2 transition-all duration-300 hover:shadow-lg ${
              showProfile
                ? "bg-blue-600 text-white border-blue-200 ring-4 ring-blue-50 scale-105 dark:border-blue-800 dark:ring-blue-900/50"
                : "bg-blue-500 text-white border-transparent hover:scale-105 active:scale-95 dark:bg-blue-600"
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
