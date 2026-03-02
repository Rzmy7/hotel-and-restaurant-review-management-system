import { useState, useCallback } from 'react';
import type { Review } from '../types/reviews';

export function useReviewModal(filteredReviews: Review[]) {
    const [selectedReview, setSelectedReview] = useState<Review | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const openReview = useCallback((review: Review) => {
        setSelectedReview(review);
        setIsModalOpen(true);
    }, []);

    const closeReview = useCallback(() => {
        setIsModalOpen(false);
        setSelectedReview(null);
    }, []);

    const navigateReview = useCallback((direction: 'next' | 'prev') => {
        if (!selectedReview) return;
        const currentIndex = filteredReviews.findIndex(r => r.id === selectedReview.id);
        if (currentIndex === -1) return;

        let newIndex;
        if (direction === 'next') {
            if (currentIndex >= filteredReviews.length - 1) return;
            newIndex = currentIndex + 1;
        } else {
            if (currentIndex <= 0) return;
            newIndex = currentIndex - 1;
        }
        setSelectedReview(filteredReviews[newIndex]);
    }, [filteredReviews, selectedReview]);

    return {
        selectedReview,
        isModalOpen,
        openReview,
        closeReview,
        navigateReview
    };
}
