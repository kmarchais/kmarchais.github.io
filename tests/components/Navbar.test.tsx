import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '@/components/Navbar';

// Mock assets
vi.mock('@/assets', () => ({
  logo: 'mock-logo.png',
  menu: 'mock-menu.png',
  close: 'mock-close.png',
}));

// Mock constants
vi.mock('@/constants', () => ({
  navLinks: [
    { id: 'about', title: 'About' },
    { id: 'projects', title: 'Projects' },
    { id: 'blog', title: 'Blog', path: '/blog' },
  ],
}));

// Mock styles
vi.mock('@/styles', () => ({
  styles: {
    paddingX: 'px-6',
  },
}));

describe('Navbar', () => {
  const renderNavbar = () =>
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

  it('renders the site name', () => {
    renderNavbar();
    expect(screen.getByText(/Kevin Marchais/)).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    renderNavbar();
    // Links appear in both desktop and mobile navs, use getAllByText
    expect(screen.getAllByText('About').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Projects').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Blog').length).toBeGreaterThan(0);
  });

  it('has a mobile menu toggle button', () => {
    renderNavbar();
    const toggleButton = screen.getByLabelText('Open menu');
    expect(toggleButton).toBeInTheDocument();
  });

  it('toggles mobile menu on button click', () => {
    renderNavbar();
    const toggleButton = screen.getByLabelText('Open menu');

    fireEvent.click(toggleButton);

    expect(screen.getByLabelText('Close menu')).toBeInTheDocument();
    expect(screen.getByRole('menu')).toBeVisible();
  });

  it('has correct ARIA attributes on the toggle button', () => {
    renderNavbar();
    const toggleButton = screen.getByLabelText('Open menu');

    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    expect(toggleButton).toHaveAttribute('aria-controls', 'mobile-menu');

    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('has a link to the home page', () => {
    renderNavbar();
    const homeLink = screen.getByText(/Kevin Marchais/).closest('a');
    expect(homeLink).toHaveAttribute('href', '/');
  });
});
