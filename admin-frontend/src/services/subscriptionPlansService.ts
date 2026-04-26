import { apiClient } from "../api/client";

export type PlanIconName = "zap" | "star" | "crown" | "building";

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
  return apiClient.get<SubscriptionFeature[]>("/admin/subscription-features");
};

export const fetchSubscriptionPlans = (): Promise<SubscriptionPlan[]> => {
  return apiClient.get<SubscriptionPlan[]>("/admin/subscription-plans");
};

export const createSubscriptionPlan = (
  payload: SubscriptionPlanUpsertPayload,
): Promise<SubscriptionPlan> => {
  return apiClient.post<SubscriptionPlan>("/admin/subscription-plans", payload);
};

export const updateSubscriptionPlan = (
  planId: string,
  payload: SubscriptionPlanUpsertPayload,
): Promise<SubscriptionPlan> => {
  return apiClient.patch<SubscriptionPlan>(
    `/admin/subscription-plans/${encodeURIComponent(planId)}`,
    payload,
  );
};

export const deleteSubscriptionPlan = (
  planId: string,
): Promise<{ status: string; planId: string }> => {
  return apiClient.delete<{ status: string; planId: string }>(
    `/admin/subscription-plans/${encodeURIComponent(planId)}`,
  );
};
