import React, { useState } from 'react';
import ProfileHeader from '../components/ProfileHeader';
import PersonalInfoForm from '../components/PersonalInfoForm';
import ProfileSidebar from '../components/ProfileSidebar';
import './ProfilePage.css';

export interface UserProfile {
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

const ProfilePage: React.FC = () => {
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
            console.log('Profile saved:', profile);
            alert('Profile updated successfully!');
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('Failed to save profile. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePhotoChange = (file: File) => {
        console.log('Photo selected:', file);
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
        <div className="profile-page">
            <ProfileHeader
                title="Profile"
                subtitle="Manage your personal information"
            />

            <div className="profile-content">
                <div className="profile-main">
                    <PersonalInfoForm
                        profile={profile}
                        onProfileUpdate={handleProfileUpdate}
                        onSave={handleSaveProfile}
                        isSaving={isSaving}
                    />
                </div>

                <div className="profile-aside">
                    <ProfileSidebar
                        profile={profile}
                        onPhotoChange={handlePhotoChange}
                    />
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;