import { render, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from './ToastContext';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const TestComponent = () => {
  const { showToast } = useToast();
  return (
    <button onClick={() => showToast('Hello Toast', 'success')}>
      Show Toast
    </button>
  );
};

describe('ToastContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('shows a toast when showToast is called', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await act(async () => {
      screen.getByText('Show Toast').click();
    });

    expect(screen.getByText('Hello Toast')).toBeInTheDocument();
  });

  it('automatically removes the toast after duration', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await act(async () => {
      screen.getByText('Show Toast').click();
    });

    expect(screen.getByText('Hello Toast')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(3100); // Default success duration is 3000ms
    });

    expect(screen.queryByText('Hello Toast')).not.toBeInTheDocument();
  });

  it('handles feature-limit-reached custom event', async () => {
    render(
      <ToastProvider>
        <div>Content</div>
      </ToastProvider>
    );

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('feature-limit-reached', {
          detail: { message: 'Upgrade now!' },
        })
      );
    });

    expect(screen.getByText('Upgrade now!')).toBeInTheDocument();
  });
});
