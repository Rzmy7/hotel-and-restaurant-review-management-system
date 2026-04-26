import { renderHook, act } from '@testing-library/react';
import { useSettings } from './useSettings';
import { settingsService } from '../services/settingsService';
import { useToast } from '../contexts/ToastContext';
import { useOrganizationStore } from '../stores/useOrganizationStore';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../services/settingsService', () => ({
  settingsService: {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../stores/useOrganizationStore', () => ({
  useOrganizationStore: vi.fn(),
}));

describe('useSettings Hook', () => {
  const mockShowToast = vi.fn();
  const mockSettings = { hotelInfo: { name: 'Test Hotel' }, scraping: {} };
  
  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as any).mockReturnValue({ showToast: mockShowToast });
    (useOrganizationStore as any).mockImplementation((selector: any) => selector({ currentOrg: { id: 'org-1' } }));
    (settingsService.getSettings as any).mockResolvedValue(mockSettings);
  });

  it('should load settings on mount', async () => {
    const { result } = renderHook(() => useSettings());
    
    // Initial state
    expect(result.current.loading).toBe(true);
    
    // Wait for load
    await act(async () => {
      // The useEffect calls loadSettings
    });
    
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(mockSettings);
    expect(settingsService.getSettings).toHaveBeenCalled();
  });

  it('should handle load error', async () => {
    (settingsService.getSettings as any).mockRejectedValue(new Error('Fetch failed'));
    
    const { result } = renderHook(() => useSettings());
    
    await act(async () => {});
    
    expect(result.current.error).toBe('Fetch failed');
    expect(mockShowToast).toHaveBeenCalledWith('Failed to load settings', 'error');
  });

  it('should update settings successfully', async () => {
    const updatedSettings = { ...mockSettings, hotelInfo: { name: 'New Name' } };
    (settingsService.updateSettings as any).mockResolvedValue(updatedSettings);
    
    const { result } = renderHook(() => useSettings());
    await act(async () => {}); // initial load
    
    let success;
    await act(async () => {
      success = await result.current.updateSettings({ hotelInfo: { name: 'New Name' } });
    });
    
    expect(success).toBe(true);
    expect(result.current.data).toEqual(updatedSettings);
    expect(mockShowToast).toHaveBeenCalledWith('Settings saved successfully', 'success');
  });

  it('should handle update error', async () => {
    (settingsService.updateSettings as any).mockRejectedValue(new Error('Update failed'));
    
    const { result } = renderHook(() => useSettings());
    await act(async () => {}); // initial load
    
    let success;
    await act(async () => {
      success = await result.current.updateSettings({ hotelInfo: { name: 'New Name' } });
    });
    
    expect(success).toBe(false);
    expect(mockShowToast).toHaveBeenCalledWith('Failed to save settings', 'error');
  });
});
