import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PageLoader from '@/components/PageLoader';

describe('PageLoader', () => {
  it('renders the loading text', () => {
    render(<PageLoader />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders the spinner element', () => {
    const { container } = render(<PageLoader />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});
