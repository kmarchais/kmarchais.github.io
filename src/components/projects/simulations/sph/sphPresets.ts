/**
 * SPH (Smoothed Particle Hydrodynamics) Initial Condition Presets
 *
 * Various initial configurations for fluid simulations.
 */

import { SPHConfig } from '@/hooks/simulations/useSPHSimulation';

export interface SPHParticleData {
  positions: Float32Array;
  velocities: Float32Array;
}

export interface SPHPreset {
  name: string;
  description: string;
  generator: (count: number, config: SPHConfig) => SPHParticleData;
}

/**
 * Generate a dam break scenario - water column on one side
 * Spacing is calculated to fit exactly the requested particle count
 */
function generateDamBreak(count: number, config: SPHConfig): SPHParticleData {
  const positions = new Float32Array(count * 4);
  const velocities = new Float32Array(count * 4);

  // Dam on left side of box
  const damWidth = config.boxSize[0] * 0.4;
  const damHeight = config.boxSize[1] * 0.8;
  const damDepth = config.boxSize[2] * 0.9;

  // Calculate spacing to fit exactly count particles in the dam volume
  const damVolume = damWidth * damHeight * damDepth;
  const spacing = Math.cbrt(damVolume / count);

  // Calculate grid dimensions
  const gridX = Math.ceil(damWidth / spacing);
  const gridY = Math.ceil(damHeight / spacing);
  const gridZ = Math.ceil(damDepth / spacing);

  const halfBoxX = config.boxSize[0] / 2;
  const halfBoxZ = config.boxSize[2] / 2;

  let idx = 0;
  for (let y = 0; y < gridY && idx < count; y++) {
    for (let z = 0; z < gridZ && idx < count; z++) {
      for (let x = 0; x < gridX && idx < count; x++) {
        // Position particles in left side of box
        const px = -halfBoxX + spacing * 0.5 + x * spacing;
        const py = spacing * 0.5 + y * spacing;
        const pz = -halfBoxZ + (config.boxSize[2] - damDepth) / 2 + z * spacing;

        // Add small random jitter for stability
        const jitter = spacing * 0.05;
        positions[idx * 4] = px + (Math.random() - 0.5) * jitter;
        positions[idx * 4 + 1] = py + (Math.random() - 0.5) * jitter;
        positions[idx * 4 + 2] = pz + (Math.random() - 0.5) * jitter;
        // Store visual radius for rendering
        positions[idx * 4 + 3] = 1.0; // Reference scale (actual size set by smoothingLength)

        // Zero initial velocity
        velocities[idx * 4] = 0;
        velocities[idx * 4 + 1] = 0;
        velocities[idx * 4 + 2] = 0;
        velocities[idx * 4 + 3] = 0;

        idx++;
      }
    }
  }

  return { positions, velocities };
}

/**
 * Generate a falling droplet
 */
function generateDroplet(count: number, config: SPHConfig): SPHParticleData {
  const positions = new Float32Array(count * 4);
  const velocities = new Float32Array(count * 4);

  // Calculate spacing to fit particles in a sphere with proper density
  // For a sphere: volume = (4/3)πr³, so r = ∛(3V/(4π)) where V = count × spacing³
  // This gives us the radius for a given spacing
  const spacing = config.smoothingLength / 2; // spacing ≈ h/2 for consistency

  // Sphere radius to contain count particles at this spacing
  const radius = Math.cbrt((3 * count * Math.pow(spacing, 3)) / (4 * Math.PI));
  const centerY = config.boxSize[1] * 0.7;

  // Fibonacci sphere for uniform distribution
  const goldenRatio = (1 + Math.sqrt(5)) / 2;

  for (let i = 0; i < count; i++) {
    const theta = 2 * Math.PI * i / goldenRatio;
    const phi = Math.acos(1 - 2 * (i + 0.5) / count);

    // Random radius within sphere
    const r = radius * Math.cbrt(Math.random());

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.cos(phi) + centerY;
    const z = r * Math.sin(phi) * Math.sin(theta);

    positions[i * 4] = x;
    positions[i * 4 + 1] = y;
    positions[i * 4 + 2] = z;
    positions[i * 4 + 3] = 1.0; // Reference scale (actual size set by smoothingLength)

    // Initial downward velocity
    velocities[i * 4] = 0;
    velocities[i * 4 + 1] = -1.0;
    velocities[i * 4 + 2] = 0;
    velocities[i * 4 + 3] = 0;
  }

  return { positions, velocities };
}

/**
 * Generate two colliding water columns
 */
