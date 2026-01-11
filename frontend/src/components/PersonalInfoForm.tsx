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
import './PersonalInfoForm.css';

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
        <div className="personal-info-form">
            <div className="form-card">
                <h2 className="form-title">Personal Information</h2>
                
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">First Name</label>
                        <input
                            type="text"
                            name="firstName"
                            className="form-input"
                            value={profile.firstName}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Last Name</label>
                        <input
                            type="text"
                            name="lastName"
                            className="form-input"
                            value={profile.lastName}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                        type="email"
                        name="email"
                        className="form-input"
                        value={profile.email}
                        onChange={handleChange}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                        type="text"
                        name="phone"
                        className="form-input"
                        value={profile.phone}
                        onChange={handleChange}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Job Title</label>
                    <input
                        type="text"
                        name="jobTitle"
                        className="form-input"
                        value={profile.jobTitle}
                        onChange={handleChange}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Bio</label>
                    <textarea
                        name="bio"
                        className="form-textarea"
                        placeholder="Tell us about yourself..."
                        value={profile.bio}
                        onChange={handleChange}
                    />
                </div>

                <div className="form-actions">
                    <button 
                        type="button" 
                        className="btn btn-primary" 
                        onClick={onSave}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button 
                        type="button" 
                        className="btn btn-secondary"
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