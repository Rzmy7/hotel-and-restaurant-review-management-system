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
    sessionTimeout: number; // in minutes
}

export interface SubscriptionSettings {
    plan: 'professional' | 'upgrade';
    billingEmail: string;
}

export interface HotelInfoSettings {
    hotelName: string;
    websiteUrl: string;
    propertyType: string;
    primaryEmail: string;
    phoneNumber: string;
    logoUrl?: string;
}

export interface SettingsData {
    general: GeneralSettings;
    notifications: NotificationSettings;
    security: SecuritySettings;
    subscription: SubscriptionSettings;
    hotelInfo: HotelInfoSettings;
}
