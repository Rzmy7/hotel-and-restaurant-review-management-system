import React from 'react';
import FormField from '../molecules/FormField';
import type { UserProfile } from '../../../pages/ProfilePage';
import { Save, X } from 'lucide-react';

interface ProfileFormProps {
    profile: UserProfile;
    onUpdate: (updated: UserProfile) => void;
    onSave: () => void;
    onCancel: () => void;
    isSaving: boolean;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ profile, onUpdate, onSave, onCancel, isSaving }) => {
    const COUNTRY_CODE = '+94';
    const phoneWithoutCountryCode = profile.phone.startsWith(COUNTRY_CODE)
        ? profile.phone.slice(COUNTRY_CODE.length).trimStart()
        : profile.phone.replace(/^\+\d+\s*/, '');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        onUpdate({ ...profile, [name]: value });
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const remainingNumber = e.target.value.replace(/\D/g, '');
        onUpdate({ ...profile, phone: `${COUNTRY_CODE}${remainingNumber}` });
    };

    return (
        <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm rounded-3xl border border-gray-100 dark:border-slate-800 p-8 shadow-sm transition-all duration-300">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase">
                        Personal Information
                    </h3>
                    <p className="text-[11px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                        These details will be used for your public profile
                    </p>
                </div>
            </div>

            <div className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField label="First Name" name="firstName" value={profile.firstName} onChange={handleChange} placeholder="Sarah" />
                    <FormField label="Last Name" name="lastName" value={profile.lastName} onChange={handleChange} placeholder="Johnson" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField label="Email" name="email" value={profile.email} type="email" onChange={handleChange} placeholder="sarah.j@example.com" />
                    <div>
                        <label className="block text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-2">
                            Phone Number
                        </label>
                        <div className="flex items-center h-12 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500 dark:focus-within:border-blue-500 transition-all">
                            <div className="h-full px-3 border-r border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-700 dark:text-slate-200 flex items-center gap-2 bg-gray-50 dark:bg-slate-800/70 whitespace-nowrap">
                                <span role="img" aria-label="Sri Lanka">🇱🇰</span>
                                <span>{COUNTRY_CODE}</span>
                            </div>
                            <input
                                id="phone"
                                name="phone"
                                type="tel"
                                inputMode="numeric"
                                value={phoneWithoutCountryCode}
                                onChange={handlePhoneChange}
                                placeholder="Enter phone number"
                                className="w-full h-full px-4 text-sm text-gray-900 dark:text-white bg-transparent outline-none placeholder:text-gray-400"
                            />
                        </div>
                        <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
                            Enter your phone number (without country code)
                        </p>
                    </div>
                </div>

                <FormField label="Job Title" name="jobTitle" value={profile.jobTitle} onChange={handleChange} placeholder="Hotel Manager" />
                <FormField label="Location" name="location" value={profile.location} onChange={handleChange} placeholder="New York, NY" />
                
                <FormField label="Bio" name="bio" value={profile.bio} onChange={handleChange} multiline placeholder="Describe your experience or role..." />
            </div>

            <div className="mt-10 pt-8 border-t border-gray-100 dark:border-slate-800 flex items-center gap-4 flex-wrap">
                <button
                    onClick={onSave}
                    disabled={isSaving}
                    className="h-12 px-8 bg-[#4e80ee] text-white rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-lg shadow-blue-100 dark:shadow-none hover:bg-blue-600 active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-70"
                >
                    <Save size={16} />
                    {isSaving ? 'Synchronizing...' : 'Update Profile'}
                </button>
                <button
                    onClick={onCancel}
                    className="h-12 px-8 bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-slate-400 rounded-2xl font-black text-[12px] uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center gap-2"
                >
                    <X size={16} />
                    Discard Changes
                </button>
            </div>
        </div>
    );
};

export default ProfileForm;
