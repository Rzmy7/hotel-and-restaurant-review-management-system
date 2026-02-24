import React, { createContext, useContext, useEffect, useState } from "react";

type User = {
    id: number;
    name: string;
    email: string;
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

const API_BASE = (import.meta.env.VITE_API_BASE as string) || "http://localhost:8000";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        // First, check localStorage (normal login/signup)
        const raw = localStorage.getItem("authUser");
        if (raw) {
            try {
                setUser(JSON.parse(raw));
                return;
            } catch (e) {
                localStorage.removeItem("authUser");
            }
        }

        // Then, check backend session (Google OAuth redirect)
        fetch(`${API_BASE}/check-session`, { credentials: "include" })
            .then((res) => res.json())
            .catch(() => ({}))
            .then((data) => {
                if (data.user) {
                    setUser(data.user);
                    localStorage.setItem("authUser", JSON.stringify(data.user));
                }
            });
    }, []);

    const persist = (u: User | null) => {
        setUser(u);
        if (u) localStorage.setItem("authUser", JSON.stringify(u));
        else localStorage.removeItem("authUser");
    };

    const login = async (email: string, password: string) => {
        const res = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
            credentials: "include",
        });
        if (!res.ok) {
            const payload = await res.json().catch(() => ({}));
            throw new Error((payload && payload.detail) || "Login failed");
        }
        const data = await res.json();
        persist(data.user);
        return data.user as User;
    };

    const signup = async (name: string, email: string, password: string) => {
        const res = await fetch(`${API_BASE}/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
            credentials: "include",
        });
        if (!res.ok) {
            const payload = await res.json().catch(() => ({}));
            throw new Error((payload && payload.detail) || "Signup failed");
        }
        const payload = await res.json();
        // backend returns user data inside `user` on signup
        if (payload.user) {
            localStorage.setItem("setupComplete", "false");
            persist(payload.user as User);
            return payload.user as User;
        }
        // fallback: try to login after signup
        localStorage.setItem("setupComplete", "false");
        return login(email, password);
    };

    const logout = () => {
        persist(null);
    };

    const forgotPassword = async (email: string) => {
        const res = await fetch(`${API_BASE}/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
            credentials: "include",
        });
        if (!res.ok) {
            const payload = await res.json().catch(() => ({}));
            throw new Error((payload && payload.detail) || "Forgot password failed");
        }
    };

    const resetPassword = async (token: string, newPassword: string) => {
        const res = await fetch(`${API_BASE}/reset-password/${token}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ new_password: newPassword }),
            credentials: "include",
        });
        if (!res.ok) {
            const payload = await res.json().catch(() => ({}));
            throw new Error((payload && payload.detail) || "Reset password failed");
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
