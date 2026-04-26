import React from "react";
import { type UserProfile } from "../../pages/ProfilePage";

interface PersonalInfoFormProps {
  profile: UserProfile;
  onProfileUpdate: (updatedProfile: UserProfile) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

const PersonalInfoForm: React.FC<PersonalInfoFormProps> = ({
  profile,
  onProfileUpdate,
  onSave,
  onCancel,
  isSaving,
}) => {
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    onProfileUpdate({
      ...profile,
      [name]: value,
    });
  };

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-slate-700 box-border">
        <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white m-0 mb-6">
          Personal Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div className="mb-0">
            <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">
              First Name
            </label>
            <input
              type="text"
              name="firstName"
              className="w-full p-[10px_14px] border border-gray-300 dark:border-slate-600 rounded-lg text-[14px] text-gray-900 dark:text-white bg-white dark:bg-slate-700 transition-all duration-200 box-border
                            focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              value={profile.firstName}
              onChange={handleChange}
            />
          </div>
          <div className="mb-0">
            <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">
              Last Name
            </label>
            <input
              type="text"
              name="lastName"
              className="w-full p-[10px_14px] border border-gray-300 dark:border-slate-600 rounded-lg text-[14px] text-gray-900 dark:text-white bg-white dark:bg-slate-700 transition-all duration-200 box-border
                            focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              value={profile.lastName}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email Address
          </label>
          <input
            type="email"
            name="email"
            className="w-full p-[10px_14px] border border-gray-300 dark:border-slate-600 rounded-lg text-[14px] text-gray-900 dark:text-white bg-white dark:bg-slate-700 transition-all duration-200 box-border
                        focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
            value={profile.email}
            onChange={handleChange}
          />
        </div>

        <div className="mb-5">
          <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">
            Phone Number
          </label>
          <input
            type="text"
            name="phone"
            className="w-full p-[10px_14px] border border-gray-300 dark:border-slate-600 rounded-lg text-[14px] text-gray-900 dark:text-white bg-white dark:bg-slate-700 transition-all duration-200 box-border
                        focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
            value={profile.phone}
            onChange={handleChange}
          />
        </div>

        <div className="mb-5">
          <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">
            Job Title
          </label>
          <input
            type="text"
            name="jobTitle"
            className="w-full p-[10px_14px] border border-gray-300 dark:border-slate-600 rounded-lg text-[14px] text-gray-900 dark:text-white bg-white dark:bg-slate-700 transition-all duration-200 box-border
                        focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
            value={profile.jobTitle}
            onChange={handleChange}
          />
        </div>

        <div className="mb-0">
          <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bio
          </label>
          <textarea
            name="bio"
            className="w-full p-[10px_14px] border border-gray-300 dark:border-slate-600 rounded-lg text-[14px] text-gray-900 dark:text-white bg-white dark:bg-slate-700 transition-all duration-200 box-border resize-y min-h-[120px] leading-relaxed
                        focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
            placeholder="Tell us about yourself..."
            value={profile.bio}
            onChange={handleChange}
          />
        </div>

        <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-slate-700 antialiased flex-col md:flex-row">
          <button
            type="button"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg text-[14px] font-medium cursor-pointer transition-all duration-200
                        bg-blue-500 text-white border border-blue-500
                        hover:enabled:bg-blue-600 dark:bg-blue-600 dark:hover:enabled:bg-blue-500
                        disabled:opacity-70 disabled:cursor-not-allowed w-full md:w-auto"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg text-[14px] font-medium cursor-pointer transition-all duration-200
                        bg-white text-gray-700 border border-gray-300
                        hover:enabled:bg-gray-50 dark:bg-slate-700 dark:text-gray-200 dark:border-slate-600 dark:hover:enabled:bg-slate-600
                        disabled:opacity-70 disabled:cursor-not-allowed w-full md:w-auto"
            disabled={isSaving}
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoForm;
