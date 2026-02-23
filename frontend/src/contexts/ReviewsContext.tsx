import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ReactNode } from 'react';

// Define the shape of a Review Object
export interface Review {
    id: number | string;
    rating: number;
    userName: string;
    reviewText: string;
    sentiment: 'Positive' | 'Negative' | 'Neutral';
    categories: string[];
    source: string;
    date: string;
    status: 'Replied' | 'AI Draft' | 'Pending';
    language?: string;
}

export interface FilterState {
    search: string;
    rating: number[];
    sentiment: string[];
    source: string[];
    category: string[];
    language: string[];
    hasAiReply: boolean;
}

interface ReviewsContextType {
    reviews: Review[];
    filteredReviews: Review[];
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
}

const ReviewsContext = createContext<ReviewsContextType | undefined>(undefined);

export const ReviewsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [reviews, setReviews] = useState<Review[]>([]);
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

    // Fetch Reviews
    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const response = await fetch("http://127.0.0.1:8000/reviews");
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                setReviews(data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching reviews:", err);
                setError("Failed to load reviews from API. Is the backend running?");
                setLoading(false);
            }
        };
        fetchReviews();
    }, []);

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
            loading,
            error,
            filters,
            setSearchQuery,
            toggleFilter,
            toggleAiReplyFilter,
            selectedReview,
            isModalOpen,
            openReview,
            closeReview
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
