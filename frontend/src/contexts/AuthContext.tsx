import React, { createContext, useContext, useEffect, useState } from "react";
import { normalizeRole, isAdminRole } from '../utils/authRole';
import { apiClient } from "../api/client";
import { logger } from "../utils/logger";

type User = {
  user_id: string;
  email: string;
  full_name?: string;
  role?: string;
};

type LoginChallenge = {
  require_2fa: true;
  message: string;
  email: string;
};

type LoginSuccess = {
  require_2fa?: false;
  access_token: string;
  token_type: string;
  user: {
    user_id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    name?: string;
    role?: string;
    roles?: string[];
  };
};

type LoginResponse = LoginChallenge | LoginSuccess;

type AuthContextType = {
    user: User | null;
    login: (email: string, password: string) => Promise<LoginResponse>;
    verifyLogin2fa: (email: string, code: string) => Promise<LoginSuccess | User>;
    signup: (name: string, email: string, password: string) => Promise<User>;
    logout: () => void;
    forgotPassword: (email: string) => Promise<void>;
    resetPassword: (token: string, newPassword: string) => Promise<void>;
    persist: (user: User | null, token?: string) => void;
    checkUserOrganizations: () => Promise<void>;
    exchangeTokenForOrganization: (orgId: string) => Promise<void>;
    isLoading: boolean;
};

const isLoginChallenge = (value: LoginResponse): value is LoginChallenge => {
  return "require_2fa" in value && value.require_2fa === true;
};

