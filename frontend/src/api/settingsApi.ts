import type { SettingsData } from "../types/settings";
import axios from "axios";
import { getApiBaseUrl } from "../config/api";

// Mocked initial data
const STORAGE_KEY = "vite-ui-theme";
const savedTheme =
  (localStorage.getItem(STORAGE_KEY) as "light" | "dark" | "system") ||
  "system";

const defaultSettings: SettingsData = {
  general: {
    propertyName: "Grand Hotel NYC",
    timeZone: "EST (UTC-5)",
    language: "English",
    themePreference: savedTheme,
  },
  notifications: {
    emailNotifications: true,
    newReviewAlerts: true,
    weeklySummary: false,
  },
  security: {
    twoFactorAuth: true,
    sessionTimeout: 30,
  },
  subscription: {
    plan: "professional",
    billingEmail: "billing@grandplazahotel.com",
  },
  hotelInfo: {
    hotelName: "Grand Plaza Hotel & Spa",
    websiteUrl: "https://grandplazahotel.com",
    propertyType: "Hotel",
    primaryEmail: "reviews@grandplazahotel.com",
    phoneNumber: "+1 (555) 987-6543",
    locationUrl: "",
  },
};

let currentSettings = { ...defaultSettings };

type UserOrganization = {
  organization_id: string;
  organization_name?: string;
  organization_type?: string | null;
  organization_type_id?: number | null;
  website_url?: string | null;
  primary_email?: string | null;
  phone_number?: string | null;
  logo_url?: string | null;
  city?: string | null;
  country?: string | null;
  location_url?: string | null;
};

type OrganizationType = {
  type_code: number;
  type_name: string;
};

type UserProfile = {
  is_2fa_enabled?: boolean;
  is_2fa_feature_enabled?: boolean;
};

export type PasswordChangePayload = {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
};

const toApiPath = (path: string): string => {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return cleanPath.startsWith("/api") ? cleanPath : `/api${cleanPath}`;
};

const settingsAxios = axios.create({
  baseURL: getApiBaseUrl(),
});

settingsAxios.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  const token = localStorage.getItem("token");
  config.headers = config.headers ?? {};
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (!(config.data instanceof FormData)) {
    config.headers["Content-Type"] = "application/json";
  }
  return config;
});

const getActiveOrganizationId = (): string | null => {
  const currentOrg = localStorage.getItem("current_organization");
  if (currentOrg && currentOrg.trim()) return currentOrg;
  try {
    const raw = localStorage.getItem("organization_ids");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed[0]?.trim() ? parsed[0] : null;
  } catch {
    return null;
  }
};

