import React from 'react';
import './ProfileHeader.css';

interface ProfileHeaderProps {
    title: string;
    subtitle: string;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ title, subtitle }) => {
    return (
        <div className="profile-header">
            <div className="profile-header-content">
                <div className="profile-header-text">
                    <h1>{title}</h1>
                    <p>{subtitle}</p>
                </div>
            </div>
        </div>
    );
};

export default ProfileHeader;