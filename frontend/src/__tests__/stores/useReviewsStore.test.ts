/**
 * Unit tests for useReviewsStore (Zustand store).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useReviewsStore } from '../../stores/useReviewsStore';
import type { Review } from '../../types/reviews';


const makeReview = (id: string, overrides?: Partial<Review>): Review => ({
    id,
    userName: `Reviewer ${id}`,
    rating: 4,
    reviewText: `Review text ${id}`,
    date: '2026-04-15',
    source: 'Google',
    sentiment: 'Positive',
    language: 'en',
    categories: ['Service'],
    status: 'processed',
    ...overrides,
});


describe('useReviewsStore', () => {
    beforeEach(() => {
        useReviewsStore.setState({
            reviews: [],
            stats: null,
            loading: true,
            error: null,
            pagination: { total: 0, page: 0, limit: 15, totalPages: 0 },
            sourceOptions: [],
            categoryOptions: [],
            selectedReview: null,
            isModalOpen: false,
        });
    });


    // ── Initial state ────────────────────────────────────────────

    it('has empty initial reviews', () => {
        expect(useReviewsStore.getState().reviews).toEqual([]);
    });

    it('is initially loading', () => {
        expect(useReviewsStore.getState().loading).toBe(true);
    });

    it('has no initial error', () => {
        expect(useReviewsStore.getState().error).toBeNull();
    });

    it('modal is initially closed', () => {
        expect(useReviewsStore.getState().isModalOpen).toBe(false);
    });

    it('no selected review initially', () => {
        expect(useReviewsStore.getState().selectedReview).toBeNull();
    });

    it('default pagination', () => {
        const { pagination } = useReviewsStore.getState();
        expect(pagination.limit).toBe(15);
        expect(pagination.page).toBe(0);
    });


    // ── Modal actions ────────────────────────────────────────────

    it('openReview sets selectedReview and opens modal', () => {
        const review = makeReview('r1');
        useReviewsStore.getState().openReview(review);

        const state = useReviewsStore.getState();
        expect(state.selectedReview).toEqual(review);
        expect(state.isModalOpen).toBe(true);
    });

    it('closeReview clears selectedReview and closes modal', () => {
        useReviewsStore.getState().openReview(makeReview('r1'));
        useReviewsStore.getState().closeReview();

        const state = useReviewsStore.getState();
        expect(state.selectedReview).toBeNull();
        expect(state.isModalOpen).toBe(false);
    });


    // ── navigateReview ───────────────────────────────────────────

    it('navigateReview next moves to next review', () => {
        const reviews = [makeReview('r1'), makeReview('r2'), makeReview('r3')];
        useReviewsStore.setState({ reviews, selectedReview: reviews[0], isModalOpen: true });

        useReviewsStore.getState().navigateReview('next');

        expect(useReviewsStore.getState().selectedReview?.id).toBe('r2');
    });

    it('navigateReview prev moves to previous review', () => {
        const reviews = [makeReview('r1'), makeReview('r2'), makeReview('r3')];
        useReviewsStore.setState({ reviews, selectedReview: reviews[2], isModalOpen: true });

        useReviewsStore.getState().navigateReview('prev');

        expect(useReviewsStore.getState().selectedReview?.id).toBe('r2');
    });

    it('navigateReview next does not go past last review', () => {
        const reviews = [makeReview('r1'), makeReview('r2')];
        useReviewsStore.setState({ reviews, selectedReview: reviews[1], isModalOpen: true });

        useReviewsStore.getState().navigateReview('next');

        expect(useReviewsStore.getState().selectedReview?.id).toBe('r2');
    });

    it('navigateReview prev does not go before first review', () => {
        const reviews = [makeReview('r1'), makeReview('r2')];
        useReviewsStore.setState({ reviews, selectedReview: reviews[0], isModalOpen: true });

        useReviewsStore.getState().navigateReview('prev');

        expect(useReviewsStore.getState().selectedReview?.id).toBe('r1');
    });

    it('navigateReview does nothing with no selected review', () => {
        const reviews = [makeReview('r1')];
        useReviewsStore.setState({ reviews, selectedReview: null });

        useReviewsStore.getState().navigateReview('next');

        expect(useReviewsStore.getState().selectedReview).toBeNull();
    });

    it('navigateReview does nothing with empty reviews', () => {
        useReviewsStore.setState({ reviews: [], selectedReview: makeReview('r1') });

        useReviewsStore.getState().navigateReview('next');
        // selectedReview stays the same since findIndex returns -1
    });

    it('navigateReview accepts custom reviews list', () => {
        const storeReviews = [makeReview('r1')];
        const customReviews = [makeReview('c1'), makeReview('c2'), makeReview('c3')];
        useReviewsStore.setState({ reviews: storeReviews, selectedReview: customReviews[0], isModalOpen: true });

        useReviewsStore.getState().navigateReview('next', customReviews);

        expect(useReviewsStore.getState().selectedReview?.id).toBe('c2');
    });
});
