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

    return response.json() as Promise<T>;
};

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

export const fetchSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
    const plans = await requestJson<SubscriptionPlan[]>('/admin/subscription-plans', { method: 'GET' });
    return plans.filter((plan) => plan.isActive);
};
