import React from 'react';
import { Mail, Phone, MapPin, Calendar, Briefcase } from 'lucide-react';
import ProfileAvatar from '../atoms/ProfileAvatar';
import AvatarControl from '../molecules/AvatarControl';
import InfoItem from '../atoms/InfoItem';
import type { UserProfile } from '../../../pages/ProfilePage';

interface ProfileSidebarProps {
    profile: UserProfile;
    memberSince: string;
    onPhotoChange: (file: File) => void;
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({ profile,memberSince, onPhotoChange }) => {
    const initials = `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();

    return (
        <aside className="space-y-6">
            <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm rounded-3xl border border-gray-100 dark:border-slate-800 p-8 shadow-sm text-center relative overflow-hidden transition-all duration-300">
                <div className="relative inline-block mb-6">
                    <ProfileAvatar src={profile.avatar} initials={initials} size="xl" />
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
                    <InfoItem icon={<Calendar size={16} />} label="Joined System" value={`since ${profile.joinedDate}`} />
                </div>
            </div>

            {/*<div className="bg-[#4e80ee]/5 dark:bg-[#4e80ee]/10 rounded-3xl border border-[#4e80ee]/10 p-6 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#4e80ee] flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-200 dark:shadow-none">
                    <Briefcase size={20} />
                </div>
                <div>
                    <p className="text-[10px] font-black text-[#4e80ee] uppercase tracking-widest leading-none mb-1">
                        Assigned Role
                    </p>
                    <p className="text-[13px] font-bold text-gray-700 dark:text-slate-300">
                        Senior Account Administrator
                    </p>
                </div> 
            </div>   */}
        </aside>
    );
};

export default ProfileSidebar;
