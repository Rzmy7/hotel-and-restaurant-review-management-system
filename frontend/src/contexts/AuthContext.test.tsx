import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';

// Test component to consume context
const TestComponent = () => {
  const { user, login, logout, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  return (
    <div>
      <div data-testid="user-email">{user?.email || 'No user'}</div>
      <button onClick={() => login('test@example.com', 'password')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('location', { ...originalLocation, href: '', pathname: '/' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('provides initial state from localStorage', async () => {
    const mockUser = { user_id: '1', email: 'stored@example.com' };
    localStorage.setItem('authUser', JSON.stringify(mockUser));
    localStorage.setItem('token', 'fake-token');

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('user-email')).toHaveTextContent('stored@example.com');
  });

  it('handles successful login', async () => {
    const mockLoginResponse = {
      access_token: 'new-token',
      token_type: 'bearer',
      user: {
        user_id: '2',
        email: 'new@example.com',
        full_name: 'New User',
        role: 'Admin'
      }
    };

    server.use(
      http.post('*/auth/login', () => {
        return HttpResponse.json(mockLoginResponse);
      }),
      http.get('*/user/organizations', () => {
        return HttpResponse.json([{ organization_id: 'org-1', organization_name: 'Org 1' }]);
      })
    );

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('Login').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('new@example.com');
    }, { timeout: 2000 });

    expect(localStorage.getItem('token')).toBe('new-token');
    expect(localStorage.getItem('current_organization')).toBe('org-1');
  });

  it('handles logout', async () => {
    localStorage.setItem('authUser', JSON.stringify({ email: 'test@example.com' }));
    localStorage.setItem('token', 'token');

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('Logout').click();
    });

    expect(screen.getByTestId('user-email')).toHaveTextContent('No user');
    expect(localStorage.getItem('token')).toBeNull();
    expect(window.location.href).toBe('/login');
  });
});
