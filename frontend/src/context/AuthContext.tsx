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
};

const API_BASE =
    (import.meta.env.VITE_API_BASE as string) || "http://localhost:8000";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
        const res = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
            const payload = await res.json().catch(() => ({}));
            throw new Error((payload && payload.detail) || "Login failed");
        }

        const data = await res.json();

        const backendUser = data.user;

        // 🔹 Normalize backend response
        const normalizedUser: User = {
            user_id: backendUser.id,
            email: backendUser.email,
            full_name: backendUser.name,
            //role: backendUser.roles?.[0] || "TENANAT",
            role: backendUser.role,
        };

        persist(normalizedUser, data.access_token);

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
            throw new Error((payload && payload.detail) || "Signup failed");
        }

        const payload = await res.json();

        if (payload.user) {
            const backendUser = payload.user;

            const normalizedUser: User = {
                user_id: backendUser.id,
                email: backendUser.email,
                full_name: backendUser.name,
                role: backendUser.roles?.[0] || "TENANT",
            };

            persist(normalizedUser);
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
        const res = await fetch(`${API_BASE}/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });

        if (!res.ok) {
            const payload = await res.json().catch(() => ({}));
            throw new Error(
                (payload && payload.detail) || "Forgot password failed"
            );
        }
    };

    // ----------------------------------------------------
    // RESET PASSWORD
    // ----------------------------------------------------
    const resetPassword = async (token: string, newPassword: string) => {
        const res = await fetch(`${API_BASE}/reset-password/${token}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ new_password: newPassword }),
        });

        if (!res.ok) {
            const payload = await res.json().catch(() => ({}));
            throw new Error(
                (payload && payload.detail) || "Reset password failed"
            );
        }
    };

    return (
        <AuthContext.Provider
            value={{ user, login, signup, logout, forgotPassword, resetPassword }}
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