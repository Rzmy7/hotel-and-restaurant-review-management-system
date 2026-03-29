import React, { createContext, useContext, useEffect, useState } from "react";
import { normalizeRole } from '../utils/authRole';

type User = {
    user_id: string;
    email: string;
    full_name?: string;
    role?: string;
};

type AuthContextType = {
    user: User | null;
    login: (email: string, password: string) => Promise<User>;
    signup: (name: string, email: string, password: string) => Promise<User>;
    logout: () => void;
    forgotPassword: (email: string) => Promise<void>;
    resetPassword: (token: string, newPassword: string) => Promise<void>;
    persist: (user: User | null, token?: string) => void;
    checkUserOrganizations: () => Promise<void>;
};

const API_BASE = (import.meta.env.VITE_API_BASE as string) || "http://localhost:8000";

const clearSetupTemporaryKeys = () => {
    localStorage.removeItem("setup_pending_organization_id");
    localStorage.removeItem("setup_pending_organization_name");
    localStorage.removeItem("setup_snapshot_current_organization");
    // Backward compatibility cleanup for older setup snapshot keys.
    localStorage.removeItem("setup_snapshot_organizations");
    localStorage.removeItem("setup_snapshot_organization_ids");
};
const AuthContext = createContext<AuthContextType | undefined>(undefined);
import { apiClient } from '../api/client';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [user, setUser] = useState<User | null>(null);

    // ----------------------------------------------------
    // Restore session from localStorage
    // ----------------------------------------------------
    useEffect(() => {
        const storedUser = localStorage.getItem("authUser");
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                localStorage.removeItem("authUser");
            }
        }
    }, []);

    // ----------------------------------------------------
    // Save user + token
    // ----------------------------------------------------
    const persist = (u: User | null, token?: string) => {
        setUser(u);

        if (u) {
            localStorage.setItem("authUser", JSON.stringify(u));
        } else {
            localStorage.removeItem("authUser");
        }

        if (token) {
            localStorage.setItem("token", token);
        } else if (u === null) {
            localStorage.removeItem("token");
        }
    };

    // ----------------------------------------------------
    // Get user organizations and store them
    // ----------------------------------------------------
    const checkUserOrganizations = async () => {
        try {
            console.log("Fetching organizations...");

            const token = localStorage.getItem("token");

            if (!token) {
                console.warn("No token found");
                window.location.href = "/login";
                return;
            }

            const res = await fetch(`${API_BASE}/api/user/organizations`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            console.log("Response status:", res.status);

            if (!res.ok) {
                console.error("Failed to fetch organizations:", res.status);
                return;
            }

            const data = await res.json();

            console.log("Organizations API response:", data);

            const orgList = Array.isArray(data)
                ? data
                : data.organizations || [];

            console.log("Processed org list:", orgList);
            
            // save organizations
            localStorage.setItem("organizations", JSON.stringify(orgList));

            //  Extract IDs separately if needed
            const orgIds = orgList.map((org: any) => org.organization_id);
            localStorage.setItem("organization_ids", JSON.stringify(orgIds));

            //  Set current organization
            if (orgList.length > 0) {
                localStorage.setItem(
                    "current_organization",
                    orgList[0].organization_id
                );
            }

            clearSetupTemporaryKeys();

            // Redirect
            if (orgList.length === 0) {
                window.location.href = "/no-organization";
            } else {
                window.location.href = "/dashboard";
            }

        } catch (err) {
            console.error("Error checking organizations:", err);
        }
    };

    // ----------------------------------------------------
    // LOGIN
    // ----------------------------------------------------
    const login = async (email: string, password: string) => {
        let data;
        try {
            data = await apiClient.post<any>('/api/login', { email, password });
        } catch (error: any) {
            // fallback to hansi endpoint if api/login is deprecated in modular structure
            data = await apiClient.post<any>('/auth/login', { email, password });
        }
        console.log("Login response:", data);
        const backendUser = data.user;

        const normalizedUser: User = {
            user_id: backendUser.user_id,
            email: backendUser.email,
            full_name: backendUser.name || `${backendUser.first_name || ""} ${backendUser.last_name || ""}`.trim() || "User",
            role: normalizeRole(backendUser.role || backendUser.roles),
        };

        // Save user + token
        persist(normalizedUser, data.access_token);

        console.log("Calling checkUserOrganizations...");
        // Check organizations after login
        await checkUserOrganizations();

        return normalizedUser;
    };

    // ----------------------------------------------------
    // SIGNUP
    // ----------------------------------------------------
    const signup = async (name: string, email: string, password: string) => {
        let payload;
        try {
            payload = await apiClient.post<any>('/api/signup', { name, email, password });
        } catch (error: any) {
            payload = await apiClient.post<any>('/auth/signup', { name, email, password });
        }
        
        console.log("Signup response:", payload);

        const backendUser = payload.user || payload;
        const normalizedUser: User = {
            user_id: backendUser.id || backendUser.user_id,
            email: backendUser.email,
            full_name: backendUser.name || `${backendUser.first_name || ""} ${backendUser.last_name || ""}`.trim() || "User",
            role: normalizeRole(backendUser.role || backendUser.roles),
        };

        if (payload.access_token) {
            persist(normalizedUser, payload.access_token);
        } else {
            // auto login if token not provided
            await login(email, password);
        }

        return normalizedUser;
    };

    // ----------------------------------------------------
    // LOGOUT
    // ----------------------------------------------------
    const logout = () => {
        localStorage.clear();
        setUser(null);
        window.location.href = "/login";
    };

    // ----------------------------------------------------
    // FORGOT PASSWORD
    // ----------------------------------------------------
    const forgotPassword = async (email: string) => {
        try {
            await apiClient.post<any>('/api/forgot-password', { email });
        } catch (error) {
            await apiClient.post<any>('/auth/forgot-password', { email });
        }
    };

    // ----------------------------------------------------
    // RESET PASSWORD
    // ----------------------------------------------------
    const resetPassword = async (token: string, newPassword: string) => {
        try {
            await apiClient.post<any>(`/api/reset-password/${token}`, { new_password: newPassword });
        } catch (error) {
            await apiClient.post<any>(`/auth/reset-password/${token}`, { new_password: newPassword });
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                login,
                signup,
                logout,
                forgotPassword,
                resetPassword,
                persist,
                checkUserOrganizations,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
};