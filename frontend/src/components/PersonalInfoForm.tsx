/*import React, { useState, useEffect } from 'react';
import { type UserProfile } from '../pages/ProfilePage';
import './PersonalInfoForm.css';

interface PersonalInfoFormProps {
    profile: UserProfile;
    onProfileUpdate: (profile: UserProfile) => void;
    onSave: () => void;
    isSaving?: boolean;
}

const PersonalInfoForm: React.FC<PersonalInfoFormProps> = ({
    profile,
    onProfileUpdate,
    onSave,
    isSaving = false
}) => {
    const [formData, setFormData] = useState<UserProfile>(profile);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        setFormData(profile);
    }, [profile]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        const updatedData = {
            ...formData,
            [name]: value,
        };
        setFormData(updatedData);
        setHasChanges(true);
        onProfileUpdate(updatedData);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave();
        setHasChanges(false);
    };

    const handleCancel = () => {
        setFormData(profile);
        setHasChanges(false);
    };

    return (
        <div className="personal-info-form">
            <form onSubmit={handleSubmit}>
                <div className="form-card">
                    <h2 className="form-title">Personal Information</h2>

                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="firstName" className="form-label">
                                First Name
                            </label>
                            <input
                                type="text"
                                id="firstName"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                className="form-input"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="lastName" className="form-label">
                                Last Name
                            </label>
                            <input
                                type="text"
                                id="lastName"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                className="form-input"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="email" className="form-label">
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="form-input"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="phone" className="form-label">
                            Phone Number
                        </label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="jobTitle" className="form-label">
                            Job Title
                        </label>
                        <input
                            type="text"
                            id="jobTitle"
                            name="jobTitle"
                            value={formData.jobTitle}
                            onChange={handleChange}
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="bio" className="form-label">
                            Bio
                        </label>
                        <textarea
                            id="bio"
                            name="bio"
                            value={formData.bio}
                            onChange={handleChange}
                            className="form-textarea"
                            rows={4}
                            placeholder="Tell us about yourself..."
                        />
                    </div>

                    <div className="form-actions">
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={!hasChanges || isSaving}
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleCancel}
                            disabled={!hasChanges || isSaving}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default PersonalInfoForm;*/


import React from 'react';
import { type UserProfile } from '../pages/ProfilePage';

interface PersonalInfoFormProps {
    profile: UserProfile;
    onProfileUpdate: (updatedProfile: UserProfile) => void;
    onSave: () => void;
    isSaving: boolean;
}

const PersonalInfoForm: React.FC<PersonalInfoFormProps> = ({
    profile,
    onProfileUpdate,
    onSave,
    isSaving
}) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        onProfileUpdate({
            ...profile,
            [name]: value
        });
    };

    return (
        <div className="w-full">
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 box-border">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Personal Information</h2>
                
                <div className="grid grid-cols-2 gap-5">
                    <div className="mb-5">
                        <label className="block text-[13px] font-medium text-gray-700 mb-2">First Name</label>
                        <input
                            type="text"
                            name="firstName"
                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white transition-all duration-200 box-border focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                            value={profile.firstName}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="mb-5">
                        <label className="block text-[13px] font-medium text-gray-700 mb-2">Last Name</label>
                        <input
                            type="text"
                            name="lastName"
                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white transition-all duration-200 box-border focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                            value={profile.lastName}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div className="mb-5">
                    <label className="block text-[13px] font-medium text-gray-700 mb-2">Email Address</label>
                    <input
                        type="email"
                        name="email"
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white transition-all duration-200 box-border focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                        value={profile.email}
                        onChange={handleChange}
                    />
                </div>

                <div className="mb-5">
                    <label className="block text-[13px] font-medium text-gray-700 mb-2">Phone Number</label>
                    <input
                        type="text"
                        name="phone"
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white transition-all duration-200 box-border focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                        value={profile.phone}
                        onChange={handleChange}
                    />
                </div>

                <div className="mb-5">
                    <label className="block text-[13px] font-medium text-gray-700 mb-2">Job Title</label>
                    <input
                        type="text"
                        name="jobTitle"
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white transition-all duration-200 box-border focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                        value={profile.jobTitle}
                        onChange={handleChange}
                    />
                </div>

                <div className="mb-5">
                    <label className="block text-[13px] font-medium text-gray-700 mb-2">Bio</label>
                    <textarea
                        name="bio"
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white transition-all duration-200 box-border resize-y min-h-[120px] leading-6 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                        placeholder="Tell us about yourself..."
                        value={profile.bio}
                        onChange={handleChange}
                    />
                </div>

                <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
                    <button 
                        type="button" 
                        className="px-6 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 inline-flex items-center justify-center bg-blue-500 text-white border border-blue-500 hover:bg-blue-600 disabled:opacity-70 disabled:cursor-not-allowed" 
                        onClick={onSave}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button 
                        type="button" 
                        className="px-6 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 inline-flex items-center justify-center bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-70 disabled:cursor-not-allowed"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PersonalInfoForm;