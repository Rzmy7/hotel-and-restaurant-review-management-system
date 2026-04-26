import { useQuery, useQueryClient } from "@tanstack/react-query";
import { reviewsService } from "../services/reviewsService";
import type { FetchReviewsParams } from "../types/reviews";

export function useReviewsData(
  organizationId: string,
  params: FetchReviewsParams,
) {
  const queryClient = useQueryClient();

  // 1. Fetch Reviews with pagination/filters
  const reviewsQuery = useQuery({
    queryKey: ["reviews", organizationId, params],
    queryFn: () => reviewsService.getReviews(organizationId, params),
    placeholderData: (previousData) => previousData, // keepPreviousData in v5
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // 2. Fetch Stats
  const statsQuery = useQuery({
    queryKey: ["review-stats", organizationId, params],
    queryFn: () => reviewsService.getStats(organizationId, params),
    staleTime: 5 * 60 * 1000,
  });

  // 3. Fetch Options (sources, categories) - fetch once per organization
  const optionsQuery = useQuery({
    queryKey: ["review-options", organizationId],
    queryFn: () => reviewsService.getOptions(organizationId),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["reviews", organizationId] });
    queryClient.invalidateQueries({
      queryKey: ["review-stats", organizationId],
    });
  };

  const paginatedData = reviewsQuery.data;

  return {
    reviews: paginatedData?.data || [],
    pagination: {
      total: paginatedData?.total || 0,
      page: paginatedData?.page || 0,
      limit: paginatedData?.limit || 15,
      totalPages: paginatedData?.totalPages || 0,
    },
    stats: statsQuery.data || null,
    filtersConfig: optionsQuery.data || { sources: [], categories: [] },
    isLoading: reviewsQuery.isLoading || statsQuery.isLoading,
    error: reviewsQuery.error ? "Unable to load reviews." : null,
    refresh,
  };
}