const clearSetupTemporaryKeys = () => {
  localStorage.removeItem("setup_pending_organization_id");
  localStorage.removeItem("setup_pending_organization_name");
  localStorage.removeItem("setup_pending_membership_created");
  localStorage.removeItem("setup_snapshot_current_organization");
  localStorage.removeItem("setup_snapshot_organizations");
  localStorage.removeItem("setup_snapshot_organization_ids");
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("authUser");
    const token = localStorage.getItem("token");

    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        persist(null);
      }
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  // Save user + token
  const persist = (u: User | null, token?: string) => {
    setUser(u);

    if (u) {
      localStorage.setItem("authUser", JSON.stringify(u));
    } else {
      localStorage.removeItem("authUser");
      localStorage.removeItem("token");
      localStorage.removeItem("organizations");
      localStorage.removeItem("organization_ids");
      localStorage.removeItem("current_organization");
    }

    if (token) {
      localStorage.setItem("token", token);
    }
  };

  // Get user organizations and store them
  const checkUserOrganizations = async () => {
    try {
      logger.info("Fetching organizations...");
      const data = await apiClient.get<any>("/user/organizations");
      logger.info("Organizations API response:", data);

      const orgList = Array.isArray(data) ? data : data.organizations || [];
      logger.info("Processed org list:", orgList);

      localStorage.setItem("organizations", JSON.stringify(orgList));
      const orgIds = orgList.map((org: any) => org.organization_id);
      localStorage.setItem("organization_ids", JSON.stringify(orgIds));

      if (orgList.length > 0) {
        localStorage.setItem("current_organization", orgList[0].organization_id);
      }

      clearSetupTemporaryKeys();

      if (orgList.length === 0) {
        window.location.href = "/no-organization";
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err) {
      logger.error("Error checking organizations:", err);
    }
  };

  // Exchange token for organization swap
  const exchangeTokenForOrganization = async (orgId: string) => {
    try {
      const data = await apiClient.post<any>("/auth/switch-organization", {
        organization_id: orgId,
      });
      if (data && data.access_token) {
        if (user) {
          persist(user, data.access_token);
        }
      }
    } catch (err) {
      logger.error("Error exchanging token for organization:", err);
      throw err;
    }
  };

  // LOGIN
  const login = async (email: string, password: string) => {
    const data = await apiClient.post<LoginResponse>("/auth/login", {
      email,
      password,
    });
    logger.info("Login response:", data);

    if (isLoginChallenge(data)) {
      return data;
    }

    const successData: LoginSuccess = data;
    const backendUser = successData.user;

    const normalizedUser: User = {
      user_id: backendUser.user_id,
      email: backendUser.email,
      full_name:
        backendUser.full_name ||
        backendUser.name ||
        `${backendUser.first_name || ""} ${backendUser.last_name || ""}`.trim() ||
        "User",
      role: normalizeRole(backendUser.role || backendUser.roles),
    };

    if (!isAdminRole(normalizedUser.role)) {
      persist(normalizedUser, successData.access_token);
      logger.info("Calling checkUserOrganizations...");
      await checkUserOrganizations();
    } else {
      persist(normalizedUser, successData.access_token);
    }

    return successData;
  };

  const verifyLogin2fa = async (email: string, code: string) => {
    const data = await apiClient.post<LoginSuccess>("/auth/login/2fa", {
      email,
      code,
    });

    const backendUser = data.user;
    const normalizedUser: User = {
      user_id: backendUser.user_id,
      email: backendUser.email,
      full_name:
        backendUser.full_name ||
        backendUser.name ||
        `${backendUser.first_name || ""} ${backendUser.last_name || ""}`.trim() ||
        "User",
      role: normalizeRole(backendUser.role),
    };

    if (!isAdminRole(normalizedUser.role)) {
      persist(normalizedUser, data.access_token);
      await checkUserOrganizations();
    } else {
      persist(normalizedUser, data.access_token);
    }

    return normalizedUser;
  };

  // SIGNUP
  const signup = async (name: string, email: string, password: string) => {
    const payload = await apiClient.post<any>("/auth/signup", {
      name,
      email,
      password,
    });
 
    logger.info("Signup response:", payload);

    const backendUser = payload.user || payload;
    const normalizedUser: User = {
      user_id: backendUser.id || backendUser.user_id,
      email: backendUser.email,
      full_name:
        backendUser.full_name ||
        backendUser.name ||
        `${backendUser.first_name || ""} ${backendUser.last_name || ""}`.trim() ||
        "User",
      role: normalizeRole(backendUser.role || backendUser.roles),
    };

    if (payload.access_token) {
      if (!isAdminRole(normalizedUser.role)) {
        persist(normalizedUser, payload.access_token);
        await checkUserOrganizations();
      } else {
        persist(normalizedUser, payload.access_token);
      }
    } else {
      // login and persist without organization-based redirect
      const loginPayload = await apiClient.post<any>("/auth/login", {
        email,
        password,
      });
      const loginUser = loginPayload.user;
      const normalizedLoginUser: User = {
        user_id: loginUser.user_id,
        email: loginUser.email,
        full_name:
          loginUser.full_name ||
          loginUser.name ||
          `${loginUser.first_name || ""} ${loginUser.last_name || ""}`.trim() ||
          "User",
        role: normalizeRole(loginUser.role || loginUser.roles),
      };
      
      if (!isAdminRole(normalizedLoginUser.role)) {
        persist(normalizedLoginUser, loginPayload.access_token);
        await checkUserOrganizations();
      } else {
        persist(normalizedLoginUser, loginPayload.access_token);
      }
      return normalizedLoginUser;
    }

    return normalizedUser;
  };

  // LOGOUT
  const logout = () => {
    localStorage.clear();
    setUser(null);
    window.location.href = "/login";
  };

  // FORGOT PASSWORD
  const forgotPassword = async (email: string) => {
    await apiClient.post<any>("/auth/forgot-password", { email });
  };

  // RESET PASSWORD
  const resetPassword = async (token: string, newPassword: string) => {
    const encodedToken = encodeURIComponent(token);
    await apiClient.post<any>(`/auth/reset-password/${encodedToken}`, {
      new_password: newPassword,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        verifyLogin2fa,
        signup,
        logout,
        forgotPassword,
        resetPassword,
        persist,
        checkUserOrganizations,
        exchangeTokenForOrganization,
        isLoading,
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