function generateDoubleDam(count: number, config: SPHConfig): SPHParticleData {
  const positions = new Float32Array(count * 4);
  const velocities = new Float32Array(count * 4);

  const halfCount = Math.floor(count / 2);

  const columnWidth = config.boxSize[0] * 0.2;
  const columnHeight = config.boxSize[1] * 0.6;
  const columnDepth = config.boxSize[2] * 0.8;

  // Calculate spacing to ensure grid has enough capacity for all particles
  const totalVolume = 2 * columnWidth * columnHeight * columnDepth;
  let spacing = Math.cbrt(totalVolume / count) * 0.95; // Slightly smaller for safety

  // Iteratively reduce spacing until we have enough capacity
  let gridX, gridY, gridZ;
  do {
    gridX = Math.floor(columnWidth / spacing);
    gridY = Math.floor(columnHeight / spacing);
    gridZ = Math.floor(columnDepth / spacing);
    if (2 * gridX * gridY * gridZ < count) spacing *= 0.95;
  } while (2 * gridX * gridY * gridZ < count);

  const halfBoxX = config.boxSize[0] / 2;
  const halfBoxZ = config.boxSize[2] / 2;

  // Left column
  let idx = 0;
  for (let y = 0; y < gridY && idx < halfCount; y++) {
    for (let z = 0; z < gridZ && idx < halfCount; z++) {
      for (let x = 0; x < gridX && idx < halfCount; x++) {
        const px = -halfBoxX + spacing + x * spacing;
        const py = spacing + y * spacing;
        const pz = -halfBoxZ + (config.boxSize[2] - columnDepth) / 2 + z * spacing;

        const jitter = spacing * 0.1;
        positions[idx * 4] = px + (Math.random() - 0.5) * jitter;
        positions[idx * 4 + 1] = py + (Math.random() - 0.5) * jitter;
        positions[idx * 4 + 2] = pz + (Math.random() - 0.5) * jitter;
        positions[idx * 4 + 3] = 1.0; // Reference scale (actual size set by smoothingLength)

        velocities[idx * 4] = 0;
        velocities[idx * 4 + 1] = 0;
        velocities[idx * 4 + 2] = 0;
        velocities[idx * 4 + 3] = 0;

        idx++;
      }
    }
  }

  // Right column
  for (let y = 0; y < gridY && idx < count; y++) {
    for (let z = 0; z < gridZ && idx < count; z++) {
      for (let x = 0; x < gridX && idx < count; x++) {
        const px = halfBoxX - columnWidth - spacing + x * spacing;
        const py = spacing + y * spacing;
        const pz = -halfBoxZ + (config.boxSize[2] - columnDepth) / 2 + z * spacing;

        const jitter = spacing * 0.1;
        positions[idx * 4] = px + (Math.random() - 0.5) * jitter;
        positions[idx * 4 + 1] = py + (Math.random() - 0.5) * jitter;
        positions[idx * 4 + 2] = pz + (Math.random() - 0.5) * jitter;
        positions[idx * 4 + 3] = 1.0; // Reference scale (actual size set by smoothingLength)

        velocities[idx * 4] = 0;
        velocities[idx * 4 + 1] = 0;
        velocities[idx * 4 + 2] = 0;
        velocities[idx * 4 + 3] = 0;

        idx++;
      }
    }
  }

  return { positions, velocities };
}

/**
 * Generate a waterfall - particles entering from above
 */
function generateWaterfall(count: number, config: SPHConfig): SPHParticleData {
  const positions = new Float32Array(count * 4);
  const velocities = new Float32Array(count * 4);

  // Stream dimensions
  const streamWidth = config.boxSize[0] * 0.3;
  const streamDepth = config.boxSize[2] * 0.3;
  const streamHeight = config.boxSize[1] * 0.6;

  // Calculate spacing to ensure grid has enough capacity
  const streamVolume = streamWidth * streamHeight * streamDepth;
  let spacing = Math.cbrt(streamVolume / count) * 0.95;

  let gridX, gridY, gridZ;
  do {
    gridX = Math.floor(streamWidth / spacing);
    gridY = Math.floor(streamHeight / spacing);
    gridZ = Math.floor(streamDepth / spacing);
    if (gridX * gridY * gridZ < count) spacing *= 0.95;
  } while (gridX * gridY * gridZ < count);

  let idx = 0;
  for (let y = 0; y < gridY && idx < count; y++) {
    for (let z = 0; z < gridZ && idx < count; z++) {
      for (let x = 0; x < gridX && idx < count; x++) {
        // Position particles in upper center
        const px = -streamWidth / 2 + x * spacing;
        const py = config.boxSize[1] * 0.3 + y * spacing;
        const pz = -streamDepth / 2 + z * spacing;

        const jitter = spacing * 0.1;
        positions[idx * 4] = px + (Math.random() - 0.5) * jitter;
        positions[idx * 4 + 1] = py + (Math.random() - 0.5) * jitter;
        positions[idx * 4 + 2] = pz + (Math.random() - 0.5) * jitter;
        positions[idx * 4 + 3] = 1.0;

        velocities[idx * 4] = 0;
        velocities[idx * 4 + 1] = -2.0;
        velocities[idx * 4 + 2] = 0;
        velocities[idx * 4 + 3] = 0;

        idx++;
      }
    }
  }

  return { positions, velocities };
}

