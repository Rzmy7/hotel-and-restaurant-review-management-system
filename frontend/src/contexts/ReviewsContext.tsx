import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
}

interface FilterState {
    search: string;
    rating: number[];
    sentiment: string[];
    source: string[];
}

interface ReviewsContextType {
    reviews: Review[];
    filteredReviews: Review[];
    loading: boolean;
    error: string | null;
    filters: FilterState;
    setSearchQuery: (query: string) => void;
    toggleFilter: (type: keyof Omit<FilterState, 'search'>, value: string | number) => void;
    selectedReview: Review | null;
    isModalOpen: boolean;
    openReview: (review: Review) => void;
    closeReview: () => void;
}

const ReviewsContext = createContext<ReviewsContextType | undefined>(undefined);

export const ReviewsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filters, setFilters] = useState<FilterState>({
        search: '',
        rating: [],
        sentiment: [],
        source: []
    });

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

            return true;
        });
    }, [reviews, filters]);

    // Actions
    const setSearchQuery = (query: string) => {
        setFilters(prev => ({ ...prev, search: query }));
    };

    const toggleFilter = (type: keyof Omit<FilterState, 'search'>, value: string | number) => {
        setFilters(prev => {
            const currentValues = prev[type] as any[];
            const exists = currentValues.includes(value);
            const newValues = exists
                ? currentValues.filter(v => v !== value)
                : [...currentValues, value];

            return { ...prev, [type]: newValues };
        });
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
