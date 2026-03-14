import React from 'react';
import ProfileHeader from '../organisms/ProfileHeader';
import ProfileSidebar from '../organisms/ProfileSidebar';
import ProfileForm from '../organisms/ProfileForm';
import type { UserProfile } from '../../../pages/ProfilePage';

interface ProfileTemplateProps {
    profile: UserProfile;
    onUpdate: (updated: UserProfile) => void;
    onSave: () => void;
    onCancel: () => void;
    onPhotoChange: (file: File) => void;
    isSaving: boolean;
}

const ProfileTemplate: React.FC<ProfileTemplateProps> = ({
    profile,
    onUpdate,
    onSave,
    onCancel,
    onPhotoChange,
    isSaving,
}) => {
    return (
        <div className="min-h-screen bg-[#fcfcfd] dark:bg-slate-900 flex flex-col">
            <ProfileHeader />

            <main className="flex-1 w-full max-w-[1200px] mx-auto px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
                    {/* Left: Interactive Form */}
                    <div className="w-full order-2 lg:order-1">
                        <ProfileForm
                            profile={profile}
                            onUpdate={onUpdate}
                            onSave={onSave}
                            onCancel={onCancel}
                            isSaving={isSaving}
                        />
                    </div>

                    {/* Right: Identity Sidebar */}
                    <div className="w-full order-1 lg:order-2">
                        <ProfileSidebar
                            profile={profile}
                            onPhotoChange={onPhotoChange}
                        />
                    </div>
                </div>
            </main>

            {/* Subtle Footer for spacing */}
            <div className="h-20 shrink-0" />
        </div>
    );
};

export default ProfileTemplate;
