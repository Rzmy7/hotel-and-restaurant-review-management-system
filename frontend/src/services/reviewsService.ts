/**
 * Reviews Service — Server-side pagination & filtering.
 */

import type { Review, ReviewStats, FetchReviewsParams, PaginatedResponse } from '../types/reviews';
import { apiClient } from '../api/client';

class ReviewsService {
    /**
     * Fetch paged and filtered reviews from the server.
     */
    async getReviews(organizationId: string, params: FetchReviewsParams): Promise<PaginatedResponse<Review>> {
        const response = await apiClient.get<PaginatedResponse<any>>('/reviews/', {
            organization_id: organizationId,
            page: params.page ?? 0,
            limit: params.limit ?? 15,
            search: params.search || undefined,
            rating: params.rating?.length ? params.rating : undefined,
            sentiment: params.sentiment?.length ? params.sentiment : undefined,
            source: params.source?.length ? params.source : undefined,
            category: params.category?.length ? params.category : undefined,
            dateFrom: params.dateFrom || undefined,
            dateTo: params.dateTo || undefined,
        });

        return {
            ...response,
            data: response.data.map(this.mapReview)
        };
    }

    /**
     * Map backend ReviewModel to frontend Review interface.
     */
    private mapReview(item: any): Review {
        return {
            id: item.id,
            rating: typeof item.rating === 'number' ? item.rating : 0,
            userName: item.userName || item.reviewerName || 'Anonymous',
            reviewText: item.reviewText || item.text || '',
            sentiment: item.sentiment || 'Neutral',
            categories: Array.isArray(item.categories) ? item.categories : [],
            source: item.source || item.platform || 'Unknown',
            date: item.date || item.reviewDate || new Date().toISOString().split('T')[0],
            status: item.status || 'pending',
            language: item.language || 'English',
            photos: Array.isArray(item.photos) ? item.photos : [],
            keyPhrases: Array.isArray(item.keyPhrases) ? item.keyPhrases : [],
            summary: item.summary || '',
            scraper_review_id: item.scraper_review_id || '',
            platformReviewId: item.scraper_review_id || '', // Shim for compatibility
            replyStatus: item.ai_reply ? 'Replied' : 'Unreplied',
            hasReply: item.ai_reply ? 'Yes' : 'No',
            isAiReply: !!item.ai_reply,
        };
    }

    /**
     * Fetch statistics from the server.
     */
    async getStats(organizationId: string): Promise<ReviewStats> {
        return apiClient.get<ReviewStats>('/reviews/meta/stats', { organization_id: organizationId });
    }

    /**
     * Fetch filter options (sources, categories) from the server.
     */
    async getOptions(organizationId: string): Promise<{ sources: string[]; categories: string[] }> {
        return apiClient.get<{ sources: string[]; categories: string[] }>('/reviews/meta/options', { organization_id: organizationId });
    }

    /**
     * AI Reply Generation
     */
    async generateReply(
        review: Review,
        tone: 'professional' | 'casual' | 'standard' = 'standard',
        length: 'short' | 'standard' = 'standard'
    ): Promise<string> {
        const reviewText = (review.reviewText || review.summary || '').trim();
        if (!reviewText) throw new Error('Reply generation requires review text.');

        const result = await apiClient.post<{ reply?: string; provider?: string; providerError?: string }>('/reviews/generate-reply', {
            reviewId: review.id,
            tone,
            length,
            reviewText,
            userName:  review.userName,
            sentiment: review.sentiment,
            source:    review.source,
            language:  review.language,
        });

        if (result?.provider?.includes('fallback')) {
            throw new Error(result.providerError || 'Provider call failed.');
        }
        if (result?.reply && typeof result.reply === 'string') return result.reply;
        throw new Error('Reply generation returned an empty response.');
    }

    async updateReviewStatus(organizationId: string, reviewId: string | number, status: Review['status']): Promise<void> {
        await apiClient.put(`/reviews/${reviewId}/status`, { status });
    }

    async saveReply(organizationId: string, reviewId: string | number, replyText: string): Promise<void> {
        await apiClient.post(`/reviews/${reviewId}/reply`, { replyText });
    }

    clearCache(): void {
        // No client-side cache in the new paged structure
    }
}

export const reviewsService = new ReviewsService();
