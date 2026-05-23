import { describe, it, expect, vi } from 'vitest';

// Mock framer-motion before any imports
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, ...props }: { children: React.ReactNode }) => (
      <span {...props}>{children}</span>
    ),
    section: ({ children, ...props }: { children: React.ReactNode }) => (
      <section {...props}>{children}</section>
    ),
  },
}));

describe('TPMS Surface Definitions', () => {
  it('exports correct number of surfaces', async () => {
    const { TPMS_SURFACES } = await import('@/shaders/tpms/surfaces');
    expect(TPMS_SURFACES.length).toBe(14);
  });

  it('each surface has required properties', async () => {
    const { TPMS_SURFACES } = await import('@/shaders/tpms/surfaces');

    TPMS_SURFACES.forEach((surface) => {
      expect(surface).toHaveProperty('id');
      expect(surface).toHaveProperty('name');
      expect(surface).toHaveProperty('displayName');
      expect(surface).toHaveProperty('glsl');
      expect(surface).toHaveProperty('description');
      expect(surface).toHaveProperty('category');
    });
  });

  it('surfaces have unique IDs', async () => {
    const { TPMS_SURFACES } = await import('@/shaders/tpms/surfaces');

    const ids = TPMS_SURFACES.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('surfaces have unique names', async () => {
    const { TPMS_SURFACES } = await import('@/shaders/tpms/surfaces');

    const names = TPMS_SURFACES.map((s) => s.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('includes all expected minimal surfaces', async () => {
    const { TPMS_SURFACES } = await import('@/shaders/tpms/surfaces');

    const minimalSurfaces = TPMS_SURFACES.filter(
      (s) => s.category === 'minimal'
    );
    const minimalNames = minimalSurfaces.map((s) => s.displayName);

    expect(minimalNames).toContain('Gyroid');
    expect(minimalNames).toContain('Schwarz P');
    expect(minimalNames).toContain('Schwarz D');
    expect(minimalNames).toContain('Neovius');
    expect(minimalNames).toContain('Schoen IWP');
    expect(minimalNames).toContain('Schoen FRD');
    expect(minimalNames).toContain('Fischer-Koch S');
    expect(minimalNames).toContain('Lidinoid');
  });

  it('includes all expected honeycomb surfaces', async () => {
    const { TPMS_SURFACES } = await import('@/shaders/tpms/surfaces');

    const honeycombSurfaces = TPMS_SURFACES.filter(
      (s) => s.category === 'honeycomb'
    );
    const honeycombNames = honeycombSurfaces.map((s) => s.displayName);

    expect(honeycombNames).toContain('Honeycomb Gyroid');
    expect(honeycombNames).toContain('Honeycomb Schwarz P');
    expect(honeycombNames).toContain('Honeycomb Schwarz D');
    expect(honeycombNames).toContain('Honeycomb IWP');
  });

  it('helper functions work correctly', async () => {
    const { getSurfaceById, getSurfaceByName, getSurfacesByCategory } =
      await import('@/shaders/tpms/surfaces');

    // getSurfaceById
    const gyroid = getSurfaceById(0);
    expect(gyroid?.name).toBe('gyroid');

    // getSurfaceByName
    const schwarzP = getSurfaceByName('schwarzP');
    expect(schwarzP?.displayName).toBe('Schwarz P');

    // getSurfacesByCategory
    const honeycomb = getSurfacesByCategory('honeycomb');
    expect(honeycomb.length).toBe(4);
  });
});

describe('TPMS Shader', () => {
  it('exports vertex and fragment shaders', async () => {
    const { vertexShader, fragmentShader } = await import(
      '@/components/projects/tpms/TPMSShader'
    );

    expect(vertexShader).toBeDefined();
    expect(typeof vertexShader).toBe('string');
    expect(vertexShader).toContain('gl_Position');

    expect(fragmentShader).toBeDefined();
    expect(typeof fragmentShader).toBe('string');
    expect(fragmentShader).toContain('gl_FragColor');
  });

  it('fragment shader contains all surface functions', async () => {
    const { fragmentShader } = await import(
      '@/components/projects/tpms/TPMSShader'
    );

    // Check that key surface functions are defined
    expect(fragmentShader).toContain('float gyroid(vec3 p)');
    expect(fragmentShader).toContain('float schwarzP(vec3 p)');
    expect(fragmentShader).toContain('float schwarzD(vec3 p)');
    expect(fragmentShader).toContain('float neovius(vec3 p)');
    expect(fragmentShader).toContain('float schoenIWP(vec3 p)');
    expect(fragmentShader).toContain('float schoenFRD(vec3 p)');
    expect(fragmentShader).toContain('float lidinoid(vec3 p)');
    expect(fragmentShader).toContain('float honeycombGyroid(vec3 p)');
  });

  it('shader supports morphing', async () => {
    const { fragmentShader } = await import(
      '@/components/projects/tpms/TPMSShader'
    );

    expect(fragmentShader).toContain('uMorphFactor');
    expect(fragmentShader).toContain('uMorphTarget');
    expect(fragmentShader).toContain('mix(');
  });

  it('shader supports phase shifts', async () => {
    const { fragmentShader } = await import(
      '@/components/projects/tpms/TPMSShader'
    );

    expect(fragmentShader).toContain('uPhaseX');
    expect(fragmentShader).toContain('uPhaseY');
    expect(fragmentShader).toContain('uPhaseZ');
  });

  it('shader has surface selector function', async () => {
    const { fragmentShader } = await import(
      '@/components/projects/tpms/TPMSShader'
    );

    expect(fragmentShader).toContain('evaluateSurface');
    // GLSL uses float comparisons for surface selection (0-13 surfaces)
    expect(fragmentShader).toContain('if (t < 0.5)'); // Gyroid (surface 0)
    expect(fragmentShader).toContain('if (t < 12.5)'); // Last explicit check before default (Honeycomb IWP)
  });

  it('exports surface name mappings', async () => {
    const { SURFACE_INDEX, SURFACE_NAMES } = await import(
      '@/components/projects/tpms/TPMSShader'
    );

    expect(SURFACE_INDEX).toBeDefined();
    expect(SURFACE_NAMES).toBeDefined();
    expect(SURFACE_NAMES.length).toBe(14);
    expect(SURFACE_INDEX['Gyroid']).toBe(0);
    expect(SURFACE_INDEX['Honeycomb IWP']).toBe(13);
  });

  it('exports colormap mappings', async () => {
    const { COLORMAP_INDEX, COLORMAP_NAMES } = await import(
      '@/components/projects/tpms/TPMSShader'
    );

    expect(COLORMAP_INDEX).toBeDefined();
    expect(COLORMAP_NAMES).toBeDefined();
    expect(COLORMAP_NAMES.length).toBe(7);
    expect(COLORMAP_INDEX['Viridis']).toBe(1);
  });

  it('has volume and surface rendering modes', async () => {
    const { fragmentShader } = await import(
      '@/components/projects/tpms/TPMSShader'
    );

    expect(fragmentShader).toContain('uRenderMode');
    expect(fragmentShader).toContain('VOL_STEPS');
    expect(fragmentShader).toContain('SURF_STEPS');
  });
});
