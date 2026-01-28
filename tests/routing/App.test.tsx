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

  it('has all showcase routes', () => {
    expect(appSource).toContain('/showcase/geometry');
    expect(appSource).toContain('/showcase/simulations');
    expect(appSource).toContain('/showcase/simulations/nbody');
    expect(appSource).toContain('/showcase/simulations/granular');
    expect(appSource).toContain('/showcase/simulations/fluid');
    expect(appSource).toContain('/showcase/chess');
  });

  it('has legacy redirect routes', () => {
    expect(appSource).toContain('Navigate to="/showcase/geometry" replace');
    expect(appSource).toContain('Navigate to="/showcase/simulations" replace');
    expect(appSource).toContain('Navigate to="/showcase/chess" replace');
  });

  it('HomeNew is not wrapped in PageTransition', () => {
    // HomeNew has its own AnimatePresence, so it should be rendered directly
    expect(appSource).toContain('element={<HomeNew />}');
  });

  it('uses lazy loading for heavy components', () => {
    expect(appSource).toContain('lazy(');
    expect(appSource).toContain('import("./components/projects/geometry/ComputationalGeometry")');
    expect(appSource).toContain('import("./components/projects/chess/Chess")');
  });
});
