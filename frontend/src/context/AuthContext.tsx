import React, { createContext, useContext, useEffect, useState } from "react";

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
};

const API_BASE =
    (import.meta.env.VITE_API_BASE as string) || "http://localhost:8000";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
        const res = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
            const payload = await res.json().catch(() => ({}));
            throw new Error(payload.detail || "Login failed");
        }

        const data = await res.json();

        console.log("Login response:", data);

        const backendUser = data.user;

        const normalizedUser: User = {
            user_id: backendUser.user_id,
            email: backendUser.email,
            full_name: `${backendUser.first_name || ""} ${backendUser.last_name || ""}`.trim(),
            role: backendUser.role,
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
        const res = await fetch(`${API_BASE}/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
        });

        if (!res.ok) {
            const payload = await res.json().catch(() => ({}));
            throw new Error(payload.detail || "Signup failed");
        }

        const data = await res.json();

        console.log("Signup response:", data);

        // Save token if exists
        if (data.access_token) {
            localStorage.setItem("token", data.access_token);
        }

        // Save user
        localStorage.setItem("authUser", JSON.stringify(data.user));

        // If no token → auto login
        if (!data.access_token) {
            console.log("No token from signup → logging in...");
            await login(email, password);
            return data.user;
        }

        // Redirect to setup
        window.location.href = "/setup";

        return data.user;
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
        await fetch(`${API_BASE}/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });
    };

    // ----------------------------------------------------
    // RESET PASSWORD
    // ----------------------------------------------------
    const resetPassword = async (token: string, newPassword: string) => {
        await fetch(`${API_BASE}/reset-password/${token}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ new_password: newPassword }),
        });
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