const normalizeEmpty = (value?: string | null): string | undefined => {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const mapOrganizationToHotelInfo = (org: UserOrganization): SettingsData["hotelInfo"] => ({
  hotelName: org.organization_name || currentSettings.hotelInfo.hotelName,
  websiteUrl: org.website_url || "",
  propertyType: org.organization_type || currentSettings.hotelInfo.propertyType,
  primaryEmail: org.primary_email || "",
  phoneNumber: org.phone_number || "",
  locationUrl: org.location_url || "",
  logoUrl: org.logo_url || undefined,
});

const fetchUserOrganizations = async (): Promise<UserOrganization[]> => {
  const response = await settingsAxios.get<UserOrganization[]>(toApiPath("/user/organizations"));
  return Array.isArray(response.data) ? response.data : [];
};

const resolveOrganizationTypeId = async (propertyType: string): Promise<number | undefined> => {
  const normalizedTarget = propertyType.trim().toLowerCase();
  if (!normalizedTarget) return undefined;
  const numeric = Number(propertyType);
  if (!Number.isNaN(numeric) && Number.isInteger(numeric) && numeric > 0) return numeric;
  try {
    const response = await settingsAxios.get<OrganizationType[]>(toApiPath("/organization-types"));
    return response.data.find(t => t.type_name?.trim().toLowerCase() === normalizedTarget)?.type_code;
  } catch {
    return undefined;
  }
};

const patchHotelInfoToBackend = async (hotelInfoUpdates: Partial<SettingsData["hotelInfo"]>) => {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error("No active organization selected.");
  const payload: Record<string, string | number | null> = {};
  if (hotelInfoUpdates.hotelName !== undefined) payload.organization_name = normalizeEmpty(hotelInfoUpdates.hotelName) ?? null;
  if (hotelInfoUpdates.websiteUrl !== undefined) payload.website_url = normalizeEmpty(hotelInfoUpdates.websiteUrl) ?? null;
  if (hotelInfoUpdates.primaryEmail !== undefined) payload.primary_email = normalizeEmpty(hotelInfoUpdates.primaryEmail) ?? null;
  if (hotelInfoUpdates.phoneNumber !== undefined) payload.phone_number = normalizeEmpty(hotelInfoUpdates.phoneNumber) ?? null;
  if (hotelInfoUpdates.logoUrl !== undefined) payload.logo_url = normalizeEmpty(hotelInfoUpdates.logoUrl) ?? null;
  if (hotelInfoUpdates.locationUrl !== undefined) payload.location_url = normalizeEmpty(hotelInfoUpdates.locationUrl) ?? null;
  if (hotelInfoUpdates.propertyType !== undefined) {
    const tid = await resolveOrganizationTypeId(hotelInfoUpdates.propertyType);
    if (tid !== undefined) payload.organization_type_id = tid;
  }
  if (Object.keys(payload).length > 0) await settingsAxios.patch(toApiPath(`/organizations/${orgId}`), payload);
};

const syncOrganizationInStorage = (hotelInfo: SettingsData["hotelInfo"]) => {
  const currentOrgId = getActiveOrganizationId();
  if (!currentOrgId) return;
  try {
    const raw = localStorage.getItem("organizations");
    if (!raw) return;
    const organizations = JSON.parse(raw);
    if (!Array.isArray(organizations)) return;
    const next = organizations.map(org => (org?.organization_id === currentOrgId ? {
      ...org,
      organization_name: hotelInfo.hotelName,
      website_url: hotelInfo.websiteUrl,
      primary_email: hotelInfo.primaryEmail,
      phone_number: hotelInfo.phoneNumber,
      logo_url: hotelInfo.logoUrl ?? null,
      organization_type: hotelInfo.propertyType,
      location_url: hotelInfo.locationUrl || null,
    } : org));
    localStorage.setItem("organizations", JSON.stringify(next));
  } catch {}
};

export const settingsApi = {
  fetchSettings: async (): Promise<SettingsData> => {
    try {
      const organizations = await fetchUserOrganizations();
      const activeOrgId = getActiveOrganizationId();
      const activeOrg = organizations.find(o => o.organization_id === activeOrgId) || organizations[0];
      if (activeOrg) currentSettings = { ...currentSettings, hotelInfo: mapOrganizationToHotelInfo(activeOrg) };
    } catch {}
    try {
      const profile = await settingsAxios.get<UserProfile>(toApiPath("/users/me"));
      currentSettings = { ...currentSettings, security: { ...currentSettings.security, twoFactorAuth: !!profile.data?.is_2fa_enabled } };
    } catch {}
    return { ...currentSettings };
  },

  updateSettings: async (updates: {
    general?: Partial<SettingsData["general"]>;
    notifications?: Partial<SettingsData["notifications"]>;
    security?: Partial<SettingsData["security"]>;
    hotelInfo?: Partial<SettingsData["hotelInfo"]>;
  }): Promise<SettingsData> => {
    if (updates.hotelInfo) {
      await patchHotelInfoToBackend(updates.hotelInfo);
      syncOrganizationInStorage(updates.hotelInfo as SettingsData["hotelInfo"]);
      currentSettings.hotelInfo = { ...currentSettings.hotelInfo, ...updates.hotelInfo };
    }
    if (updates.general) currentSettings.general = { ...currentSettings.general, ...updates.general };
    if (updates.notifications) currentSettings.notifications = { ...currentSettings.notifications, ...updates.notifications };
    if (updates.security) currentSettings.security = { ...currentSettings.security, ...updates.security };
    return { ...currentSettings };
  },

  request2FA: async (): Promise<{ message: string }> => {
    const response = await settingsAxios.post<{ message: string }>(toApiPath("/users/me/2fa/request"));
    return response.data;
  },

  enable2FA: async (code: string): Promise<{ message: string }> => {
    const response = await settingsAxios.post<{ message: string }>(toApiPath("/users/me/2fa/enable"), { code });
    return response.data;
  },

  disable2FA: async (): Promise<{ message: string }> => {
    const response = await settingsAxios.post<{ message: string }>(toApiPath("/users/me/2fa/disable"));
    return response.data;
  },

  changePassword: async (payload: PasswordChangePayload): Promise<{ message: string }> => {
    const response = await settingsAxios.post<{ message: string }>(toApiPath("/users/me/change-password"), payload);
    return response.data;
  },

  uploadHotelLogo: async (file: File): Promise<string> => {
    const orgId = getActiveOrganizationId();
    if (!orgId) throw new Error("No active organization selected.");
    const formData = new FormData();
    formData.append("logo", file);
    const response = await settingsAxios.post<{ logo_url: string }>(
      toApiPath(`/organizations/${orgId}/logo`),
      formData
    );
    return response.data.logo_url;
  },

  uploadRulesFile: async (file: File) => {
    const orgId = getActiveOrganizationId();
    if (!orgId) throw new Error("No active organization selected.");
    const formData = new FormData();
    formData.append("file", file);
    const response = await settingsAxios.post(toApiPath(`/organizations/${orgId}/upload-rules`), formData);
    return response.data;
  },

  fetchOrganizationRules: async () => {
    const orgId = getActiveOrganizationId();
    if (!orgId) return [];
    const response = await settingsAxios.get(toApiPath(`/organizations/${orgId}/rules`));
    return Array.isArray(response.data) ? response.data : [];
  },
};
