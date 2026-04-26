import React from 'react';
import { Mail, Phone, MapPin, Calendar } from 'lucide-react';
import ProfileAvatar from '../atoms/ProfileAvatar';
import AvatarControl from '../molecules/AvatarControl';
import InfoItem from '../atoms/InfoItem';
import type { UserProfile } from '../../../pages/ProfilePage';

interface ProfileSidebarProps {
    profile: UserProfile;
    memberSince: string;
    onPhotoChange: (file: File) => void;
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({
    profile,
    memberSince,
    onPhotoChange
}) => {

    //   Prevent crash if name is empty
    const initials = `${profile.firstName?.charAt(0) || ""}${profile.lastName?.charAt(0) || ""}`.toUpperCase();

    return (
        <aside className="space-y-6">
            <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm rounded-3xl border border-gray-100 dark:border-slate-800 p-8 shadow-sm text-center relative overflow-hidden transition-all duration-300">

                <div className="relative inline-block mb-6">
                    {/* Avatar display */}
                    <ProfileAvatar
                        src={profile.avatar}
                        initials={initials}
                        size="xl"
                    />

                    {/* Upload button */}
                    <AvatarControl onPhotoChange={onPhotoChange} />
                </div>

                <div className="space-y-1">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
                        {profile.firstName} {profile.lastName}
                    </h2>

                    <p className="text-[11px] font-black text-[#4e80ee] uppercase tracking-widest">
                        {profile.jobTitle}
                    </p>
                </div>

                <div className="mt-8 pt-8 border-t border-gray-100/50 dark:border-slate-700/50 grid gap-5 text-left">
                    <InfoItem icon={<Mail size={16} />} label="Email Address" value={profile.email} />
                    <InfoItem icon={<Phone size={16} />} label="Phone Number" value={profile.phone} />
                    <InfoItem icon={<MapPin size={16} />} label="Location" value={profile.location} />

                    {/* Use formatted memberSince */}
                    <InfoItem icon={<Calendar size={16} />} label="Joined System" value={memberSince} />
                </div>
            </div>
        </aside>
    );
};

export default ProfileSidebar;