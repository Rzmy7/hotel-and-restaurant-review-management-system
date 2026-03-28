const DEFAULT_MAIN_BACKEND_URL = import.meta.env.VITE_MAIN_BACKEND_URL || 'http://localhost:8000';

const getBaseUrl = (): string => {
    const stored = localStorage.getItem('mainBackendUrl');
    return (stored || DEFAULT_MAIN_BACKEND_URL).replace(/\/$/, '');
};

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(`${getBaseUrl()}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers || {}),
        },
        ...init,
    });

    if (!response.ok) {
        const details = await response.text().catch(() => '');
        throw new Error(details || `Request failed: ${response.status}`);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
};

export type PlanIconName = 'zap' | 'star' | 'crown' | 'building';

export interface SubscriptionFeature {
    id: string;
    key: string;
    name: string;
    description?: string | null;
    supportsLimit: boolean;
}

export interface SubscriptionPlanFeature extends SubscriptionFeature {
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
    iconName: PlanIconName;
    features: SubscriptionPlanFeature[];
}

export interface SubscriptionPlanFeatureUpsertPayload {
    featureId: string;
    enabled: boolean;
    limit: number | null;
}

export interface SubscriptionPlanUpsertPayload {
    name: string;
    description: string;
    monthlyPrice: number;
    annualPrice: number;
    currency: string;
    isPopular: boolean;
    isActive: boolean;
    color: string;
    iconName: PlanIconName;
    features: SubscriptionPlanFeatureUpsertPayload[];
}

export const fetchSubscriptionFeatures = (): Promise<SubscriptionFeature[]> => {
    return requestJson<SubscriptionFeature[]>('/admin/subscription-features', { method: 'GET' });
};

export const fetchSubscriptionPlans = (): Promise<SubscriptionPlan[]> => {
    return requestJson<SubscriptionPlan[]>('/admin/subscription-plans', { method: 'GET' });
};

export const createSubscriptionPlan = (payload: SubscriptionPlanUpsertPayload): Promise<SubscriptionPlan> => {
    return requestJson<SubscriptionPlan>('/admin/subscription-plans', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
};

export const updateSubscriptionPlan = (
    planId: string,
    payload: SubscriptionPlanUpsertPayload,
): Promise<SubscriptionPlan> => {
    return requestJson<SubscriptionPlan>(`/admin/subscription-plans/${encodeURIComponent(planId)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
};

export const deleteSubscriptionPlan = (planId: string): Promise<{ status: string; planId: string }> => {
    return requestJson<{ status: string; planId: string }>(`/admin/subscription-plans/${encodeURIComponent(planId)}`, {
        method: 'DELETE',
    });
};
