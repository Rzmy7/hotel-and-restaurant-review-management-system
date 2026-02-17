import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import ProfileHeader from '../components/ProfileHeader';
import PersonalInfoForm from '../components/PersonalInfoForm';
import ProfileSidebar from '../components/ProfileSidebar';

interface ProfilePageProps {
    toggleSidebar: () => void;
}

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

const ProfilePage: React.FC<ProfilePageProps> = ({ toggleSidebar }) => {
    const navigate = useNavigate();
    const { showToast } = useToast();
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
            showToast('Profile updated successfully!', 'success');
        } catch (error) {
            showToast('Failed to save profile. ' + error, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (confirm('Discard unsaved changes?')) {
            navigate('/dashboard');
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
        <div className="w-full min-h-full bg-gray-50 flex flex-col">
            <ProfileHeader
                title="Profile"
                subtitle="Manage your personal information"
                onMenuClick={toggleSidebar}
            />

            <div className="w-full max-w-[1200px] mx-auto pt-10 px-8 box-border flex-1">
                {/* Grid Layout Logic:
                  - Default (Mobile): 1 column
                  - >968px: 1fr + 340px (using CSS logic from source: @media 1100px gap)
                  - >1100px: 1fr + 380px
                */}
                <div className="grid grid-cols-1 gap-6 
                    lg:grid-cols-[1fr_340px] 
                    xl:grid-cols-[1fr_380px] 
                    xl:gap-8 
                    items-start"
                >
                    {/* Left: Form */}
                    <div className="w-full">
                        <PersonalInfoForm
                            profile={profile}
                            onProfileUpdate={handleProfileUpdate}
                            onSave={handleSaveProfile}
                            onCancel={handleCancel}
                            isSaving={isSaving}
                        />
                    </div>

                    {/* Right: Sidebar Card - Order change logic handles via Flex/Grid naturally in Tailwind */}
                    <div className="w-full -order-1 lg:order-none mb-6 lg:mb-0">
                        <ProfileSidebar
                            profile={profile}
                            onPhotoChange={handlePhotoChange}
                        />
                    </div>
                </div>

                {/* Extra spacer */}
                <div className="h-[60px] w-full pointer-events-none"></div>
            </div>
        </div>
    );
};

export default ProfilePage;