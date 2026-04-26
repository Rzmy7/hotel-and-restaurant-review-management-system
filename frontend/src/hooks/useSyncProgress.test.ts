import { renderHook, act } from '@testing-library/react';
import { useSyncProgress } from './useSyncProgress';
import { useQueryClient } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock react-query
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(),
}));

describe('useSyncProgress Hook', () => {
  const mockInvalidateQueries = vi.fn();
  let latestWsInstance: any;
  
  // Create a mock WebSocket class
  class MockWebSocket {
    url: string;
    onopen: any = null;
    onmessage: any = null;
    onclose: any = null;
    onerror: any = null;
    close = vi.fn();

    constructor(url: string) {
      this.url = url;
      latestWsInstance = this;
    }
  }
  
  beforeEach(() => {
    vi.clearAllMocks();
    (useQueryClient as any).mockReturnValue({ invalidateQueries: mockInvalidateQueries });
    latestWsInstance = null;
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should not connect if sourceId is missing', () => {
    renderHook(() => useSyncProgress(null, true));
    expect(latestWsInstance).toBeNull();
  });

  it('should connect when isActive is true and sourceId is provided', () => {
    renderHook(() => useSyncProgress('source-1', true));
    expect(latestWsInstance).toBeDefined();
    expect(latestWsInstance.url).toContain('source-1');
  });

  it('should update progress state on message', () => {
    const { result } = renderHook(() => useSyncProgress('source-1', true));
    
    const mockData = {
      status: 'running',
      percentage: 50,
      reviews_extracted: 10,
      total_reviews: 20
    };
    
    act(() => {
      latestWsInstance.onmessage({ data: JSON.stringify(mockData) });
    });
    
    expect(result.current.progress).toEqual(mockData);
  });

  it('should invalidate queries when sync completes', () => {
    renderHook(() => useSyncProgress('source-1', true));
    
    const mockData = { status: 'completed', percentage: 100 };
    
    act(() => {
      latestWsInstance.onmessage({ data: JSON.stringify(mockData) });
    });
    
    expect(mockInvalidateQueries).toHaveBeenCalled();
  });

  it('should close connection on unmount', () => {
    const { unmount } = renderHook(() => useSyncProgress('source-1', true));
    const ws = latestWsInstance;
    unmount();
    expect(ws.close).toHaveBeenCalled();
  });

  it('should update isConnected state on open/close', () => {
    const { result } = renderHook(() => useSyncProgress('source-1', true));
    
    expect(result.current.isConnected).toBe(false);
    
    act(() => {
      latestWsInstance.onopen();
    });
    expect(result.current.isConnected).toBe(true);
    
    act(() => {
      latestWsInstance.onclose();
    });
    expect(result.current.isConnected).toBe(false);
  });
});
