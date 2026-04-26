import { renderHook, act } from '@testing-library/react';
import { useReviewFilters } from './useReviewFilters';
import { useSearchParams } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useSearchParams: vi.fn(),
}));

describe('useReviewFilters Hook', () => {
  const mockSetSearchParams = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    (useSearchParams as any).mockReturnValue([new URLSearchParams(), mockSetSearchParams]);
  });

  it('should initialize with default filters', () => {
    const { result } = renderHook(() => useReviewFilters());
    
    expect(result.current.filters.search).toBe('');
    expect(result.current.filters.page).toBe(0);
    expect(result.current.filters.rating).toEqual([]);
  });

  it('should initialize filters from URL parameters', () => {
    const params = new URLSearchParams();
    params.set('q', 'test query');
    params.set('page', '2');
    params.append('rating', '4');
    params.append('rating', '5');
    
    (useSearchParams as any).mockReturnValue([params, mockSetSearchParams]);
    
    const { result } = renderHook(() => useReviewFilters());
    
    expect(result.current.filters.search).toBe('test query');
    expect(result.current.filters.page).toBe(2);
    expect(result.current.filters.rating).toEqual([4, 5]);
  });

  it('should update search query and reset page', () => {
    const { result } = renderHook(() => useReviewFilters());
    
    act(() => {
      result.current.setSearchQuery('new search');
    });
    
    expect(result.current.filters.search).toBe('new search');
    expect(result.current.filters.page).toBe(0);
    expect(mockSetSearchParams).toHaveBeenCalled();
    const sentParams = mockSetSearchParams.mock.calls[0][0];
    expect(sentParams.get('q')).toBe('new search');
  });

  it('should toggle filters correctly', () => {
    const { result } = renderHook(() => useReviewFilters());
    
    act(() => {
      result.current.toggleFilter('rating', 4);
    });
    
    expect(result.current.filters.rating).toEqual([4]);
    
    act(() => {
      result.current.toggleFilter('rating', 4);
    });
    
    expect(result.current.filters.rating).toEqual([]);
  });

  it('should set date range and reset page', () => {
    const { result } = renderHook(() => useReviewFilters());
    
    act(() => {
      result.current.setDateRange('2023-01-01', '2023-12-31');
    });
    
    expect(result.current.filters.dateFrom).toBe('2023-01-01');
    expect(result.current.filters.dateTo).toBe('2023-12-31');
    expect(result.current.filters.page).toBe(0);
  });

  it('should compute fetchParams correctly', () => {
    const { result } = renderHook(() => useReviewFilters());
    
    expect(result.current.fetchParams.limit).toBe(15);
    expect(result.current.fetchParams.sortBy).toBe('date');
  });
});
