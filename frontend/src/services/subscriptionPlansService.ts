import { apiClient } from '../api/client';
import { ActivityMessages } from '../constants/activityMessages';

export interface SubscriptionPlanFeature {
    id: string;
    key: string;
    name: string;
    enabled: boolean;
    limit: number | null;
}

export interface SubscriptionPlan {
    id: string;
    name: string;
    description: string;
    monthlyPrice: number;
    annualPrice: number;
    currency: string;
    isPopular: boolean;
    isActive: boolean;
    color: string;
    iconName: 'zap' | 'star' | 'crown' | 'building';
    features: SubscriptionPlanFeature[];
}

export interface SubscriptionFeatureUsage {
    id: string;
    key: string;
    name: string;
    enabled: boolean;
    used: number;
    limit: number | null;
    balance: number | null;
    supportsLimit: boolean;
}

export interface SubscriptionUsageSummary {
    userId: string;
    planId: string | null;
    planName: string | null;
    features: SubscriptionFeatureUsage[];
}

export interface UserOrganizationSummary {
    organization_id: string;
    organization_name: string;
    organization_type?: string | null;
    organization_type_id?: string | number | null;
    role?: string | null;
}

export const fetchSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
    const plans = await apiClient.get<SubscriptionPlan[]>('/subscription-plans');
    return plans.filter((plan) => plan.isActive);
};

export const fetchSubscriptionUsage = (userId: string): Promise<SubscriptionUsageSummary> => {
    return apiClient.get<SubscriptionUsageSummary>(`/subscription-usage/${encodeURIComponent(userId)}`);
};

export const fetchUserOrganizations = (): Promise<UserOrganizationSummary[]> => {
    return apiClient.get<UserOrganizationSummary[]>('/user/organizations');
};

export const updateTenantPlan = (planId: string): Promise<{ message: string, plan_id: string }> => {
    return apiClient.put<{ message: string, plan_id: string }>('/tenant/plan', {
        plan_id: planId
    }, {
        activity: ActivityMessages.UPDATE_PLAN,
        showSuccess: false
    });
};
