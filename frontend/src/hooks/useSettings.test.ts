import { renderHook, act } from '@testing-library/react';
import { useSettings } from './useSettings';
import { useToast } from '../contexts/ToastContext';
import { useOrganizationStore } from '../stores/useOrganizationStore';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';

// Mock UI Contexts/Stores (UI Logic)
vi.mock('../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../stores/useOrganizationStore', () => ({
  useOrganizationStore: vi.fn(),
}));

describe('useSettings Hook (MSW Refactored)', () => {
  const mockShowToast = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('current_organization', 'org-1');
    localStorage.setItem('token', 'fake-token');
    (useToast as any).mockReturnValue({ showToast: mockShowToast });
    (useOrganizationStore as any).mockImplementation((selector: any) => selector({ currentOrg: { id: 'org-1' } }));
  });

  it('should load settings on mount using MSW', async () => {
    const { result } = renderHook(() => useSettings());
    
    expect(result.current.loading).toBe(true);
    
    // Wait for MSW intercepted response
    await act(async () => {}); 
    
    expect(result.current.loading).toBe(false);
    expect(result.current.data?.hotelInfo.hotelName).toBe('Mock Hotel');
  });

  it('should update settings successfully using MSW', async () => {
    const { result } = renderHook(() => useSettings());
    await act(async () => {}); // initial load
    
    let success;
    await act(async () => {
      success = await result.current.updateSettings({ hotelInfo: { hotelName: 'Updated Hotel' } });
    });
    
    expect(success).toBe(true);
    expect(result.current.data?.hotelInfo.hotelName).toBe('Updated Hotel');
    expect(mockShowToast).toHaveBeenCalledWith('Settings saved successfully', 'success');
  });

  it('should handle update error using MSW', async () => {
    server.use(
      http.patch('*/organizations/org-1', () => {
        return new HttpResponse(JSON.stringify({ detail: 'Validation failed' }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    
    const { result } = renderHook(() => useSettings());
    await act(async () => {}); // initial load
    
    let success;
    await act(async () => {
      success = await result.current.updateSettings({ hotelInfo: { hotelName: 'Invalid' } });
    });
    
    expect(success).toBe(false);
    expect(mockShowToast).toHaveBeenCalledWith('Failed to save settings', 'error');
  });
});
