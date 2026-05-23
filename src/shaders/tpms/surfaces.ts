/**
 * TPMS (Triply Periodic Minimal Surfaces) Surface Definitions
 *
 * Based on microgen surface functions - these are the mathematical
 * definitions used to generate TPMS geometries on the GPU.
 */

export type TPMSCategory = 'minimal' | 'honeycomb' | 'other';

export interface TPMSSurface {
  /** Unique identifier */
  id: number;
  /** URL-safe name */
  name: string;
  /** Display name */
  displayName: string;
  /** GLSL/WGSL function body (expects vec3 p as input) */
  glsl: string;
  /** Mathematical description */
  description: string;
  /** Category for UI grouping */
  category: TPMSCategory;
  /** LaTeX formula for display */
  latex?: string;
}

/**
 * All supported TPMS surface types
 * Based on microgen's surface_functions module
 */
export const TPMS_SURFACES: TPMSSurface[] = [
  // === Minimal Surfaces ===
  {
    id: 0,
    name: 'gyroid',
    displayName: 'Gyroid',
    glsl: 'sin(p.x) * cos(p.y) + sin(p.y) * cos(p.z) + sin(p.z) * cos(p.x)',
    description: 'Discovered by Alan Schoen in 1970. Most common TPMS used in additive manufacturing.',
    category: 'minimal',
    latex: '\\sin(x)\\cos(y) + \\sin(y)\\cos(z) + \\sin(z)\\cos(x)',
  },
  {
    id: 1,
    name: 'schwarzP',
    displayName: 'Schwarz P',
    glsl: 'cos(p.x) + cos(p.y) + cos(p.z)',
    description: 'Primitive surface discovered by Karl Schwarz in 1865.',
    category: 'minimal',
    latex: '\\cos(x) + \\cos(y) + \\cos(z)',
  },
  {
    id: 2,
    name: 'schwarzD',
    displayName: 'Schwarz D',
    glsl: `sin(p.x) * sin(p.y) * sin(p.z)
         + sin(p.x) * cos(p.y) * cos(p.z)
         + cos(p.x) * sin(p.y) * cos(p.z)
         + cos(p.x) * cos(p.y) * sin(p.z)`,
    description: 'Diamond surface by Karl Schwarz.',
    category: 'minimal',
    latex: '\\sin x \\sin y \\sin z + \\sin x \\cos y \\cos z + \\cos x \\sin y \\cos z + \\cos x \\cos y \\sin z',
  },
  {
    id: 3,
    name: 'neovius',
    displayName: 'Neovius',
    glsl: '3.0 * (cos(p.x) + cos(p.y) + cos(p.z)) + 4.0 * cos(p.x) * cos(p.y) * cos(p.z)',
    description: 'Discovered by Edvard Neovius in 1883.',
    category: 'minimal',
    latex: '3(\\cos x + \\cos y + \\cos z) + 4\\cos x \\cos y \\cos z',
  },
  {
    id: 4,
    name: 'schoenIWP',
    displayName: 'Schoen IWP',
    glsl: `2.0 * (cos(p.x) * cos(p.y) + cos(p.y) * cos(p.z) + cos(p.z) * cos(p.x))
         - (cos(2.0 * p.x) + cos(2.0 * p.y) + cos(2.0 * p.z))`,
    description: 'I-WP (Wrapped Package) surface by Alan Schoen.',
    category: 'minimal',
    latex: '2(\\cos x \\cos y + \\cos y \\cos z + \\cos z \\cos x) - (\\cos 2x + \\cos 2y + \\cos 2z)',
  },
  {
    id: 5,
    name: 'schoenFRD',
    displayName: 'Schoen FRD',
    glsl: `4.0 * cos(p.x) * cos(p.y) * cos(p.z)
         - (cos(2.0 * p.x) * cos(2.0 * p.y)
          + cos(2.0 * p.y) * cos(2.0 * p.z)
          + cos(2.0 * p.z) * cos(2.0 * p.x))`,
    description: 'F-RD surface by Alan Schoen.',
    category: 'minimal',
    latex: '4\\cos x \\cos y \\cos z - (\\cos 2x \\cos 2y + \\cos 2y \\cos 2z + \\cos 2z \\cos 2x)',
  },
  {
    id: 6,
    name: 'fischerKochS',
    displayName: 'Fischer-Koch S',
    glsl: `cos(2.0 * p.x) * sin(p.y) * cos(p.z)
         + cos(p.x) * cos(2.0 * p.y) * sin(p.z)
         + sin(p.x) * cos(p.y) * cos(2.0 * p.z)`,
    description: 'S surface discovered by Fischer and Koch.',
    category: 'minimal',
    latex: '\\cos 2x \\sin y \\cos z + \\cos x \\cos 2y \\sin z + \\sin x \\cos y \\cos 2z',
  },
  {
    id: 7,
    name: 'lidinoid',
    displayName: 'Lidinoid',
    glsl: `0.5 * (sin(2.0 * p.x) * cos(p.y) * sin(p.z)
              + sin(2.0 * p.y) * cos(p.z) * sin(p.x)
              + sin(2.0 * p.z) * cos(p.x) * sin(p.y))
         - 0.5 * (cos(2.0 * p.x) * cos(2.0 * p.y)
                + cos(2.0 * p.y) * cos(2.0 * p.z)
                + cos(2.0 * p.z) * cos(2.0 * p.x))
         + 0.15`,
    description: 'Discovered by Sven Lidin in 1990.',
    category: 'minimal',
  },
  {
    id: 8,
    name: 'splitP',
    displayName: 'Split-P',
    glsl: `1.1 * (sin(2.0 * p.x) * cos(p.y) * sin(p.z)
              + sin(2.0 * p.y) * cos(p.z) * sin(p.x)
              + sin(2.0 * p.z) * cos(p.x) * sin(p.y))
         - 0.2 * (cos(2.0 * p.x) * cos(2.0 * p.y)
                + cos(2.0 * p.y) * cos(2.0 * p.z)
                + cos(2.0 * p.z) * cos(2.0 * p.x))
         - 0.4 * (cos(2.0 * p.x) + cos(2.0 * p.y) + cos(2.0 * p.z))`,
    description: 'Split-P variation of the P surface.',
    category: 'minimal',
  },
  {
    id: 9,
    name: 'pmy',
    displayName: 'PMY',
    glsl: `2.0 * cos(p.x) * cos(p.y) * cos(p.z)
         + sin(2.0 * p.x) * sin(p.y)
         + sin(p.x) * sin(2.0 * p.z)
         + sin(2.0 * p.y) * sin(p.z)`,
    description: 'PMY surface structure.',
    category: 'minimal',
  },

  // === Honeycomb Variants ===
  {
    id: 10,
    name: 'honeycombGyroid',
    displayName: 'Honeycomb Gyroid',
    glsl: 'abs(sin(p.x) * cos(p.y) + sin(p.y) * cos(p.z) + sin(p.z) * cos(p.x))',
    description: 'Honeycomb variant of Gyroid using absolute value.',
    category: 'honeycomb',
  },
  {
    id: 11,
    name: 'honeycombSchwarzP',
    displayName: 'Honeycomb Schwarz P',
    glsl: 'abs(cos(p.x) + cos(p.y) + cos(p.z))',
    description: 'Honeycomb variant of Schwarz P.',
    category: 'honeycomb',
  },
  {
    id: 12,
    name: 'honeycombSchwarzD',
    displayName: 'Honeycomb Schwarz D',
    glsl: `abs(sin(p.x) * sin(p.y) * sin(p.z)
             + sin(p.x) * cos(p.y) * cos(p.z)
             + cos(p.x) * sin(p.y) * cos(p.z)
             + cos(p.x) * cos(p.y) * sin(p.z))`,
    description: 'Honeycomb variant of Schwarz D.',
    category: 'honeycomb',
  },
  {
    id: 13,
    name: 'honeycombIWP',
    displayName: 'Honeycomb IWP',
    glsl: `abs(2.0 * (cos(p.x) * cos(p.y) + cos(p.y) * cos(p.z) + cos(p.z) * cos(p.x))
             - (cos(2.0 * p.x) + cos(2.0 * p.y) + cos(2.0 * p.z)))`,
    description: 'Honeycomb variant of IWP surface.',
    category: 'honeycomb',
  },
];

/**
 * Get surface by ID
 */
export function getSurfaceById(id: number): TPMSSurface | undefined {
  return TPMS_SURFACES.find((s) => s.id === id);
}

/**
 * Get surface by name
 */
export function getSurfaceByName(name: string): TPMSSurface | undefined {
  return TPMS_SURFACES.find((s) => s.name === name);
}

/**
 * Get surfaces by category
 */
export function getSurfacesByCategory(category: TPMSCategory): TPMSSurface[] {
  return TPMS_SURFACES.filter((s) => s.category === category);
}

/**
 * Total number of surfaces
 */
export const TPMS_SURFACE_COUNT = TPMS_SURFACES.length;
