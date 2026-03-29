import { useState, useCallback, useEffect } from 'react';
import { reviewsService } from '../services/reviewsService';
import type { Review, ReviewStats, FetchReviewsParams, PaginatedResponse } from '../types/reviews';

export function useReviewsData(organizationId: string, params: FetchReviewsParams) {
    const [paginatedData, setPaginatedData] = useState<PaginatedResponse<Review>>({
        data: [],
        total: 0,
        page: 0,
        limit: 15,
        totalPages: 0
    });

    const [stats, setStats] = useState<ReviewStats | null>(null);
    const [filtersConfig, setFiltersConfig] = useState<{ sources: string[], categories: string[] }>({ sources: [], categories: [] });

    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchReviews = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        setError(null);

        try {
            const [fetchedReviews, fetchedStats, fetchedOptions] = await Promise.all([
                reviewsService.getReviews(organizationId, params),
                reviewsService.getStats(organizationId),
                reviewsService.getOptions(organizationId)
            ]);

            setPaginatedData(fetchedReviews);
            setStats(fetchedStats);
            setFiltersConfig(fetchedOptions);
        } catch (err) {
            console.error('Failed to fetch reviews:', err);
            setError('Unable to load reviews data. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [organizationId, JSON.stringify(params)]);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    const refresh = () => {
        reviewsService.clearCache();
        fetchReviews(false);
    };

    return {
        reviews: paginatedData.data,
        pagination: {
            total: paginatedData.total,
            page: paginatedData.page,
            limit: paginatedData.limit,
            totalPages: paginatedData.totalPages
        },
        stats,
        filtersConfig,
        isLoading,
        error,
        refresh
    };
}
