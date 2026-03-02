import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { Review, ReviewStats, FilterState } from '../types/reviews';
import { useReviewFilters } from '../hooks/useReviewFilters';
import { useReviewsData } from '../hooks/useReviewsData';
import { useReviewModal } from '../hooks/useReviewModal';

interface ReviewsContextType {
    // Data State
    reviews: Review[];
    stats: ReviewStats | null;
    loading: boolean;
    error: string | null;

    // Pagination & Config
    pagination: { total: number; page: number; limit: number; totalPages: number };
    sourceOptions: string[];
    categoryOptions: string[];

    // Filters & Actions
    filters: FilterState & { page: number };
    setSearchQuery: (query: string) => void;
    toggleFilter: (type: keyof Omit<FilterState, 'search' | 'hasAiReply'>, value: string | number) => void;
    toggleAiReplyFilter: () => void;
    setPage: (page: number) => void;
    refreshData: () => void;

    // Modal State
    selectedReview: Review | null;
    isModalOpen: boolean;
    openReview: (review: Review) => void;
    closeReview: () => void;
    navigateReview: (direction: 'next' | 'prev') => void;
}

const ReviewsContext = createContext<ReviewsContextType | undefined>(undefined);

export const ReviewsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // 1. Manage URL synchronization and filtering parameters
    const {
        filters,
        fetchParams,
        setSearchQuery,
        toggleFilter,
        toggleAiReplyFilter,
        setPage
    } = useReviewFilters();

    // 2. Fetch remote data based on active parameters
    const {
        reviews,
        pagination,
        stats,
        filtersConfig,
        isLoading,
        error,
        refresh
    } = useReviewsData(fetchParams);

    // 3. Manage interaction state for the details modal
    const {
        selectedReview,
        isModalOpen,
        openReview,
        closeReview,
        navigateReview
    } = useReviewModal(reviews);

    return (
        <ReviewsContext.Provider value={{
            reviews,
            stats,
            loading: isLoading,
            error,
            pagination,
            sourceOptions: filtersConfig.sources,
            categoryOptions: filtersConfig.categories,
            filters,
            setSearchQuery,
            toggleFilter,
            toggleAiReplyFilter,
            setPage,
            refreshData: refresh,
            selectedReview,
            isModalOpen,
            openReview,
            closeReview,
            navigateReview
        }}>
            {children}
        </ReviewsContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useReviews = () => {
    const context = useContext(ReviewsContext);
    if (!context) {
        throw new Error('useReviews must be used within a ReviewsProvider');
    }
    return context;
};
