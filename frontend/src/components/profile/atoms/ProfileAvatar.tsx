import React from 'react';

interface ProfileAvatarProps {
    src?: string; // 🔹 Image URL from backend (Supabase)
    initials: string; // 🔹 Fallback text if no image
    size?: 'sm' | 'md' | 'lg' | 'xl'; // 🔹 Avatar sizes
}

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
    src,
    initials,
    size = 'md'
}) => {

    // 🔹 Size styles for different avatar sizes
    const sizeClasses = {
        sm: 'w-10 h-10 text-sm',
        md: 'w-14 h-14 text-lg',
        lg: 'w-24 h-24 text-2xl',
        xl: 'w-32 h-32 text-4xl',
    };

    // 🔥 IMPORTANT FIX: Prevent browser cache issue
    // If we use same URL, browser shows old image
    // So we add timestamp to force reload
    const imageUrl = src ? `${src}?t=${new Date().getTime()}` : null;

    return (
        <div
            className={`
                ${sizeClasses[size]}
                rounded-full
                overflow-hidden
                border-2 border-white dark:border-slate-800
                shadow-sm
                shrink-0
                flex items-center justify-center
                bg-gray-100 dark:bg-slate-700
            `}
        >
            {/* 🔹 If image exists → show image */}
            {imageUrl ? (
                <img
                    src={imageUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                />
            ) : (
                // 🔹 If no image → show initials
                <span className="font-bold text-gray-400 dark:text-slate-500 uppercase">
                    {initials}
                </span>
            )}
        </div>
    );
};

export default ProfileAvatar;