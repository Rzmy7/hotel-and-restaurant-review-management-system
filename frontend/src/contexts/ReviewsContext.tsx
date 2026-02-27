import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { Review, ReviewStats, FilterState } from '../types/reviews';
import { reviewsService } from '../services/reviewsService';

interface ReviewsContextType {
    reviews: Review[];
    filteredReviews: Review[];
    stats: ReviewStats | null;
    loading: boolean;
    error: string | null;
    filters: FilterState;
    setSearchQuery: (query: string) => void;
    toggleFilter: (type: keyof Omit<FilterState, 'search' | 'hasAiReply'>, value: string | number) => void;
    toggleAiReplyFilter: () => void;
    selectedReview: Review | null;
    isModalOpen: boolean;
    openReview: (review: Review) => void;
    closeReview: () => void;
    refreshData: () => Promise<void>;
}

const ReviewsContext = createContext<ReviewsContextType | undefined>(undefined);

export const ReviewsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [stats, setStats] = useState<ReviewStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initialize filters from URL
    const initialFilters = useMemo(() => {
        const getParam = (key: string) => searchParams.getAll(key);
        return {
            search: searchParams.get('q') || '',
            rating: getParam('rating').map(Number),
            sentiment: getParam('sentiment'),
            source: getParam('source'),
            category: getParam('category'),
            language: getParam('language'),
            hasAiReply: searchParams.get('ai_reply') === 'true'
        };
    }, [searchParams]);

    const [filters, setFilters] = useState<FilterState>(initialFilters);

    // Sync state with URL when it changes (handle back/forward browser buttons)
    useEffect(() => {
        setFilters(initialFilters);
    }, [initialFilters]);

    const [selectedReview, setSelectedReview] = useState<Review | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Fetch Reviews and Stats
    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [reviewsData, statsData] = await Promise.all([
                reviewsService.getReviews(),
                reviewsService.getStats()
            ]);
            setReviews(reviewsData);
            setStats(statsData);
            setError(null);
        } catch (err) {
            console.error("Error fetching reviews:", err);
            setError("Failed to load reviews. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const refreshData = async () => {
        await fetchData(true);
    };

    // Filter Logic
    const filteredReviews = useMemo(() => {
        return reviews.filter((review) => {
            // Search
            if (filters.search) {
                const query = filters.search.toLowerCase();
                const matchesSearch =
                    review.reviewText.toLowerCase().includes(query) ||
                    review.userName.toLowerCase().includes(query);
                if (!matchesSearch) return false;
            }

            // Rating
            if (filters.rating.length > 0 && !filters.rating.includes(review.rating)) {
                return false;
            }

            // Sentiment
            if (filters.sentiment.length > 0 && !filters.sentiment.includes(review.sentiment)) {
                return false;
            }

            // Source
            if (filters.source.length > 0 && !filters.source.includes(review.source)) {
                return false;
            }

            // Category
            if (filters.category.length > 0) {
                const hasCategory = review.categories.some(cat => filters.category.includes(cat));
                if (!hasCategory) return false;
            }

            // Language
            if (filters.language.length > 0) {
                const lang = review.language || 'English';
                if (!filters.language.includes(lang)) return false;
            }

            // Has AI Reply
            if (filters.hasAiReply) {
                if (review.status === 'Pending') return false;
            }

            return true;
        });
    }, [reviews, filters]);

    // Helper to update URL params
    const updateUrlParams = (newFilters: FilterState) => {
        const params = new URLSearchParams();
        if (newFilters.search) params.set('q', newFilters.search);
        newFilters.rating.forEach(v => params.append('rating', v.toString()));
        newFilters.sentiment.forEach(v => params.append('sentiment', v));
        newFilters.source.forEach(v => params.append('source', v));
        newFilters.category.forEach(v => params.append('category', v));
        newFilters.language.forEach(v => params.append('language', v));
        if (newFilters.hasAiReply) params.set('ai_reply', 'true');
        setSearchParams(params);
    };

    // Actions
    const setSearchQuery = (query: string) => {
        const newFilters = { ...filters, search: query };
        setFilters(newFilters);
        updateUrlParams(newFilters);
    };

    const toggleFilter = (type: keyof Omit<FilterState, 'search' | 'hasAiReply'>, value: string | number) => {
        const currentValues = filters[type] as any[];
        const exists = currentValues.includes(value);
        const newValues = exists
            ? currentValues.filter(v => v !== value)
            : [...currentValues, value];

        const newFilters = { ...filters, [type]: newValues };
        setFilters(newFilters);
        updateUrlParams(newFilters);
    };

    const toggleAiReplyFilter = () => {
        const newFilters = { ...filters, hasAiReply: !filters.hasAiReply };
        setFilters(newFilters);
        updateUrlParams(newFilters);
    };

    const openReview = (review: Review) => {
        setSelectedReview(review);
        setIsModalOpen(true);
    };

    const closeReview = () => {
        setIsModalOpen(false);
        setSelectedReview(null);
    };

    return (
        <ReviewsContext.Provider value={{
            reviews,
            filteredReviews,
            stats,
            loading,
            error,
            filters,
            setSearchQuery,
            toggleFilter,
            toggleAiReplyFilter,
            selectedReview,
            isModalOpen,
            openReview,
            closeReview,
            refreshData
        }}>
            {children}
        </ReviewsContext.Provider>
    );
};

export const useReviews = () => {
    const context = useContext(ReviewsContext);
    if (!context) {
        throw new Error('useReviews must be used within a ReviewsProvider');
    }
    return context;
};
