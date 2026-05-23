import { describe, it, expect, vi } from 'vitest';

// Framer-motion plays freely; we stub its variant components to plain wrappers.
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) => {
      return ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
        const htmlProps: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(props)) {
          if (![
            'initial', 'animate', 'exit', 'transition', 'variants',
            'whileInView', 'whileHover', 'whileTap', 'viewport',
            'layout', 'layoutId', 'custom',
          ].includes(key)) {
            htmlProps[key] = value;
          }
        }
        return <div data-testid={`motion-${String(prop)}`} {...htmlProps}>{children}</div>;
      };
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...props}>{children}</a>
  ),
}));

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="canvas">{children}</div>,
  useFrame: vi.fn(),
  useThree: () => ({ size: { width: 800, height: 600 }, camera: {} }),
}));

vi.mock('@react-three/drei', () => ({
  Float: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  OrbitControls: () => null,
  PerspectiveCamera: () => null,
}));

describe('HomeNew', () => {
  it('module exports a default component', async () => {
    const module = await import('@/components/HomeNew');
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe('function');
  });
});
