import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App Smoke Test', () => {
  it('renders without crashing', () => {
    // The App component uses react-router-dom and other providers
    // We expect it to render something or at least not throw an error.
    const { container } = render(<App />);
    expect(container).toBeInTheDocument();
  });
});
