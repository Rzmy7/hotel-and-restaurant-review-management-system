export interface GeneralSettings {
    propertyName: string;
    timeZone: string;
    language: string;
    themePreference: 'light' | 'dark' | 'system';
}

export interface NotificationSettings {
    emailNotifications: boolean;
    newReviewAlerts: boolean;
    weeklySummary: boolean;
}

export interface SecuritySettings {
    twoFactorAuth: boolean;
    twoFactorFeatureEnabled?: boolean;
    sessionTimeout: number; // in minutes
}

export interface SubscriptionSettings {
    plan: string;
    billingEmail: string;
}

export interface OrganizationProfileSettings {
    organizationName: string;
    websiteUrl: string;
    propertyType: string;
    primaryEmail: string;
    phoneNumber: string;
    locationUrl: string;
    logoUrl?: string;
}

export interface SettingsData {
    general: GeneralSettings;
    notifications: NotificationSettings;
    security: SecuritySettings;
    subscription: SubscriptionSettings;
    organizationProfile: OrganizationProfileSettings;
}
