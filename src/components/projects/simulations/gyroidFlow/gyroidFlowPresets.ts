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
 * Default preset: spawn particles uniformly in the upper spawn box
 */
function generateSpawnBox(count: number, config: GyroidFlowConfig): GyroidFlowParticleData {
  const positions = new Float32Array(count * 4);
  const velocities = new Float32Array(count * 4);

  const xRange = config.spawnXMax - config.spawnXMin;
  const yRange = config.spawnYMax - config.spawnYMin;
  const zRange = config.spawnZMax - config.spawnZMin;

  const radiusMin = config.radiusMin ?? config.radius;
  const radiusMax = config.radiusMax ?? config.radius;
  const radiusRange = radiusMax - radiusMin;

  for (let i = 0; i < count; i++) {
    // Random position in spawn box
    const x = config.spawnXMin + Math.random() * xRange;
    const y = config.spawnYMin + Math.random() * yRange;
    const z = config.spawnZMin + Math.random() * zRange;

    // Uniform distribution for particle radius
    const particleRadius = radiusMin + Math.random() * radiusRange;

    positions[i * 4] = x;
    positions[i * 4 + 1] = y;
    positions[i * 4 + 2] = z;
    positions[i * 4 + 3] = particleRadius; // Store radius in w component

    // Initial velocity: small downward
    velocities[i * 4] = (Math.random() - 0.5) * 0.5;
    velocities[i * 4 + 1] = -Math.random() * 1.0;
    velocities[i * 4 + 2] = (Math.random() - 0.5) * 0.5;
    velocities[i * 4 + 3] = 0.5; // Neutral channel value (will be set in gyroid region)
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
