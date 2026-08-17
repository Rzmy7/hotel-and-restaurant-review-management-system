import { useQuery } from '@tanstack/react-query';
import { reviewsService } from '../services/reviewsService';
import type { Review as DetailedReview } from '../types/reviews';

export const useReviewDetail = (
    reviewId: string | null,
    reviewerName?: string,
    heading?: string,
    placeholderReview?: DetailedReview | null
) => {
    // reviewerName / heading are accepted for call-site compatibility;
    // the detail is now fetched directly via GET /reviews/{id}.
    void reviewerName;
    void heading;

    const { data, isLoading, isFetching, error, refetch } = useQuery({
        queryKey: ['review', 'detail', reviewId],
        queryFn: async (): Promise<DetailedReview | null> => {
            if (!reviewId) return null;

            const detail = await reviewsService.getReviewById(reviewId);
            if (!detail) return null;

            // The detail endpoint omits some list-row fields (photos, language,
            // firstSeen) — fill them from the placeholder/list row.
            return {
                ...placeholderReview,
                ...detail,
                photos: placeholderReview?.photos?.length ? placeholderReview.photos : detail.photos,
                language: placeholderReview?.language ?? detail.language,
            };
        },
        enabled: !!reviewId,
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
