import React, { useRef } from 'react';
import { type UserProfile } from '../pages/ProfilePage';

interface ProfileSidebarProps {
    profile: UserProfile;
    onPhotoChange: (file: File) => void;
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({ profile, onPhotoChange }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getInitials = () => {
        return `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();
    };

    const handleEditPhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                alert('File size must be less than 5MB');
                return;
            }

            onPhotoChange(file);
        }
    };

    return (
        <div className="bg-white rounded-xl py-8 px-6 shadow-sm border border-gray-200 text-center box-border">
            <div className="mb-5 flex justify-center">
                {profile.avatar ? (
                    <img
                        src={profile.avatar}
                        alt={`${profile.firstName} ${profile.lastName}`}
                        className="w-[100px] h-[100px] rounded-full object-cover shadow-md border-[3px] border-white"
                    />
                ) : (
                    <div className="w-[100px] h-[100px] bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-4xl font-semibold text-white shadow-[0_4px_6px_rgba(59,130,246,0.2)]">
                        {getInitials()}
                    </div>
                )}
            </div>

            <h3 className="text-xl font-semibold text-gray-900 m-0 mb-1.5">
                {profile.firstName} {profile.lastName}
            </h3>
            <p className="text-sm text-gray-500 m-0 mb-6">{profile.jobTitle}</p>

            <div className="flex gap-2.5 justify-center mb-8 pb-8 border-b border-gray-200">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
                <button
                    type="button"
                    className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer transition-all duration-200 border-none whitespace-nowrap bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                    onClick={handleEditPhotoClick}
                >
                    Edit Photo
                </button>
                <button
                    type="button"
                    className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer transition-all duration-200 border-none whitespace-nowrap bg-blue-500 text-white hover:bg-blue-600 hover:shadow-[0_2px_4px_rgba(59,130,246,0.2)] active:bg-blue-700"
                    onClick={handleEditPhotoClick}
                >
                    Change
                </button>
            </div>

            <div className="flex flex-col gap-4 text-left">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 transition-colors duration-200 hover:bg-gray-100">
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-white rounded-md text-base">📧</div>
                    <span className="flex-1 text-sm text-gray-700 break-words">{profile.email}</span>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 transition-colors duration-200 hover:bg-gray-100">
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-white rounded-md text-base">📞</div>
                    <span className="flex-1 text-sm text-gray-700 break-words">{profile.phone}</span>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 transition-colors duration-200 hover:bg-gray-100">
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-white rounded-md text-base">📍</div>
                    <span className="flex-1 text-sm text-gray-700 break-words">{profile.location}</span>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 transition-colors duration-200 hover:bg-gray-100">
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-white rounded-md text-base">📅</div>
                    <span className="flex-1 text-sm text-gray-700 break-words">Joined {profile.joinedDate}</span>
                </div>
            </div>
        </div>
    );
};

export default ProfileSidebar;