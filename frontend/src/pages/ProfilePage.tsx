import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import ProfileTemplate from '../components/profile/templates/ProfileTemplate';

/**
 * Interface defining the user's profile information.
 */
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

/**
 * ProfilePage Component.
 * 
 * Provides a dedicated interface for users to manage their personal information.
 * Built with an atomic architecture for modularity and high visual fidelity.
 * 
 * @returns {React.FC} The redesigned Profile Page.
 */
const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    
    /**
     * Internal state for the user profile.
     * In production, this would be initialized from an AuthContext or API.
     */
    const [profile, setProfile] = useState<UserProfile>({
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.j@grandhotel.com',
        phone: '+1 (555) 123-4567',
        jobTitle: 'Hotel Manager',
        bio: 'Dedicated hospitality professional with over 10 years of experience in guest relations and operational management.',
        location: 'New York, NY',
        joinedDate: 'Jan 2024',
    });

    const [isSaving, setIsSaving] = useState(false);

    /**
     * Handles updates to the profile state from form fields.
     */
    const handleUpdate = useCallback((updated: UserProfile) => {
        setProfile(updated);
    }, []);

    /**
     * Persists profile changes to the backend.
     */
    const handleSave = useCallback(async () => {
        setIsSaving(true);
        try {
            // Simulated API call
            await new Promise(resolve => setTimeout(resolve, 1200));
            showToast('Account information updated successfully', 'success');
        } catch (error) {
            showToast('Failed to synchronize changes. Please try again.', 'error');
        } finally {
            setIsSaving(false);
        }
    }, [showToast]);

    /**
     * Discards unsaved changes and redirects to the dashboard.
     */
    const handleCancel = useCallback(() => {
        if (confirm('Discard your unsaved changes and leave?')) {
            navigate('/dashboard');
        }
    }, [navigate]);

    /**
     * Processes profile photo selection and updates the preview.
     */
    const handlePhotoChange = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            setProfile(prev => ({
                ...prev,
                avatar: reader.result as string
            }));
            showToast('Profile photo updated in preview', 'info');
        };
        reader.readAsDataURL(file);
    }, [showToast]);

    return (
        <ProfileTemplate
            profile={profile}
            onUpdate={handleUpdate}
            onSave={handleSave}
            onCancel={handleCancel}
            onPhotoChange={handlePhotoChange}
            isSaving={isSaving}
        />
    );
};

export default ProfilePage;