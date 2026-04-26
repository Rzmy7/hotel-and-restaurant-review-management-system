import { render, screen, fireEvent, act } from '@testing-library/react';
import ReviewsToolbar from './ReviewsToolbar';
import { useReviewsStore } from '../../stores/useReviewsStore';
import { useReviewFilters } from '../../hooks/useReviewFilters';
import { featureFlagService } from '../../services/featureFlagService';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../stores/useReviewsStore', () => ({
  useReviewsStore: vi.fn(),
}));

vi.mock('../../hooks/useReviewFilters', () => ({
  useReviewFilters: vi.fn(),
}));

vi.mock('../../services/featureFlagService', () => ({
  featureFlagService: {
    isContentSearchEnabled: vi.fn(),
  },
}));

describe('ReviewsToolbar Component', () => {
  const mockFilters = {
    search: '',
    rating: [],
    sentiment: [],
    source: [],
    category: [],
    status: [],
    useEmbeddingSearch: false,
  };
  const mockSetSearchQuery = vi.fn();
  const mockToggleFilter = vi.fn();
  const mockSetEmbeddingSearch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useReviewsStore as any).mockImplementation((selector: any) =>
      selector({
        sourceOptions: ['Google', 'Booking'],
        categoryOptions: ['Food', 'Service'],
        pagination: { total: 42 },
      })
    );
    (useReviewFilters as any).mockReturnValue({
      filters: mockFilters,
      setSearchQuery: mockSetSearchQuery,
      toggleFilter: mockToggleFilter,
      setEmbeddingSearch: mockSetEmbeddingSearch,
    });
    (featureFlagService.isContentSearchEnabled as any).mockResolvedValue(false);
  });

  it('renders search input with initial value', () => {
    render(<ReviewsToolbar />);
    const input = screen.getByPlaceholderText(/search reviews/i) as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('updates input value on typing', () => {
    render(<ReviewsToolbar />);
    const input = screen.getByPlaceholderText(/search reviews/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'pizza' } });
    expect(input.value).toBe('pizza');
  });

  it('calls setSearchQuery when search button is clicked', () => {
    render(<ReviewsToolbar />);
    const input = screen.getByPlaceholderText(/search reviews/i);
    fireEvent.change(input, { target: { value: 'pizza' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    expect(mockSetSearchQuery).toHaveBeenCalledWith('pizza');
  });

  it('calls setSearchQuery when Enter is pressed', () => {
    render(<ReviewsToolbar />);
    const input = screen.getByPlaceholderText(/search reviews/i);
    fireEvent.change(input, { target: { value: 'pizza' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(mockSetSearchQuery).toHaveBeenCalledWith('pizza');
  });

  it('opens Rating menu and toggles a filter', () => {
    render(<ReviewsToolbar />);
    fireEvent.click(screen.getByRole('button', { name: /rating/i }));
    
    const fiveStars = screen.getByText('5 Stars');
    fireEvent.click(fiveStars);
    
    expect(mockToggleFilter).toHaveBeenCalledWith('rating', 5);
  });

  it('shows total results from pagination', () => {
    render(<ReviewsToolbar />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('shows Content Search button if feature flag is enabled', async () => {
    (featureFlagService.isContentSearchEnabled as any).mockResolvedValue(true);
    
    await act(async () => {
      render(<ReviewsToolbar />);
    });
    
    expect(screen.getByRole('button', { name: /content search/i })).toBeInTheDocument();
  });
});
