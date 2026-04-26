import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';
import { featureFlagService } from '../services/featureFlagService';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/featureFlagService', () => ({
  featureFlagService: {
    isDarkModeEnabled: vi.fn(),
  },
}));

const TestComponent = () => {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <div data-testid="theme-value">{theme}</div>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('light')}>Set Light</button>
    </div>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    (featureFlagService.isDarkModeEnabled as any).mockResolvedValue(true);
    document.documentElement.classList.remove('light', 'dark');
  });

  it('initializes with default theme and applies it to document', async () => {
    await act(async () => {
      render(
        <ThemeProvider defaultTheme="light">
          <TestComponent />
        </ThemeProvider>
      );
    });

    expect(screen.getByTestId('theme-value')).toHaveTextContent('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('switches theme and updates localStorage/DOM', async () => {
    await act(async () => {
      render(
        <ThemeProvider defaultTheme="light">
          <TestComponent />
        </ThemeProvider>
      );
    });

    await act(async () => {
      screen.getByText('Set Dark').click();
    });

    expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('vite-ui-theme')).toBe('dark');
  });

  it('forces light theme if dark mode is disabled via feature flag', async () => {
    (featureFlagService.isDarkModeEnabled as any).mockResolvedValue(false);

    await act(async () => {
      render(
        <ThemeProvider defaultTheme="dark">
          <TestComponent />
        </ThemeProvider>
      );
    });

    expect(screen.getByTestId('theme-value')).toHaveTextContent('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });
});
