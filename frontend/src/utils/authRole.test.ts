import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeRole, isAdminRole, isExternalDestination, getDashboardPathForRole } from './authRole';
import { getAdminPanelUrl } from '../config/api';

// Mock the config
vi.mock('../config/api', () => ({
  getAdminPanelUrl: vi.fn(() => 'http://admin-test.com')
}));

describe('authRole Utility', () => {
  describe('normalizeRole', () => {
    it('should normalize a string to uppercase and trimmed', () => {
      expect(normalizeRole('  admin  ')).toBe('ADMIN');
      expect(normalizeRole('User')).toBe('USER');
    });

    it('should handle arrays by taking the first element', () => {
      expect(normalizeRole(['admin', 'editor'])).toBe('ADMIN');
    });

    it('should handle empty arrays', () => {
      expect(normalizeRole([])).toBe('');
    });

    it('should return empty string for invalid inputs', () => {
      expect(normalizeRole(null)).toBe('');
      expect(normalizeRole(undefined)).toBe('');
      expect(normalizeRole({})).toBe('');
    });
  });

  describe('isAdminRole', () => {
    it('should return true for ADMIN, SYSTEM_ADMIN, SUPER_ADMIN', () => {
      expect(isAdminRole('ADMIN')).toBe(true);
      expect(isAdminRole('SYSTEM_ADMIN')).toBe(true);
      expect(isAdminRole('SUPER_ADMIN')).toBe(true);
      expect(isAdminRole(['SUPER_ADMIN'])).toBe(true);
    });

    it('should return false for other roles', () => {
      expect(isAdminRole('USER')).toBe(false);
      expect(isAdminRole('EDITOR')).toBe(false);
      expect(isAdminRole('')).toBe(false);
    });
  });

  describe('isExternalDestination', () => {
    it('should return true for absolute URLs', () => {
      expect(isExternalDestination('http://example.com')).toBe(true);
      expect(isExternalDestination('https://test.lk')).toBe(true);
    });

    it('should return false for relative paths', () => {
      expect(isExternalDestination('/dashboard')).toBe(false);
      expect(isExternalDestination('settings')).toBe(false);
    });
  });

  describe('getDashboardPathForRole', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      localStorage.clear();
    });

    it('should return /dashboard for non-admin roles', () => {
      expect(getDashboardPathForRole('USER')).toBe('/dashboard');
    });

    it('should return admin panel URL for admin roles', () => {
      expect(getDashboardPathForRole('ADMIN')).toContain('http://admin-test.com');
    });

    it('should include token and user in admin URL if available in localStorage', () => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('authUser', 'test-user');
      
      const path = getDashboardPathForRole('ADMIN');
      expect(path).toContain('token=test-token');
      expect(path).toContain('user=test-user');
    });
  });
});
