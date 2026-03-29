import React from 'react';
import { Camera } from 'lucide-react';
import { validateImage } from "../../../validators/fileValidator";

interface AvatarControlProps {
    onPhotoChange: (file: File) => void;
}

const AvatarControl: React.FC<AvatarControlProps> = ({ onPhotoChange }) => {
    // Reference to hidden file input
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // HANDLE FILE CHANGE
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        if (!file) return;

        try {
            //  Use centralized validator
            validateImage(file);

            //  If valid → send to parent
            onPhotoChange(file);

        } catch (error: any) {
            //  Show error message
            alert(error.message);
        }
    };


    return (
        <div className="relative group">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
            />

            { /*CAMERA BUTTON*/}
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-md border border-gray-100 dark:border-slate-700 flex items-center justify-center text-gray-500 hover:text-[#4e80ee] hover:scale-110 transition-all duration-300 z-10"
                title="Change Photo"
            >
                <Camera size={14} />
            </button>
        </div>
    );
};

export default AvatarControl;
