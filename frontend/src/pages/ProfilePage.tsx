import React, { useState } from 'react';
<<<<<<< HEAD
import ProfileHeader from '../components/ProfileHeader';
import PersonalInfoForm from '../components/PersonalInfoForm';
import ProfileSidebar from '../components/ProfileSidebar';
import './ProfilePage.css';

interface ProfilePageProps {
    toggleSidebar: () => void;
}


interface UserProfile {
=======
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import ProfileHeader from '../components/shared/ProfileHeader';
import PersonalInfoForm from '../components/shared/PersonalInfoForm';
import ProfileSidebar from '../components/shared/ProfileSidebar';

interface ProfilePageProps {
    toggleSidebar?: () => void; // deprecated, no longer used
}

export interface UserProfile {
>>>>>>> prototype-frontend
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

<<<<<<< HEAD
const ProfilePage: React.FC<ProfilePageProps> = ({ toggleSidebar }) => {
=======
const ProfilePage: React.FC<ProfilePageProps> = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
>>>>>>> prototype-frontend
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
<<<<<<< HEAD
            alert('Profile updated successfully!');
        } catch (error) {
            alert('Failed to save profile.' + error);
=======
            showToast('Profile updated successfully!', 'success');
        } catch (error) {
            showToast('Failed to save profile. ' + error, 'error');
>>>>>>> prototype-frontend
        } finally {
            setIsSaving(false);
        }
    };

<<<<<<< HEAD
=======
    const handleCancel = () => {
        if (confirm('Discard unsaved changes?')) {
            navigate('/dashboard');
        }
    };

>>>>>>> prototype-frontend
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
<<<<<<< HEAD
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
=======
        <div className="w-full min-h-full bg-gray-50 dark:bg-slate-900 flex flex-col">
            <ProfileHeader
                title="Profile"
                subtitle="Manage your personal information"
            />

            <div className="flex-1 flex flex-col gap-6 p-4 md:px-8 md:py-6">
                <div className="grid grid-cols-1 gap-6 
                    lg:grid-cols-[1fr_340px] 
                    xl:grid-cols-[1fr_380px] 
                    xl:gap-8 
                    items-start"
                >
                    {/* Left: Form */}
                    <div className="w-full">
>>>>>>> prototype-frontend
                        <PersonalInfoForm
                            profile={profile}
                            onProfileUpdate={handleProfileUpdate}
                            onSave={handleSaveProfile}
<<<<<<< HEAD
=======
                            onCancel={handleCancel}
>>>>>>> prototype-frontend
                            isSaving={isSaving}
                        />
                    </div>

                    {/* Right: Sidebar Card */}
<<<<<<< HEAD
                    <div className="profile-sidebar-area">
=======
                    <div className="w-full -order-1 lg:order-none mb-6 lg:mb-0">
>>>>>>> prototype-frontend
                        <ProfileSidebar
                            profile={profile}
                            onPhotoChange={handlePhotoChange}
                        />
                    </div>
                </div>
<<<<<<< HEAD
                {/* Extra spacer to ensure buttons are never cut off/blurred */}
                <div className="profile-footer-spacer"></div>
=======
>>>>>>> prototype-frontend
            </div>
        </div>
    );
};

export default ProfilePage;