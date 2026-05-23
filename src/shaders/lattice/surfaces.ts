/**
 * Lattice Type Definitions
 *
 * Defines the available strut-based lattice structures for the Lattice Studio.
 */

export interface LatticeType {
  /** Numeric identifier for shader selection */
  id: number;
  /** URL-safe name */
  name: string;
  /** Display name for UI */
  displayName: string;
  /** Scientific description */
  description: string;
  /** Lattice category */
  category: 'cubic' | 'space-filling';
  /** Number of struts per unit cell */
  strutsPerCell: number;
  /** Relative density at default parameters */
  relativeDensity: number;
}

/**
 * All available lattice types
 */
export const LATTICE_TYPES: LatticeType[] = [
  {
    id: 0,
    name: 'cubic',
    displayName: 'Simple Cubic',
    description:
      'The simplest lattice structure with struts along the edges of a cube. Low relative density but weak in diagonal loading.',
    category: 'cubic',
    strutsPerCell: 12,
    relativeDensity: 0.15,
  },
  {
    id: 1,
    name: 'bcc',
    displayName: 'BCC (Body-Centered)',
    description:
      'Body-centered cubic lattice with struts from corners to center. Good omnidirectional strength and energy absorption.',
    category: 'cubic',
    strutsPerCell: 8,
    relativeDensity: 0.20,
  },
  {
    id: 2,
    name: 'fcc',
    displayName: 'FCC (Face-Centered)',
    description:
      'Face-centered cubic lattice. Excellent packing efficiency and isotropic mechanical properties.',
    category: 'cubic',
    strutsPerCell: 12,
    relativeDensity: 0.22,
  },
  {
    id: 3,
    name: 'octet',
    displayName: 'Octet Truss',
    description:
      'Highly efficient structure combining tetrahedra and octahedra. Maximum strength-to-weight ratio, used in aerospace.',
    category: 'space-filling',
    strutsPerCell: 24,
    relativeDensity: 0.28,
  },
  {
    id: 4,
    name: 'diamond',
    displayName: 'Diamond Cubic',
    description:
      'Based on the diamond crystal structure. Each node connects to 4 neighbors in tetrahedral arrangement.',
    category: 'cubic',
    strutsPerCell: 16,
    relativeDensity: 0.18,
  },
  {
    id: 5,
    name: 'kelvin',
    displayName: 'Kelvin Cell',
    description:
      'Tetrakaidecahedron structure that tiles space with minimal surface area. Excellent for foam-like applications.',
    category: 'space-filling',
    strutsPerCell: 36,
    relativeDensity: 0.25,
  },
];

/** Total number of lattice types */
export const LATTICE_TYPE_COUNT = LATTICE_TYPES.length;

/** Lattice names for UI dropdowns */
export const LATTICE_NAMES = LATTICE_TYPES.map((l) => l.displayName);

/** Map from display name to ID */
export const LATTICE_INDEX: Record<string, number> = Object.fromEntries(
  LATTICE_TYPES.map((l) => [l.displayName, l.id])
);

/**
 * Get lattice type by numeric ID
 */
export function getLatticeById(id: number): LatticeType | undefined {
  return LATTICE_TYPES.find((l) => l.id === id);
}

/**
 * Get lattice type by name
 */
export function getLatticeByName(name: string): LatticeType | undefined {
  return LATTICE_TYPES.find((l) => l.name === name || l.displayName === name);
}

/**
 * Get lattice types by category
 */
export function getLatticesByCategory(
  category: LatticeType['category']
): LatticeType[] {
  return LATTICE_TYPES.filter((l) => l.category === category);
}
