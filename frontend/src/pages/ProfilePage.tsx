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

    // 🔥 ADD THIS
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
        async (file: File) => {
            let previewUrl = "";
            let previousAvatar = profile.avatar; // 🔥 store old image

            try {
                // 🔄 START LOADING
                setIsUploading(true);

                // STEP 1: Show instant preview (UX)
                previewUrl = URL.createObjectURL(file);

                setProfile((prev) => ({
                    ...prev,
                    avatar: previewUrl,
                }));

                // STEP 2: Prepare form data
                const formData = new FormData();
                formData.append("file", file);

                // STEP 3: Call backend
                const res = await fetch("http://127.0.0.1:8000/users/me/upload-image", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                });

                if (!res.ok) throw new Error("Upload failed");

                const data = await res.json();

                console.log("UPLOAD RESPONSE:", data);

                // STEP 4: Replace preview with real URL
                setProfile((prev) => ({
                    ...prev,
                    avatar: data.profile_image_url,
                }));

                // 🧹 Clean memory (important)
                URL.revokeObjectURL(previewUrl);

                // STEP 5: Success message
                showToast("Profile image updated successfully ✅", "success");

            } catch (error) {
                console.error(error);

                // ❌ RESTORE OLD IMAGE (IMPORTANT UX FIX)
                setProfile((prev) => ({
                    ...prev,
                    avatar: previousAvatar,
                }));

                showToast("Failed to upload image", "error");

            } finally {
                // 🔄 STOP LOADING
                setIsUploading(false);
            }
        },
        [token, showToast, profile.avatar]
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