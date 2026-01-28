import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ErrorBoundary from '@/components/ErrorBoundary';

// Component that always throws
const ThrowingComponent = () => {
  throw new Error('Test error message');
};

// Component that renders normally
const GoodComponent = () => <div>Child content</div>;

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error for expected errors
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error occurs', () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <GoodComponent />
        </ErrorBoundary>
      </MemoryRouter>
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('shows fallback UI when an error is thrown', () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      </MemoryRouter>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('displays the error message in details', () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      </MemoryRouter>
    );

    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('shows Reload Page button', () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      </MemoryRouter>
    );

    expect(screen.getByText('Reload Page')).toBeInTheDocument();
  });

  it('shows Go Home link', () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      </MemoryRouter>
    );

    const homeLink = screen.getByText('Go Home');
    expect(homeLink).toBeInTheDocument();
    expect(homeLink.closest('a')).toHaveAttribute('href', '/');
  });

  it('renders custom fallback when provided', () => {
    render(
      <MemoryRouter>
        <ErrorBoundary fallback={<div>Custom fallback</div>}>
          <ThrowingComponent />
        </ErrorBoundary>
      </MemoryRouter>
    );

    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });
});
