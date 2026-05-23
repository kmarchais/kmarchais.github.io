/**
 * Gyroid Flow Initial Condition Presets
 *
 * Generates initial particle positions for the gyroid flow simulation.
 * Particles spawn in an upper box region and flow down through the gyroid.
 */

import { GyroidFlowConfig } from '@/hooks/simulations/useGyroidFlowSimulation';

export interface GyroidFlowParticleData {
  positions: Float32Array;
  velocities: Float32Array;
}

export interface GyroidFlowPreset {
  name: string;
  description: string;
  generator: (count: number, config: GyroidFlowConfig) => GyroidFlowParticleData;
}

/**
 * Default preset: spawn particles on a regular 3D grid inside the upper
 * spawn box so no two particles start overlapping. The grid spacing is
 * chosen to fit `count` particles snugly; if the box is too tight, the
 * spacing is reduced down to the no-overlap minimum (slightly larger than
 * the particle diameter) and the count is honored even if it spills a
 * little out of the box.
 */
function generateSpawnBox(count: number, config: GyroidFlowConfig): GyroidFlowParticleData {
  const positions = new Float32Array(count * 4);
  const velocities = new Float32Array(count * 4);

  const xRange = config.spawnXMax - config.spawnXMin;
  const yRange = config.spawnYMax - config.spawnYMin;
  const zRange = config.spawnZMax - config.spawnZMin;

  const radiusMax = config.radiusMax ?? config.radius;
  const minSpacing = 2.05 * radiusMax;

  // Equal aspect grid: solve gridX*gridY*gridZ = count with grid sizes
  // proportional to the box edges. Then pick a spacing that fits.
  const volume = xRange * yRange * zRange;
  const sideEst = Math.cbrt(volume / count);
  let spacing = Math.max(sideEst, minSpacing);

  let gridX = Math.max(1, Math.floor(xRange / spacing));
  let gridY = Math.max(1, Math.floor(yRange / spacing));
  let gridZ = Math.max(1, Math.floor(zRange / spacing));

  // If the natural grid is too small, shrink the spacing iteratively until
  // it holds all the particles or we hit the no-overlap minimum.
  while (gridX * gridY * gridZ < count && spacing > minSpacing) {
    spacing = Math.max(minSpacing, spacing * 0.92);
    gridX = Math.max(1, Math.floor(xRange / spacing));
    gridY = Math.max(1, Math.floor(yRange / spacing));
    gridZ = Math.max(1, Math.floor(zRange / spacing));
  }

  // Center the grid inside the spawn box.
  const usedX = (gridX - 1) * spacing;
  const usedY = (gridY - 1) * spacing;
  const usedZ = (gridZ - 1) * spacing;
  const startX = config.spawnXMin + (xRange - usedX) * 0.5;
  const startY = config.spawnYMin + Math.max(radiusMax, (yRange - usedY) * 0.5);
  const startZ = config.spawnZMin + (zRange - usedZ) * 0.5;

  // Tiny per-particle jitter so the lattice isn't perfectly rigid (helps the
  // first contact frame settle without resonance).
  const jitter = radiusMax * 0.06;

  for (let i = 0; i < count; i++) {
    const xi = i % gridX;
    const zi = Math.floor(i / gridX) % gridZ;
    const yi = Math.floor(i / (gridX * gridZ));

    const x = startX + xi * spacing + (Math.random() - 0.5) * jitter;
    const y = startY + yi * spacing + (Math.random() - 0.5) * jitter;
    const z = startZ + zi * spacing + (Math.random() - 0.5) * jitter;

    positions[i * 4]     = x;
    positions[i * 4 + 1] = y;
    positions[i * 4 + 2] = z;
    positions[i * 4 + 3] = radiusMax;

    velocities[i * 4]     = 0;
    velocities[i * 4 + 1] = 0;
    velocities[i * 4 + 2] = 0;
    velocities[i * 4 + 3] = 0.5; // Neutral channel value (set in gyroid region)
  }

  return { positions, velocities };
}

/**
 * Layered preset: spawn particles in stacked layers for more organized flow
 */
function generateLayered(count: number, config: GyroidFlowConfig): GyroidFlowParticleData {
  const positions = new Float32Array(count * 4);
  const velocities = new Float32Array(count * 4);

  const spacing = config.radius * 2.5;
  const xRange = config.spawnXMax - config.spawnXMin;
  const zRange = config.spawnZMax - config.spawnZMin;

  const gridX = Math.max(1, Math.floor(xRange / spacing));
  const gridZ = Math.max(1, Math.floor(zRange / spacing));

  for (let i = 0; i < count; i++) {
    const xi = i % gridX;
    const zi = Math.floor(i / gridX) % gridZ;
    const yi = Math.floor(i / (gridX * gridZ));

    const layerOffsetX = (yi % 2) * (spacing / 2);
    const layerOffsetZ = (yi % 2) * (spacing / 2);

    const x = config.spawnXMin + spacing / 2 + xi * spacing + layerOffsetX;
    const y = config.spawnYMin + config.radius + yi * spacing;
    const z = config.spawnZMin + spacing / 2 + zi * spacing + layerOffsetZ;

    positions[i * 4] = x;
    positions[i * 4 + 1] = y;
    positions[i * 4 + 2] = z;
    positions[i * 4 + 3] = config.radius;

    velocities[i * 4] = 0;
    velocities[i * 4 + 1] = 0;
    velocities[i * 4 + 2] = 0;
    velocities[i * 4 + 3] = 0.5; // Neutral channel value (will be set in gyroid region)
  }

  return { positions, velocities };
}

export const GYROID_FLOW_PRESETS: Record<string, GyroidFlowPreset> = {
  default: {
    name: 'Random Spawn',
    description: 'Particles spawn randomly in the upper box',
    generator: generateSpawnBox,
  },
  layered: {
    name: 'Layered',
    description: 'Particles spawn in organized layers',
    generator: generateLayered,
  },
};

export const GYROID_FLOW_PRESET_OPTIONS: Record<string, string> = {
  default: 'Random Spawn',
  layered: 'Layered',
};
