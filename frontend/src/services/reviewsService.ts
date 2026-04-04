/**
 * Reviews Service — real API only, no mock fallback.
 *
 * All data comes from GET /api/reviews/{organizationId}.
 * Filtering, sorting and pagination are performed client-side
 * on the fetched dataset (same logic as before, just no mock).
 */

import type { Review, ReviewStats, FetchReviewsParams, PaginatedResponse } from '../types/reviews';
import { apiClient } from '../api/client';

class ReviewsService {
    private cachedReviews: Review[] | null = null;
    private fetchPromise: Promise<Review[]> | null = null;

    private async fetchFromApi(organizationId: string): Promise<Review[]> {
        const data = await apiClient.get<any[]>(`/reviews/${organizationId}`);

        if (!Array.isArray(data)) {
            throw new Error('Reviews API returned an unexpected format.');
        }

        return data.map((item: any): Review => ({
            id: item.id ?? Math.random().toString(),
            rating: typeof item.rating === 'number' ? item.rating : 0,
            userName: item.userName || item.reviewerName || 'Anonymous',
            reviewText: item.reviewText || item.text || '',
            sentiment: item.sentiment || 'Neutral',
            categories: Array.isArray(item.categories) ? item.categories : [],
            source: item.source || item.platform || 'Unknown',
            date: item.date || item.reviewDate || new Date().toISOString().split('T')[0],
            status: item.status || 'Pending',
            language: item.language || 'English',
            photos: Array.isArray(item.photos) ? item.photos : [],
            keyPhrases: Array.isArray(item.keyPhrases) ? item.keyPhrases : [],
            summary: item.summary || '',
            platformReviewId: item.platformReviewId || '',
            replyStatus: item.replyStatus || 'Unreplied',
            hasReply: item.hasReply || 'No',
            isAiReply: item.isAiReply || false,
        }));
    }

    private async getBaseData(organizationId: string): Promise<Review[]> {
        if (this.cachedReviews) return this.cachedReviews;
        if (this.fetchPromise) return this.fetchPromise;

        this.fetchPromise = this.fetchFromApi(organizationId).then(data => {
            this.cachedReviews = data;
            this.fetchPromise = null;
            return data;
        }).catch(err => {
            this.fetchPromise = null;
            throw err;
        });

        return this.fetchPromise;
    }

    private async runEmbeddingSearch(
        baseData: Review[],
        params: FetchReviewsParams
    ): Promise<Review[]> {
        interface EmbeddingSearchResult { id: string; text: string; }
        interface EmbeddingSearchResponse { reviews?: EmbeddingSearchResult[]; }

        const result = await apiClient.post<EmbeddingSearchResponse>('/reviews/search/embedding', {
            query: params.search,
            limit: 50,
        });

        const embeddingMatches: EmbeddingSearchResult[] = result?.reviews ?? [];

        const byId = new Map(baseData.map(r => [String(r.id), r]));
        const byText = new Map(baseData.map(r => [r.reviewText.trim().toLowerCase(), r]));
        const seen = new Set<string>();
        const orderedMatches: Review[] = [];

        for (const match of embeddingMatches) {
            const resolved = byId.get(String(match.id)) || byText.get((match.text || '').trim().toLowerCase());
            if (!resolved) continue;
            const key = String(resolved.id);
            if (!seen.has(key)) { orderedMatches.push(resolved); seen.add(key); }
        }

        return orderedMatches;
    }

