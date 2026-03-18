import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../contexts/ToastContext";
import ProfileTemplate from "../components/profile/templates/ProfileTemplate";

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

const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const token = localStorage.getItem("token");

    const [profile, setProfile] = useState<UserProfile>({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        jobTitle: "",
        bio: "",
        location: "",
        joinedDate: "",
    });

    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    /**
     * Load profile (AUTO-FILL LOGIC)
     */
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const res = await fetch("http://127.0.0.1:8000/users/me", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = await res.json();

                setProfile({
                    firstName: data.firstName || "",
                    lastName: data.lastName || "",
                    email: data.email || "",
                    phone: data.phone || "",
                    jobTitle: data.jobTitle || "",
                    bio: data.bio || "",
                    location: data.location || "",
                    joinedDate: data.joinedDate || "",
                    avatar: data.avatar,
                });

                //  Show message if profile is empty
                if (!data.firstName && !data.lastName) {
                    showToast("Please complete your profile", "info");
                }

            } catch (error) {
                showToast("Failed to load profile", "error");
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [token, showToast]);

    /**
     * Update form state
     */
    const handleUpdate = useCallback((updated: UserProfile) => {
        setProfile(updated);
    }, []);

    /**
     * Save profile
     */
    const handleSave = useCallback(async () => {
        setIsSaving(true);

        try {
            const res = await fetch("http://127.0.0.1:8000/users/me", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    phone: profile.phone,
                    jobTitle: profile.jobTitle,
                    bio: profile.bio,
                    location: profile.location,
                }),
            });

            if (!res.ok) throw new Error();

            showToast("Profile saved successfully ✅", "success");

            //  Reload profile after save (important)
            window.location.reload();

        } catch (error) {
            showToast("Failed to update profile", "error");
        } finally {
            setIsSaving(false);
        }
    }, [profile, token, showToast]);

    const handleCancel = useCallback(() => {
        if (confirm("Discard your changes?")) {
            navigate("/dashboard");
        }
    }, [navigate]);

    const handlePhotoChange = useCallback(
        (file: File) => {
            const reader = new FileReader();

            reader.onloadend = () => {
                setProfile((prev) => ({
                    ...prev,
                    avatar: reader.result as string,
                }));

                showToast("Photo updated (preview only)", "info");
            };

            reader.readAsDataURL(file);
        },
        [showToast]
    );


    const formatMemberSince = (dateString: string) => {
        if (!dateString) return "";

        const cleanDate = dateString.replace(" ", "T"); // fix backend format
        const date = new Date(cleanDate);

        return date.toLocaleString("en-US", {
            month: "long",
            year: "numeric",
        });
    };

    const memberSince = formatMemberSince(profile.joinedDate);

    //  Show loading state
    if (loading) return <div>Loading profile...</div>;

    return (
        <ProfileTemplate
            profile={profile}
            memberSince={memberSince}
            onUpdate={handleUpdate}
            onSave={handleSave}
            onCancel={handleCancel}
            onPhotoChange={handlePhotoChange}
            isSaving={isSaving}
        />
    );
};

export default ProfilePage;