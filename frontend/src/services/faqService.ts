import { apiClient } from '../api/client';

export interface FAQItem {
    id: string;
    question: string;
    answer: string;
    sort_order: number;
    is_platform_question?: boolean;
}

export const faqService = {
    async getPublicFaqs(): Promise<FAQItem[]> {
        return apiClient.get<FAQItem[]>('/faqs');
    },
};
