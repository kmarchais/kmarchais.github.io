import { describe, it, expect, vi } from 'vitest';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) => {
      return ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
        const htmlProps: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(props)) {
          if (!['initial', 'animate', 'exit', 'transition', 'variants', 'whileInView', 'whileHover', 'whileTap', 'viewport', 'layout', 'layoutId', 'style'].includes(key)) {
            htmlProps[key] = value;
          }
        }
        return <div data-testid={`motion-${String(prop)}`} {...htmlProps}>{children}</div>;
      };
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useMotionValue: () => ({ get: () => 0, set: () => {} }),
  useTransform: () => ({ get: () => 0 }),
  useSpring: () => ({ get: () => 0 }),
  useScroll: () => ({ scrollYProgress: { get: () => 0 } }),
  useAnimation: () => ({ start: () => Promise.resolve() }),
  useInView: () => true,
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...props}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}));

// Mock assets - must include all exports used transitively (matching src/assets/index.ts)
vi.mock('@/assets', () => ({
  default: {},
  logo: 'mock-logo.svg',
  backend: 'mock-backend.png',
  creator: 'mock-creator.png',
  mobile: 'mock-mobile.png',
  web: 'mock-web.png',
  github: 'mock-github.png',
  pdf: 'mock-pdf.png',
  menu: 'mock-menu.svg',
  close: 'mock-close.svg',
  python: 'mock-python.png',
  cpp: 'mock-cpp.png',
  reactjs: 'mock-reactjs.png',
  threejs: 'mock-threejs.png',
  github_logo: 'mock-github-logo.png',
  cuda: 'mock-cuda.png',
  linux: 'mock-linux.png',
  matlab: 'mock-matlab.png',
  blender: 'mock-blender.png',
  unreal: 'mock-unreal.png',
  phd: 'mock-phd.png',
  microgen: 'mock-microgen.gif',
  mmgpy: 'mock-mmgpy.png',
  website: 'mock-website.png',
  survitec: 'mock-survitec.png',
  ariane: 'mock-ariane.png',
  safran: 'mock-safran.png',
  i2m: 'mock-i2m.png',
  hivelix: 'mock-hivelix.png',
  profile: 'mock-profile.jpg',
}));

// Mock react-three packages
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