/**
 * Generate a simple cube of fluid
 */
function generateCube(count: number, config: SPHConfig): SPHParticleData {
  const positions = new Float32Array(count * 4);
  const velocities = new Float32Array(count * 4);

  // Calculate grid size - ceil ensures gridSize³ >= count
  const gridSize = Math.ceil(Math.cbrt(count));
  const cubeSize = Math.min(config.boxSize[0], config.boxSize[2]) * 0.6;
  const spacing = cubeSize / gridSize;
  const halfCube = cubeSize / 2;

  let idx = 0;
  for (let y = 0; y < gridSize && idx < count; y++) {
    for (let z = 0; z < gridSize && idx < count; z++) {
      for (let x = 0; x < gridSize && idx < count; x++) {
        const px = -halfCube + x * spacing + spacing / 2;
        const py = config.boxSize[1] * 0.5 + y * spacing;
        const pz = -halfCube + z * spacing + spacing / 2;

        const jitter = spacing * 0.05;
        positions[idx * 4] = px + (Math.random() - 0.5) * jitter;
        positions[idx * 4 + 1] = py + (Math.random() - 0.5) * jitter;
        positions[idx * 4 + 2] = pz + (Math.random() - 0.5) * jitter;
        positions[idx * 4 + 3] = 1.0;

        velocities[idx * 4] = 0;
        velocities[idx * 4 + 1] = 0;
        velocities[idx * 4 + 2] = 0;
        velocities[idx * 4 + 3] = 0;

        idx++;
      }
    }
  }

  return { positions, velocities };
}

/**
 * Generate a wave pool - particles with initial horizontal velocity
 */
function generateWave(count: number, config: SPHConfig): SPHParticleData {
  const positions = new Float32Array(count * 4);
  const velocities = new Float32Array(count * 4);

  // Pool dimensions
  const poolWidth = config.boxSize[0] * 0.9;
  const poolHeight = config.boxSize[1] * 0.3;
  const poolDepth = config.boxSize[2] * 0.9;

  // Calculate spacing to ensure grid has enough capacity
  const poolVolume = poolWidth * poolHeight * poolDepth;
  let spacing = Math.cbrt(poolVolume / count) * 0.95;

  let gridX, gridY, gridZ;
  do {
    gridX = Math.floor(poolWidth / spacing);
    gridY = Math.floor(poolHeight / spacing);
    gridZ = Math.floor(poolDepth / spacing);
    if (gridX * gridY * gridZ < count) spacing *= 0.95;
  } while (gridX * gridY * gridZ < count);

  const halfBoxX = config.boxSize[0] / 2;
  const halfBoxZ = config.boxSize[2] / 2;

  let idx = 0;
  for (let y = 0; y < gridY && idx < count; y++) {
    for (let z = 0; z < gridZ && idx < count; z++) {
      for (let x = 0; x < gridX && idx < count; x++) {
        const px = -halfBoxX + (config.boxSize[0] - poolWidth) / 2 + x * spacing;
        const py = spacing + y * spacing;
        const pz = -halfBoxZ + (config.boxSize[2] - poolDepth) / 2 + z * spacing;

        const jitter = spacing * 0.1;
        positions[idx * 4] = px + (Math.random() - 0.5) * jitter;
        positions[idx * 4 + 1] = py + (Math.random() - 0.5) * jitter;
        positions[idx * 4 + 2] = pz + (Math.random() - 0.5) * jitter;
        positions[idx * 4 + 3] = 1.0;

        // Sinusoidal initial velocity for wave
        const wave = Math.sin((px / poolWidth) * Math.PI * 2);
        velocities[idx * 4] = wave * 2.0;
        velocities[idx * 4 + 1] = 0;
        velocities[idx * 4 + 2] = 0;
        velocities[idx * 4 + 3] = 0;

        idx++;
      }
    }
  }

  return { positions, velocities };
}

export const SPH_PRESETS: Record<string, SPHPreset> = {
  damBreak: {
    name: 'Dam Break',
    description: 'Classic dam break scenario',
    generator: generateDamBreak,
  },
  droplet: {
    name: 'Droplet',
    description: 'Falling water droplet',
    generator: generateDroplet,
  },
  doubleDam: {
    name: 'Double Dam',
    description: 'Two colliding water columns',
    generator: generateDoubleDam,
  },
  waterfall: {
    name: 'Waterfall',
    description: 'Particles streaming down',
    generator: generateWaterfall,
  },
  cube: {
    name: 'Cube',
    description: 'Simple cube of fluid',
    generator: generateCube,
  },
  wave: {
    name: 'Wave Pool',
    description: 'Pool with initial wave motion',
    generator: generateWave,
  },
};

export const SPH_PRESET_OPTIONS: Record<string, string> = {
  damBreak: 'Dam Break',
  droplet: 'Droplet',
  doubleDam: 'Double Dam',
  waterfall: 'Waterfall',
  cube: 'Cube',
  wave: 'Wave Pool',
};