    async getReviews(organizationId: string, params: FetchReviewsParams): Promise<PaginatedResponse<Review>> {
        const baseData = await this.getBaseData(organizationId);
        let filteredData = [...baseData];

        // Search
        if (params.search) {
            if (params.useEmbeddingSearch) {
                try {
                    filteredData = await this.runEmbeddingSearch(filteredData, params);
                } catch {
                    const q = params.search.toLowerCase();
                    filteredData = filteredData.filter(r =>
                        r.reviewText.toLowerCase().includes(q) || r.userName.toLowerCase().includes(q)
                    );
                }
            } else {
                const q = params.search.toLowerCase();
                filteredData = filteredData.filter(r =>
                    r.reviewText.toLowerCase().includes(q) || r.userName.toLowerCase().includes(q)
                );
            }
        }

        // Filters
        if (params.rating?.length)    filteredData = filteredData.filter(r => params.rating!.includes(r.rating));
        if (params.sentiment?.length) filteredData = filteredData.filter(r => params.sentiment!.includes(r.sentiment));
        if (params.source?.length)    filteredData = filteredData.filter(r => params.source!.includes(r.source));
        if (params.category?.length)  filteredData = filteredData.filter(r => r.categories.some(c => params.category!.includes(c)));
        if (params.language?.length)  filteredData = filteredData.filter(r => params.language!.includes(r.language || 'English'));
        if (params.status?.length)    filteredData = filteredData.filter(r => params.status!.includes(r.status));
        if (params.hasAiReply)        filteredData = filteredData.filter(r => r.status !== 'Pending');

        if (params.dateFrom || params.dateTo) {
            filteredData = filteredData.filter(r => {
                const d = new Date(r.date).getTime();
                const from = params.dateFrom ? new Date(params.dateFrom).getTime() : -Infinity;
                const to   = params.dateTo   ? new Date(params.dateTo).getTime()   : Infinity;
                return d >= from && d <= to;
            });
        }

        // Sort
        const sortBy    = params.sortBy    || 'date';
        const sortOrder = params.sortOrder || 'desc';
        filteredData.sort((a, b) => {
            if (sortBy === 'date')   return sortOrder === 'asc' ? new Date(a.date).getTime() - new Date(b.date).getTime() : new Date(b.date).getTime() - new Date(a.date).getTime();
            if (sortBy === 'rating') return sortOrder === 'asc' ? a.rating - b.rating : b.rating - a.rating;
            return 0;
        });

        // Paginate
        const total      = filteredData.length;
        const limit      = params.limit || 15;
        const page       = params.page  || 0;
        const totalPages = Math.ceil(total / limit);
        const paged      = filteredData.slice(page * limit, page * limit + limit);

        return { data: paged, total, page, limit, totalPages };
    }

    async getStats(organizationId: string): Promise<ReviewStats> {
        const reviews = await this.getBaseData(organizationId);
        const totalReviews   = reviews.length;
        const pendingReplies = reviews.filter(r => r.replyStatus === 'Unreplied' || r.status === 'Pending').length;

        const sentimentMap: Record<string, number> = { Positive: 1, Neutral: 0, Negative: -1 };
        const sentimentScore = reviews.reduce((sum, r) => sum + (sentimentMap[r.sentiment] ?? 0), 0);
        const averageRating  = totalReviews > 0 ? Number((reviews.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(1)) : 0;
        const normalizedSentiment = totalReviews > 0 ? Math.round(((sentimentScore / totalReviews) + 1) * 50) : 50;

        return { totalReviews, averageRating, pendingReplies, sentimentScore: normalizedSentiment };
    }

    async getOptions(organizationId: string): Promise<{ sources: string[]; categories: string[] }> {
        const reviews = await this.getBaseData(organizationId);
        return {
            sources:    Array.from(new Set(reviews.map(r => r.source))).sort(),
            categories: Array.from(new Set(reviews.flatMap(r => r.categories ?? []))).sort(),
        };
    }

    async generateReply(
        review: Review,
        tone: 'professional' | 'casual' | 'standard' = 'standard',
        length: 'short' | 'standard' = 'standard'
    ): Promise<string> {
        const reviewText = (review.reviewText || review.summary || '').trim();
        if (!reviewText) throw new Error('Reply generation requires review text.');

        const result = await apiClient.post<{ reply?: string; provider?: string; providerError?: string }>('/reviews/generate', {
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
        const reviews = await this.getBaseData(organizationId);
        const review  = reviews.find(r => r.id === reviewId);
        if (review) review.status = status;
    }

    async saveReply(organizationId: string, reviewId: string | number, replyText: string): Promise<void> {
        await apiClient.post(`/reviews/${reviewId}/reply`, { replyText });
        const reviews = await this.getBaseData(organizationId);
        const review  = reviews.find(r => r.id === reviewId);
        if (review) review.status = 'Replied';
    }

    clearCache(): void {
        this.cachedReviews = null;
        this.fetchPromise  = null;
    }
}

export const reviewsService = new ReviewsService();
