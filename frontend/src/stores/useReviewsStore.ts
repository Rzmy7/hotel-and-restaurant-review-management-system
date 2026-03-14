import { create } from 'zustand';
import type { Review, ReviewStats, PaginatedResponse } from '../types/reviews';
import { reviewsService } from '../services/reviewsService';

interface ReviewsState {
    // Data
    reviews: Review[];
    stats: ReviewStats | null;
    loading: boolean;
    error: string | null;

    // Pagination & Config
    pagination: { total: number; page: number; limit: number; totalPages: number };
    sourceOptions: string[];
    categoryOptions: string[];

    // Modal State
    selectedReview: Review | null;
    isModalOpen: boolean;

    // Actions
    fetchReviews: (params: any, silent?: boolean) => Promise<void>;
    refreshData: (params: any) => void;
    
    // Modal Actions
    openReview: (review: Review) => void;
    closeReview: () => void;
    navigateReview: (direction: 'next' | 'prev') => void;
}

export const useReviewsStore = create<ReviewsState>((set, get) => ({
    reviews: [],
    stats: null,
    loading: true,
    error: null,

    pagination: { total: 0, page: 0, limit: 15, totalPages: 0 },
    sourceOptions: [],
    categoryOptions: [],

    selectedReview: null,
    isModalOpen: false,

    fetchReviews: async (params, silent = false) => {
        if (!silent) set({ loading: true });
        set({ error: null });

        try {
            const [fetchedReviews, fetchedStats, fetchedOptions] = await Promise.all([
                reviewsService.getReviews(params),
                reviewsService.getStats(),
                reviewsService.getOptions()
            ]);

            set({
                reviews: fetchedReviews.data,
                pagination: {
                    total: fetchedReviews.total,
                    page: fetchedReviews.page,
                    limit: fetchedReviews.limit,
                    totalPages: fetchedReviews.totalPages
                },
                stats: fetchedStats,
                sourceOptions: fetchedOptions.sources,
                categoryOptions: fetchedOptions.categories,
                loading: false
            });
        } catch (err) {
            console.error('Failed to fetch reviews:', err);
            set({ error: 'Unable to load reviews data. Please try again.', loading: false });
        }
    },

    refreshData: (params) => {
        reviewsService.clearCache();
        get().fetchReviews(params, false);
    },

    openReview: (review) => {
        set({ selectedReview: review, isModalOpen: true });
    },

    closeReview: () => {
        set({ isModalOpen: false, selectedReview: null });
    },

    navigateReview: (direction) => {
        const { selectedReview, reviews } = get();
        if (!selectedReview) return;
        const currentIndex = reviews.findIndex(r => r.id === selectedReview.id);
        if (currentIndex === -1) return;

        let newIndex = currentIndex;
        if (direction === 'next' && currentIndex < reviews.length - 1) {
            newIndex = currentIndex + 1;
        } else if (direction === 'prev' && currentIndex > 0) {
            newIndex = currentIndex - 1;
        }
        
        if (newIndex !== currentIndex) {
            set({ selectedReview: reviews[newIndex] });
        }
    }
}));
