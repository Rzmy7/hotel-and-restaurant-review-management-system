import React, { useRef } from 'react';
import { type UserProfile } from '../pages/ProfilePage';
import './ProfileSidebar.css';

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
        <div className="profile-sidebar-card">
            <div className="profile-avatar-section">
                {profile.avatar ? (
                    <img
                        src={profile.avatar}
                        alt={`${profile.firstName} ${profile.lastName}`}
                        className="profile-avatar-image"
                    />
                ) : (
                    <div className="profile-avatar-placeholder">
                        {getInitials()}
                    </div>
                )}
            </div>

            <h3 className="profile-name">
                {profile.firstName} {profile.lastName}
            </h3>
            <p className="profile-role">{profile.jobTitle}</p>

            <div className="profile-photo-actions">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
                <button
                    type="button"
                    className="btn-photo-action btn-edit"
                    onClick={handleEditPhotoClick}
                >
                    Edit Photo
                </button>
                <button
                    type="button"
                    className="btn-photo-action btn-change"
                    onClick={handleEditPhotoClick}
                >
                    Change
                </button>
            </div>

            <div className="profile-details-list">
                <div className="profile-detail-item">
                    <div className="detail-icon">📧</div>
                    <span className="detail-text">{profile.email}</span>
                </div>

                <div className="profile-detail-item">
                    <div className="detail-icon">📞</div>
                    <span className="detail-text">{profile.phone}</span>
                </div>

                <div className="profile-detail-item">
                    <div className="detail-icon">📍</div>
                    <span className="detail-text">{profile.location}</span>
                </div>

                <div className="profile-detail-item">
                    <div className="detail-icon">📅</div>
                    <span className="detail-text">Joined {profile.joinedDate}</span>
                </div>
            </div>
        </div>
    );
};

export default ProfileSidebar;