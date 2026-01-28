import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Breadcrumb from '@/components/ui/Breadcrumb';

describe('Breadcrumb', () => {
  const renderBreadcrumb = (items: { label: string; path?: string }[]) =>
    render(
      <MemoryRouter>
        <Breadcrumb items={items} />
      </MemoryRouter>
    );

  it('renders all items', () => {
    renderBreadcrumb([
      { label: 'Home', path: '/' },
      { label: 'Simulations', path: '/showcase/simulations' },
      { label: 'N-Body' },
    ]);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Simulations')).toBeInTheDocument();
    expect(screen.getByText('N-Body')).toBeInTheDocument();
  });

  it('renders links for items with paths', () => {
    renderBreadcrumb([
      { label: 'Home', path: '/' },
      { label: 'N-Body' },
    ]);

    const homeLink = screen.getByText('Home');
    expect(homeLink.tagName).toBe('A');
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('renders current page as text without link', () => {
    renderBreadcrumb([
      { label: 'Home', path: '/' },
      { label: 'N-Body' },
    ]);

    const current = screen.getByText('N-Body');
    expect(current.tagName).toBe('SPAN');
    expect(current).toHaveAttribute('aria-current', 'page');
  });

  it('renders chevron separators between items', () => {
    const { container } = renderBreadcrumb([
      { label: 'Home', path: '/' },
      { label: 'Simulations', path: '/showcase/simulations' },
      { label: 'N-Body' },
    ]);

    const svgs = container.querySelectorAll('svg');
    // 2 separators for 3 items
    expect(svgs.length).toBe(2);
  });

  it('has nav element with aria-label', () => {
    renderBreadcrumb([{ label: 'Home', path: '/' }, { label: 'Test' }]);

    const nav = screen.getByLabelText('Breadcrumb');
    expect(nav.tagName).toBe('NAV');
  });

  it('handles single item', () => {
    renderBreadcrumb([{ label: 'Home' }]);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Home')).toHaveAttribute('aria-current', 'page');
  });
});
