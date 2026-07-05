import { useQuery } from '@tanstack/react-query';
import { useOrganizationStore } from '../stores/useOrganizationStore';
import { reviewsService } from '../services/reviewsService';
import type { Review as DetailedReview } from '../types/reviews';

export const useReviewDetail = (
    reviewId: string | null, 
    reviewerName?: string, 
    heading?: string,
    placeholderReview?: DetailedReview | null
) => {
    const currentOrg = useOrganizationStore(state => state.currentOrg);

    const { data, isLoading, isFetching, error, refetch } = useQuery({
        queryKey: ['review', 'detail', reviewId],
        queryFn: async (): Promise<DetailedReview | null> => {
            if (!currentOrg || !reviewId) return null;

            // Step 1: Query reviews using a search query to find the exact review matching the heading or reviewerName
            const searchQuery = heading || reviewerName || '';
            if (searchQuery) {
                const response = await reviewsService.getReviews(currentOrg.id, {
                    page: 0,
                    limit: 10,
                    search: searchQuery,
                });

                const matched = response.data.find(r => r.id === reviewId);
                if (matched) {
                    return matched;
                }
            }

            // Step 2: Fallback — query first page of reviews
            const response = await reviewsService.getReviews(currentOrg.id, {
                page: 0,
                limit: 50,
            });
            const matched = response.data.find(r => r.id === reviewId);
            return matched ?? null;
        },
        enabled: !!currentOrg && !!reviewId,
        staleTime: 5 * 60 * 1000, // Cache review details for 5 minutes
        placeholderData: placeholderReview || undefined,
    });

    return {
        data,
        loading: isLoading,
        isFetching,
        error: error instanceof Error ? error.message : null,
        refetch,
    };
};
export default useReviewDetail;
