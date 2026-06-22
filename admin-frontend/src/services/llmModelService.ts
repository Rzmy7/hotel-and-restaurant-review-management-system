import { apiClient } from '../api/client';

export interface LLMModel {
  id: string;
  name: string;
  endpoint: string;
  model_name: string;
  api_key_masked: string;
  max_tokens: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LLMModelCreatePayload {
  name: string;
  endpoint: string;
  model_name: string;
  api_key: string;
  max_tokens: number;
}

export interface LLMModelUpdatePayload {
  name?: string;
  endpoint?: string;
  model_name?: string;
  api_key?: string;
  max_tokens?: number;
}

export interface LLMAssignments {
  review_processing_model_id: string | null;
  reply_generation_model_id: string | null;
  review_processing_model_name: string | null;
  reply_generation_model_name: string | null;
}

export interface LLMTestResult {
  success: boolean;
  message: string;
}

export const llmModelService = {
  list: () =>
    apiClient.get<LLMModel[]>('/admin/llm-models'),

  create: (data: LLMModelCreatePayload) =>
    apiClient.post<LLMModel>('/admin/llm-models', data),

  update: (id: string, data: LLMModelUpdatePayload) =>
    apiClient.patch<LLMModel>(`/admin/llm-models/${id}`, data),

  remove: (id: string) =>
    apiClient.delete<{ status: string }>(`/admin/llm-models/${id}`),

  test: (id: string) =>
    apiClient.post<LLMTestResult>(`/admin/llm-models/${id}/test`, {}),

  testConnectivity: (data: { endpoint: string; model_name: string; api_key?: string; max_tokens: number; model_id?: string }) =>
    apiClient.post<LLMTestResult>('/admin/llm-models/test-connectivity', data),

  getAssignments: () =>
    apiClient.get<LLMAssignments>('/admin/llm-models/assignments'),

  setAssignments: (data: { review_processing_model_id?: string | null; reply_generation_model_id?: string | null }) =>
    apiClient.patch<LLMAssignments>('/admin/llm-models/assignments', data),
};
