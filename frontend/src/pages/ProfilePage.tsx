import React, { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../contexts/ToastContext";
import ProfileTemplate from "../components/profile/templates/ProfileTemplate";
import UnsavedChangesModal from "../components/profile/organisms/UnsavedChangesModal";
import { apiClient } from "../api/client";
import { useNavigationBlocker } from "../contexts/NavigationBlockerContext";

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

/** Fields the user can actually edit (exclude read-only: email, joinedDate, avatar) */
const EDITABLE_KEYS: (keyof UserProfile)[] = [
    "firstName", "lastName", "phone", "jobTitle", "bio", "location",
];

/** Deep-compare only editable fields to know if the form is dirty */
const isDirty = (saved: UserProfile, current: UserProfile): boolean =>
    EDITABLE_KEYS.some(k => (saved[k] ?? "") !== (current[k] ?? ""));

const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const token = localStorage.getItem("token");

    // ── The server-saved "clean" snapshot ───────────────────────────────
    const [savedProfile, setSavedProfile] = useState<UserProfile>({
        firstName: "", lastName: "", email: "", phone: "",
        jobTitle: "", bio: "", location: "", joinedDate: "",
    });

    // ── Working (potentially dirty) copy ────────────────────────────────
    const [profile, setProfile] = useState<UserProfile>({ ...savedProfile });

    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    // ── Navigation blocker (Custom context for BrowserRouter) ──────────────
    const { setIsDirty, registerBlockHandler, unregisterBlockHandler } = useNavigationBlocker();
    const [showModal, setShowModal] = useState(false);
    const [pendingPath, setPendingPath] = useState<string | null>(null);

    // Track whether there are unsaved changes
    const hasUnsaved = isDirty(savedProfile, profile);

    // Register our dirty state and block handler with the global context
    useEffect(() => {
        setIsDirty(hasUnsaved);
        
        if (hasUnsaved) {
            registerBlockHandler((targetPath) => {
                setPendingPath(targetPath);
                setShowModal(true);
            });
        } else {
            unregisterBlockHandler();
        }

        return () => {
            setIsDirty(false);
            unregisterBlockHandler();
        };
    }, [hasUnsaved, setIsDirty, registerBlockHandler, unregisterBlockHandler]);

    // ── Browser tab close / refresh guard ───────────────────────────────
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsaved) {
                e.preventDefault();
                e.returnValue = ""; // triggers the browser's native "Leave site?" dialog
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [hasUnsaved]);

    // ── Load profile ─────────────────────────────────────────────────────
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const data = await apiClient.get<any>("/users/me");
                const loaded: UserProfile = {
                    firstName: data.firstName || "",
                    lastName: data.lastName || "",
                    email: data.email || "",
                    phone: data.phone || "",
                    jobTitle: data.jobTitle || "",
                    bio: data.bio || "",
                    location: data.location || "",
                    joinedDate: data.joinedDate || "",
                    avatar: data.avatar,
                };
                setSavedProfile(loaded);
                setProfile(loaded);

                if (!data.firstName && !data.lastName) {
                    showToast("Please complete your profile", "info");
                }
            } catch {
                showToast("Failed to load profile", "error");
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, [token, showToast]);

    // ── Update form state ─────────────────────────────────────────────────
    const handleUpdate = useCallback((updated: UserProfile) => {
        setProfile(updated);
    }, []);

    // ── Save profile ──────────────────────────────────────────────────────
    const handleSave = useCallback(async () => {
        setIsSaving(true);
        try {
            await apiClient.put<any>("/users/me", {
                firstName: profile.firstName,
                lastName: profile.lastName,
                phone: profile.phone,
                jobTitle: profile.jobTitle,
                bio: profile.bio,
                location: profile.location,
            });

            showToast("Profile saved successfully ✅", "success");

            // Mark as clean
            setSavedProfile({ ...profile });
            setIsDirty(false); // Global context update

            // If we were blocked, navigate to the target now that it's saved
            if (showModal && pendingPath) {
                setShowModal(false);
                navigate(pendingPath);
            } else {
                window.location.reload();
            }
        } catch {
            showToast("Failed to update profile", "error");
        } finally {
            setIsSaving(false);
        }
    }, [profile, showToast, showModal, pendingPath, navigate, setIsDirty]);

    // ── Cancel / Discard ──────────────────────────────────────────────────
    const handleCancel = useCallback(() => {
        if (hasUnsaved) {
            // Trigger blocker manually
            setPendingPath("/dashboard");
            setShowModal(true);
        } else {
            navigate("/dashboard");
        }
    }, [navigate, hasUnsaved]);

    // Modal action: Discard all changes and proceed with navigation
    const handleDiscard = useCallback(() => {
        setProfile({ ...savedProfile });
        setIsDirty(false); // Clear global dirty state immediately
        setShowModal(false);
        if (pendingPath) {
            navigate(pendingPath);
        }
    }, [savedProfile, pendingPath, navigate, setIsDirty]);

    // Modal action: Stay on the page and keep editing
    const handleContinueEditing = useCallback(() => {
        setShowModal(false);
        setPendingPath(null);
    }, []);

    // ── Photo upload ──────────────────────────────────────────────────────
    const handlePhotoChange = useCallback(
        async (file: File) => {
            let previewUrl = "";
            const previousAvatar = profile.avatar;

            try {
                setIsUploading(true);
                previewUrl = URL.createObjectURL(file);
                setProfile(prev => ({ ...prev, avatar: previewUrl }));

                const formData = new FormData();
                formData.append("file", file);

                const data = await apiClient.post<any>("/users/me/upload-image", formData as any);

                setProfile(prev => ({ ...prev, avatar: data.profile_image_url }));
                setSavedProfile(prev => ({ ...prev, avatar: data.profile_image_url }));
                URL.revokeObjectURL(previewUrl);
                showToast("Profile image updated successfully ✅", "success");
            } catch (error) {
                console.error(error);
                setProfile(prev => ({ ...prev, avatar: previousAvatar }));
                showToast("Failed to upload image", "error");
            } finally {
                setIsUploading(false);
            }
        },
        [showToast, profile.avatar]
    );

    // ── Date formatter ────────────────────────────────────────────────────
    const formatMemberSince = (dateString: string) => {
        if (!dateString) return "";
        const cleanDate = dateString.replace(" ", "T");
        const date = new Date(cleanDate);
        return date.toLocaleString("en-US", { month: "long", year: "numeric" });
    };

    const memberSince = formatMemberSince(profile.joinedDate);

    if (loading) return <div>Loading profile...</div>;

    return (
        <>
            <ProfileTemplate
                profile={profile}
                memberSince={memberSince}
                onUpdate={handleUpdate}
                onSave={handleSave}
                onCancel={handleCancel}
                onPhotoChange={handlePhotoChange}
                isSaving={isSaving}
                isUploading={isUploading}
            />

            {/* "Review Unsaved Changes" modal — shown when navigating away with dirty form */}
            {showModal && (
                <UnsavedChangesModal
                    savedProfile={savedProfile}
                    currentProfile={profile}
                    onDiscard={handleDiscard}
                    onContinueEditing={handleContinueEditing}
                    onSave={handleSave}
                    isSaving={isSaving}
                />
            )}
        </>
    );
};

export default ProfilePage;