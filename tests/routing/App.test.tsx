import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('App routing structure', () => {
  const appSource = readFileSync(
    resolve(__dirname, '../../src/App.tsx'),
    'utf-8'
  );

  it('wraps with MotionConfig for reduced motion support', () => {
    expect(appSource).toContain('MotionConfig');
    expect(appSource).toContain('reducedMotion="user"');
  });

  it('uses AnimatePresence for page transitions', () => {
    expect(appSource).toContain('AnimatePresence');
    expect(appSource).toContain('mode="wait"');
  });

  it('has PageTransition component for route animations', () => {
    expect(appSource).toContain('PageTransition');
    expect(appSource).toContain('initial={{ opacity: 0 }}');
    expect(appSource).toContain('animate={{ opacity: 1 }}');
    expect(appSource).toContain('exit={{ opacity: 0 }}');
  });

  it('uses ErrorBoundary and Suspense', () => {
    expect(appSource).toContain('ErrorBoundary');
    expect(appSource).toContain('Suspense');
    expect(appSource).toContain('PageLoader');
  });

  it('routes the home and blog as the primary surfaces', () => {
    expect(appSource).toContain('path="/"');
    expect(appSource).toContain('path="/blog"');
    expect(appSource).toContain('path="/blog/:slug"');
  });

  it('redirects legacy showcase paths to the blog', () => {
    // The /showcase/* routes were removed; they should now redirect.
    expect(appSource).toContain('Navigate to="/blog/microgen"');
    expect(appSource).toContain('Navigate to="/blog"');
  });

  it('HomeNew is not wrapped in PageTransition', () => {
    expect(appSource).toContain('element={<HomeNew />}');
  });

  it('uses lazy loading for the blog pages', () => {
    expect(appSource).toContain('lazy(');
    expect(appSource).toContain('import("./pages/Blog")');
    expect(appSource).toContain('import("./pages/BlogPostPage")');
  });

  it('has a catch-all route returning to home', () => {
    expect(appSource).toContain('path="*"');
  });
});
