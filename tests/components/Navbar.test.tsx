import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '@/components/Navbar';

describe('Navbar', () => {
  const renderAt = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <Navbar />
      </MemoryRouter>
    );

  it('renders the KM monogram', () => {
    renderAt('/');
    expect(screen.getByText('KM')).toBeInTheDocument();
  });

  it('renders Home and Blog navigation links', () => {
    renderAt('/');
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Blog' })).toBeInTheDocument();
  });

  it('monogram links to the home page', () => {
    renderAt('/blog');
    const homeLink = screen.getByLabelText(/Kevin Marchais/);
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('shows the route label when on the blog page', () => {
    renderAt('/blog');
    // The label is rendered next to the monogram with the same "Blog" text;
    // confirm at least two "Blog" instances exist (label + nav link).
    expect(screen.getAllByText(/Blog/).length).toBeGreaterThan(1);
  });

  it('hides the route label on the home page', () => {
    renderAt('/');
    // The slash separator after KM only renders when a label exists.
    expect(screen.queryByText('/')).not.toBeInTheDocument();
  });
});
