export interface GeneralSettings {
    propertyName: string;
    timeZone: string;
    language: string;
    themePreference: 'light' | 'dark' | 'system';
}

export interface NotificationSettings {
    newReviewAlerts: boolean;
    weeklySummary: boolean;
    groupInvitations: boolean;
    subscriptionChanges: boolean;
}

export interface SecuritySettings {
    twoFactorAuth: boolean;
    twoFactorFeatureEnabled?: boolean;
    sessionTimeout: number; // in minutes
}

export interface SubscriptionSettings {
    plan: string;
}

export interface OrganizationInfoSettings {
    organizationName: string;
    websiteUrl: string;
    propertyType: string;
    primaryEmail: string;
    phoneNumber: string;
    locationUrl: string;
    city?: string;
    country?: string;
    logoUrl?: string;
}

export interface RuleSettings {
    hotelRulesPrompt?: string;
    autoReplyEnabled?: boolean;
    minRatingForAutoReply?: number;
}

export interface LLMGatewaySettings {
    provider?: 'openai' | 'qwen' | 'deepseek' | 'gemini' | 'custom';
    apiKey?: string;
    modelName?: string;
    isCustomKey?: boolean;
}

export interface SettingsData {
    general: GeneralSettings;
    notifications: NotificationSettings;
    security: SecuritySettings;
    subscription: SubscriptionSettings;
    organizationInfo: OrganizationInfoSettings;
    rules?: RuleSettings;
    llmGateway?: LLMGatewaySettings;
}
