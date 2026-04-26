import { useReviewsStore } from './useReviewsStore';
import { reviewsService } from '../services/reviewsService';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/reviewsService', () => ({
  reviewsService: {
    getReviews: vi.fn(),
    getStats: vi.fn(),
    getOptions: vi.fn(),
  },
}));

describe('useReviewsStore', () => {
  const mockReview = { id: 'r1', rating: 5, comment: 'Great!' };
  const mockReviewsResponse = {
    data: [mockReview],
    total: 1,
    page: 0,
    limit: 15,
    totalPages: 1,
  };
  const mockStats = { averageRating: 4.5 };
  const mockOptions = { sources: ['Google'], categories: ['Food'] };

  beforeEach(() => {
    vi.clearAllMocks();
    useReviewsStore.setState({
      reviews: [],
      stats: null,
      loading: true,
      error: null,
      selectedReview: null,
      isModalOpen: false,
    });
  });

  it('should fetch reviews and update state', async () => {
    (reviewsService.getReviews as any).mockResolvedValue(mockReviewsResponse);
    (reviewsService.getStats as any).mockResolvedValue(mockStats);
    (reviewsService.getOptions as any).mockResolvedValue(mockOptions);

    await useReviewsStore.getState().fetchReviews('org-1', {});

    const state = useReviewsStore.getState();
    expect(state.reviews).toEqual(mockReviewsResponse.data);
    expect(state.stats).toEqual(mockStats);
    expect(state.sourceOptions).toEqual(mockOptions.sources);
    expect(state.loading).toBe(false);
  });

  it('should handle fetch errors', async () => {
    (reviewsService.getReviews as any).mockRejectedValue(new Error('Network Error'));

    await useReviewsStore.getState().fetchReviews('org-1', {});

    const state = useReviewsStore.getState();
    expect(state.error).toBe('Unable to load reviews data. Please try again.');
    expect(state.loading).toBe(false);
  });

  it('should open and close review modal', () => {
    const store = useReviewsStore.getState();
    
    act(() => {
      store.openReview(mockReview as any);
    });
    
    expect(useReviewsStore.getState().selectedReview).toEqual(mockReview);
    expect(useReviewsStore.getState().isModalOpen).toBe(true);

    act(() => {
      useReviewsStore.getState().closeReview();
    });

    expect(useReviewsStore.getState().selectedReview).toBeNull();
    expect(useReviewsStore.getState().isModalOpen).toBe(false);
  });

  it('should navigate between reviews', () => {
    const reviews = [
      { id: '1', rating: 5 },
      { id: '2', rating: 4 },
      { id: '3', rating: 3 },
    ];
    useReviewsStore.setState({ reviews: reviews as any, selectedReview: reviews[1] as any });

    const store = useReviewsStore.getState();
    
    // Navigate next
    store.navigateReview('next');
    expect(useReviewsStore.getState().selectedReview?.id).toBe('3');

    // Navigate prev
    store.navigateReview('prev');
    expect(useReviewsStore.getState().selectedReview?.id).toBe('2');
  });
});

// Helper for act in pure JS store tests if needed, 
// though Zustand state updates outside React don't strictly require act() 
// unless they trigger React renders we care about in the same test.
function act(fn: () => void) {
  fn();
}
