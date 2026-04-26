import React from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Settings,
  HelpCircle,
  LogOut,
  Shield,
  ChevronRight,
} from "lucide-react";
import { useToast } from "../../contexts/ToastContext";

interface ProfileDropdownProps {
  onClose: () => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  const menuItems = [
    {
      icon: <User size={16} />,
      label: "My Profile",
      subtitle: "View & edit your profile",
      onClick: () => handleNavigate("/profile"),
    },
    {
      icon: <Settings size={16} />,
      label: "Settings",
      subtitle: "App preferences",
      onClick: () => handleNavigate("/settings"),
    },
    {
      icon: <Shield size={16} />,
      label: "Privacy & Security",
      subtitle: "Manage your data",
      onClick: () => {
        onClose();
        showToast("Privacy settings coming soon", "info");
      },
    },
    {
      icon: <HelpCircle size={16} />,
      label: "Help & Support",
      subtitle: "Get assistance",
      onClick: () => handleNavigate("/help"),
    },
  ];

  return (
    <div
      className="absolute right-0 top-[calc(100%+8px)] w-[280px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden"
      style={{ animation: "fadeIn 0.15s ease-out" }}
    >
      {/* User Info */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 grid place-items-center bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full font-bold text-base shrink-0">
            L
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 m-0 truncate">
              Liam Anderson
            </p>
            <p className="text-xs text-gray-400 m-0 mt-0.5 truncate">
              liam@grandplazahotel.com
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
            Admin
          </span>
          <span className="text-[11px] text-gray-400">Grand Plaza Hotel</span>
        </div>
      </div>

      {/* Menu Items */}
      <div className="py-1.5">
        {menuItems.map((item, idx) => (
          <button
            key={idx}
            className="w-full flex items-center gap-3 px-5 py-2.5 bg-transparent border-none text-left cursor-pointer transition-colors hover:bg-gray-50 group"
            onClick={item.onClick}
          >
            <div className="w-8 h-8 rounded-lg bg-gray-100 grid place-items-center text-gray-500 shrink-0 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 m-0 group-hover:text-gray-900 transition-colors">
                {item.label}
              </p>
              <p className="text-[11px] text-gray-400 m-0 mt-0.5">
                {item.subtitle}
              </p>
            </div>
            <ChevronRight
              size={14}
              className="text-gray-300 group-hover:text-gray-400 transition-colors"
            />
          </button>
        ))}
      </div>

      {/* Logout */}
      <div className="border-t border-gray-100 py-1.5">
        <button
          className="w-full flex items-center gap-3 px-5 py-2.5 bg-transparent border-none text-left cursor-pointer transition-colors hover:bg-red-50 group"
          onClick={() => {
            onClose();
            showToast("Logging out…", "info");
            setTimeout(() => {
              navigate("/login");
            }, 800);
          }}
        >
          <div className="w-8 h-8 rounded-lg bg-gray-100 grid place-items-center text-gray-500 shrink-0 group-hover:bg-red-100 group-hover:text-red-500 transition-colors">
            <LogOut size={16} />
          </div>
          <p className="text-sm font-medium text-gray-700 m-0 group-hover:text-red-600 transition-colors">
            Log Out
          </p>
        </button>
      </div>
    </div>
  );
};

export default ProfileDropdown;
