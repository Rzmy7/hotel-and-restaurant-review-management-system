import React from 'react';

interface ProfileAvatarProps {
    src?: string;
    initials: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ src, initials, size = 'md' }) => {
    const sizeClasses = {
        sm: 'w-10 h-10 text-sm',
        md: 'w-14 h-14 text-lg',
        lg: 'w-24 h-24 text-2xl',
        xl: 'w-32 h-32 text-4xl',
    };

    return (
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm shrink-0 flex items-center justify-center bg-gray-100 dark:bg-slate-700`}>
            {src ? (
                <img src={src} alt="Profile" className="w-full h-full object-cover" />
            ) : (
                <span className="font-bold text-gray-400 dark:text-slate-500 uppercase">
                    {initials}
                </span>
            )}
        </div>
    );
};

export default ProfileAvatar;
