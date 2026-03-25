import React, { createContext, useContext, useEffect, useState } from "react";
import { normalizeRole } from '../utils/authRole';

/**
 * Represents a user session object.
 */
type User = {
    /** Unique identifier for the user. */
    user_id: string;
    /** User's primary email address. */
    email: string;
    /** User's display name. */
    full_name?: string;
    /** User's system role (e.g., ADMIN, TENANT). */
    role?: string;
};

/**
 * Interface definition for the Authentication Context.
 */
type AuthContextType = {
    /** Current authenticated user or null. */
    user: User | null;
    /** Authenticates a user with email and password. */
    login: (email: string, password: string) => Promise<User>;
    /** Registers a new user. */
    signup: (name: string, email: string, password: string) => Promise<User>;
    /** Terminates the current session and clears local storage. */
    logout: () => void;
    /** Initiates a forgot password request. */
    forgotPassword: (email: string) => Promise<void>;
    /** Resets the user's password using a token. */
    resetPassword: (token: string, newPassword: string) => Promise<void>;
    /** Sets the user and token in state and local storage. */
    persist: (user: User | null, token?: string) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
import { apiClient } from '../api/client';

/**
 * Authentication Provider component.
 * Manages user state, persistence, and authentication API interactions.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [user, setUser] = useState<User | null>(null);

    // ----------------------------------------------------
    // Restore session on refresh
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
    // Persist user + token
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
    // LOGIN
    // ----------------------------------------------------
    const login = async (email: string, password: string) => {
        const data = await apiClient.post<any>('/api/login', { email, password });
        const backendUser = data.user;

        const normalizedUser: User = {
            user_id: backendUser.id,
            email: backendUser.email,
            full_name: backendUser.name,
            role: normalizeRole(backendUser.role || backendUser.roles),
        };

        persist(normalizedUser, data.access_token);

        return normalizedUser;
    };

    // ----------------------------------------------------
    // SIGNUP
    // ----------------------------------------------------
    const signup = async (name: string, email: string, password: string) => {
        const payload = await apiClient.post<any>('/api/signup', { name, email, password });

        if (payload.user) {
            const backendUser = payload.user;

            const normalizedUser: User = {
                user_id: backendUser.id,
                email: backendUser.email,
                full_name: backendUser.name,
                role: normalizeRole(backendUser.role || backendUser.roles),
            };

            persist(normalizedUser, payload.access_token);
            return normalizedUser;
        }

        return login(email, password);
    };

    // ----------------------------------------------------
    // LOGOUT
    // ----------------------------------------------------
    const logout = () => {
        persist(null);
    };

    // ----------------------------------------------------
    // FORGOT PASSWORD
    // ----------------------------------------------------
    const forgotPassword = async (email: string) => {
        await apiClient.post<any>('/api/forgot-password', { email });
    };

    // ----------------------------------------------------
    // RESET PASSWORD
    // ----------------------------------------------------
    const resetPassword = async (token: string, newPassword: string) => {
        await apiClient.post<any>(`/api/reset-password/${token}`, { new_password: newPassword });
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
                persist, // ⭐ exposed
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