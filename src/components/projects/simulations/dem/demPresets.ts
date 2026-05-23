/**
 * DEM (Discrete Element Method) Initial Condition Presets
 *
 * Various initial configurations for granular simulations.
 * Particles have per-particle radii stored in positions.w.
 * Supports mono, uniform, and normal radius distributions.
 */

import { DEMConfig } from '@/hooks/simulations/useDEMSimulation';

export interface DEMParticleData {
  positions: Float32Array;
  velocities: Float32Array;
}

export interface DEMPreset {
  name: string;
  description: string;
  generator: (count: number, config: DEMConfig) => DEMParticleData;
}

/**
 * Box-Muller transform for normal distribution
 */
function boxMuller(): [number, number] {
  const u1 = Math.random();
  const u2 = Math.random();
  const r = Math.sqrt(-2 * Math.log(u1));
  const theta = 2 * Math.PI * u2;
  return [r * Math.cos(theta), r * Math.sin(theta)];
}

/**
 * Generate a radius based on the distribution configuration
 */
function generateRadius(config: DEMConfig): number {
  switch (config.radiusDistribution) {
    case 'mono':
      return config.radius;
    case 'uniform':
      return config.radiusMin + Math.random() * (config.radiusMax - config.radiusMin);
    case 'normal': {
      const [z] = boxMuller();
      const r = config.radiusMean + z * config.radiusStdDev;
      return Math.max(config.radiusMin, Math.min(config.radiusMax, r));
    }
    default:
      return config.radius;
  }
}

/**
 * Get the average/representative radius for spacing calculations
 */
function getRepresentativeRadius(config: DEMConfig): number {
  switch (config.radiusDistribution) {
    case 'mono':
      return config.radius;
    case 'uniform':
      return (config.radiusMin + config.radiusMax) / 2;
    case 'normal':
      return config.radiusMean;
    default:
      return config.radius;
  }
}

/**
 * Box Packing: particles in layers above the floor with offset for mixing
 */
function generateBoxPacking(count: number, config: DEMConfig): DEMParticleData {
  const positions = new Float32Array(count * 4);
  const velocities = new Float32Array(count * 4);

  const radius = getRepresentativeRadius(config);
  const spacing = radius * 2.5; // Gap to prevent initial overlap

  // Calculate how many particles fit in the box - leave margin for offset
  const margin = radius * 2 + spacing / 2;
  const halfWidth = config.boxSize[0] / 2 - margin;
  const halfDepth = config.boxSize[2] / 2 - margin;

  const gridX = Math.max(1, Math.floor((halfWidth * 2) / spacing));
  const gridZ = Math.max(1, Math.floor((halfDepth * 2) / spacing));

  for (let i = 0; i < count; i++) {
    const xi = i % gridX;
    const zi = Math.floor(i / gridX) % gridZ;
    const yi = Math.floor(i / (gridX * gridZ));

    // Offset alternate layers by half spacing for mixing
    const layerOffsetX = (yi % 2) * (spacing / 2);
    const layerOffsetZ = (yi % 2) * (spacing / 2);

    // Center the grid with layer offset
    const x = -halfWidth + xi * spacing + layerOffsetX;
    const z = -halfDepth + zi * spacing + layerOffsetZ;
    const y = radius + 0.3 + yi * spacing; // Start slightly above ground

    positions[i * 4] = x;
    positions[i * 4 + 1] = y;
    positions[i * 4 + 2] = z;
    positions[i * 4 + 3] = generateRadius(config);

    velocities[i * 4] = 0;
    velocities[i * 4 + 1] = 0;
    velocities[i * 4 + 2] = 0;
    velocities[i * 4 + 3] = 0;
  }

  return { positions, velocities };
}

/**
 * Generate particles inside a rotating drum
 * Drum axis is along X, centered at (0, drumCenterY, 0)
 */
function generateDrum(count: number, config: DEMConfig): DEMParticleData {
  const positions = new Float32Array(count * 4);
  const velocities = new Float32Array(count * 4);

  const maxRadius = config.radiusDistribution === 'mono'
    ? config.radius
    : config.radiusMax;

  // Get drum dimensions from config (or use defaults)
  const drumRadius = config.drumRadius ?? 4.0;
  const drumLength = config.drumLength ?? 6.0;
  const drumCenterY = config.drumCenterY ?? 4.5;

  // Fill radius with large safety margin from wall (at least 3x max particle radius)
  const wallMargin = maxRadius * 4;
  const fillRadius = drumRadius - wallMargin;
  const lengthMargin = maxRadius * 4;

  for (let i = 0; i < count; i++) {
    // Generate particle radius first so we can use it for positioning
    const particleRadius = generateRadius(config);

    // Random position along drum length (X axis) with margin from end caps
    const x = (Math.random() - 0.5) * (drumLength - lengthMargin * 2);

    // Random position in YZ cross-section (within circle)
    // Use rejection sampling for uniform distribution in circle
    // Use smaller fill radius to keep particles in lower half
    let localY: number, z: number;
    const effectiveFillRadius = fillRadius - particleRadius;
    do {
      localY = (Math.random() - 0.5) * 2 * effectiveFillRadius;
      z = (Math.random() - 0.5) * 2 * effectiveFillRadius;
    } while (localY * localY + z * z > effectiveFillRadius * effectiveFillRadius);

    // Shift y to be in lower portion of drum and offset by drum center
    // Scale down and shift to bottom half
    const y = localY * 0.4 - effectiveFillRadius * 0.4 + drumCenterY;

    positions[i * 4] = x;
    positions[i * 4 + 1] = y;
    positions[i * 4 + 2] = z;
    positions[i * 4 + 3] = particleRadius;

    velocities[i * 4] = 0;
    velocities[i * 4 + 1] = 0;
    velocities[i * 4 + 2] = 0;
    velocities[i * 4 + 3] = 0;
  }

  return { positions, velocities };
}

export const DEM_PRESETS: Record<string, DEMPreset> = {
  boxPacking: {
    name: 'Box Packing',
    description: 'Particles falling into a box container',
    generator: generateBoxPacking,
  },
  drum: {
    name: 'Rotating Drum',
    description: 'Particles in a rotating cylindrical drum',
    generator: generateDrum,
  },
};

export const DEM_PRESET_OPTIONS: Record<string, string> = {
  boxPacking: 'Box Packing',
  drum: 'Rotating Drum',
};
