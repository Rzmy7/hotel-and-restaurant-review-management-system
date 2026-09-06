import { apiClient } from '../api/client';

export interface FAQItem {
    id: string;
    question: string;
    answer: string;
    sort_order: number;
    is_active: boolean;
    is_platform_question?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface ActivePlatformsResponse {
    platforms: string[];
    formatted_list: string;
    suggested_answer: string;
}

export const faqService = {
    async getFaqs(): Promise<FAQItem[]> {
        return apiClient.get<FAQItem[]>('/admin/faqs');
    },

    async createFaq(payload: {
        question: string;
        answer: string;
        sort_order?: number;
        is_active?: boolean;
        is_platform_question?: boolean;
    }): Promise<FAQItem> {
        return apiClient.post<FAQItem>('/admin/faqs', payload);
    },

    async updateFaq(
        id: string,
        payload: {
            question?: string;
            answer?: string;
            sort_order?: number;
            is_active?: boolean;
            is_platform_question?: boolean;
        }
    ): Promise<FAQItem> {
        return apiClient.put<FAQItem>(`/admin/faqs/${encodeURIComponent(id)}`, payload);
    },

    async deleteFaq(id: string): Promise<{ message: string; id: number }> {
        return apiClient.delete<{ message: string; id: number }>(`/admin/faqs/${encodeURIComponent(id)}`);
    },

    async getActivePlatforms(): Promise<ActivePlatformsResponse> {
        return apiClient.get<ActivePlatformsResponse>('/admin/faqs/active-platforms');
    },
};
