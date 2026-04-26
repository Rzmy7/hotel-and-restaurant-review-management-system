import React, { useRef } from "react";
import { type UserProfile } from "../../pages/ProfilePage";
import { useToast } from "../../contexts/ToastContext";

interface ProfileSidebarProps {
  profile: UserProfile;
  onPhotoChange: (file: File) => void;
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({
  profile,
  onPhotoChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const getInitials = () => {
    return `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();
  };

  const handleEditPhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        showToast("Please select an image file", "error");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showToast("File size must be less than 5MB", "error");
        return;
      }

      onPhotoChange(file);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-[12px] p-8 shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-gray-200 dark:border-slate-700 w-full box-border">
      <div className="flex flex-col items-center mb-6">
        {profile.avatar ? (
          <img
            src={profile.avatar}
            alt={`${profile.firstName} ${profile.lastName}`}
            className="w-32 h-32 rounded-full object-cover mb-4 border border-gray-200 dark:border-slate-700"
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-4xl font-semibold text-gray-400 dark:text-slate-500 mb-4 border border-gray-200 dark:border-slate-700">
            {getInitials()}
          </div>
        )}
      </div>

      <h3 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-1">
        {profile.firstName} {profile.lastName}
      </h3>
      <p className="text-sm text-gray-500 dark:text-slate-400 text-center mb-6">
        {profile.jobTitle}
      </p>

      <div className="flex justify-center gap-3 mb-8 border-b border-gray-200 dark:border-slate-700 pb-8">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600 active:bg-gray-100 dark:active:bg-slate-500"
          onClick={handleEditPhotoClick}
        >
          Edit Photo
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="text-lg w-6 flex justify-center">📧</div>
          <span className="text-sm text-gray-600 dark:text-slate-300 truncate">
            {profile.email}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-lg w-6 flex justify-center">📞</div>
          <span className="text-sm text-gray-600 dark:text-slate-300">
            {profile.phone}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-lg w-6 flex justify-center">📍</div>
          <span className="text-sm text-gray-600 dark:text-slate-300">
            {profile.location}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-lg w-6 flex justify-center">📅</div>
          <span className="text-sm text-gray-600 dark:text-slate-300">
            Joined {profile.joinedDate}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProfileSidebar;
