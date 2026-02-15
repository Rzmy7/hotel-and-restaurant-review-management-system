import React, { useState } from 'react';
import ProfileHeader from '../components/ProfileHeader';
import PersonalInfoForm from '../components/PersonalInfoForm';
import ProfileSidebar from '../components/ProfileSidebar';

interface ProfilePageProps {
    toggleSidebar: () => void;
}


interface UserProfile {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    jobTitle: string;
    bio: string;
    location: string;
    joinedDate: string;
    avatar?: string;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ toggleSidebar }) => {
    const [profile, setProfile] = useState<UserProfile>({
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.j@grandhotel.com',
        phone: '+1 (555) 123-4567',
        jobTitle: 'Hotel Manager',
        bio: '',
        location: 'New York, NY',
        joinedDate: 'Jan 2024',
    });

    const [isSaving, setIsSaving] = useState(false);

    const handleProfileUpdate = (updatedProfile: UserProfile) => {
        setProfile(updatedProfile);
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            alert('Profile updated successfully!');
        } catch (error) {
            alert('Failed to save profile.' + error);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePhotoChange = (file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            setProfile(prev => ({
                ...prev,
                avatar: reader.result as string
            }));
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="profile-page-root">
            <ProfileHeader
                title="Profile"
                subtitle="Manage your personal information"
                onMenuClick={toggleSidebar}
            />
            
            <div className="profile-main-layout">
                <div className="profile-grid-wrapper">
                    {/* Left: Form */}
                    <div className="profile-form-area">
                        <PersonalInfoForm
                            profile={profile}
                            onProfileUpdate={handleProfileUpdate}
                            onSave={handleSaveProfile}
                            isSaving={isSaving}
                        />
                    </div>

                    {/* Right: Sidebar Card */}
                    <div className="profile-sidebar-area">
                        <ProfileSidebar
                            profile={profile}
                            onPhotoChange={handlePhotoChange}
                        />
                    </div>
                </div>
                {/* Extra spacer to ensure buttons are never cut off/blurred */}
                <div className="profile-footer-spacer"></div>
            </div>
        </div>
    );
};

export default ProfilePage;