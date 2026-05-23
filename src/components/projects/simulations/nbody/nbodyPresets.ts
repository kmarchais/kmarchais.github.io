/**
 * N-Body Initial Condition Presets
 *
 * Various starting configurations for N-Body gravitational simulations.
 */

export interface ParticleInitData {
  positions: Float32Array;  // vec4 per particle: x, y, z, mass
  velocities: Float32Array; // vec4 per particle: vx, vy, vz, unused
}

export interface NBodyPreset {
  name: string;
  description: string;
  generator: (count: number) => ParticleInitData;
}

/**
 * Generate uniform random distribution in a cube
 */
function generateUniformCube(count: number, halfSize: number = 5): ParticleInitData {
  const positions = new Float32Array(count * 4);
  const velocities = new Float32Array(count * 4);

  for (let i = 0; i < count; i++) {
    const idx = i * 4;

    // Random position in cube
    positions[idx] = (Math.random() - 0.5) * 2 * halfSize;
    positions[idx + 1] = (Math.random() - 0.5) * 2 * halfSize;
    positions[idx + 2] = (Math.random() - 0.5) * 2 * halfSize;
    positions[idx + 3] = 1.0; // mass

    // Zero initial velocity
    velocities[idx] = 0;
    velocities[idx + 1] = 0;
    velocities[idx + 2] = 0;
    velocities[idx + 3] = 0;
  }

  return { positions, velocities };
}

/**
 * Generate rotating disk with orbital velocities
 */
function generateDisk(count: number, radius: number = 5, thickness: number = 0.5): ParticleInitData {
  const positions = new Float32Array(count * 4);
  const velocities = new Float32Array(count * 4);

  // Central mass for orbit calculation
  const centralMass = count * 0.1;
  const G = 1.0;

  for (let i = 0; i < count; i++) {
    const idx = i * 4;

    // Random position in disk
    const r = Math.sqrt(Math.random()) * radius; // sqrt for uniform area distribution
    const theta = Math.random() * 2 * Math.PI;
    const z = (Math.random() - 0.5) * thickness;

    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);

    positions[idx] = x;
    positions[idx + 1] = y;
    positions[idx + 2] = z;
    positions[idx + 3] = 1.0; // mass

    // Orbital velocity for circular orbit
    // v = sqrt(G * M / r) in tangential direction
    const vMag = r > 0.1 ? Math.sqrt(G * centralMass / r) * 0.5 : 0;
    const vx = -vMag * Math.sin(theta);
    const vy = vMag * Math.cos(theta);

    velocities[idx] = vx;
    velocities[idx + 1] = vy;
    velocities[idx + 2] = 0;
    velocities[idx + 3] = 0;
  }

  return { positions, velocities };
}

/**
 * Generate Plummer sphere (spherical cluster with Plummer density profile)
 * rho(r) = (3M / 4pi a³) * (1 + r²/a²)^(-5/2)
 */
function generatePlummerSphere(count: number, scale: number = 3): ParticleInitData {
  const positions = new Float32Array(count * 4);
  const velocities = new Float32Array(count * 4);

  const a = scale; // Plummer scale radius

  for (let i = 0; i < count; i++) {
    const idx = i * 4;

    // Sample radius from Plummer distribution using inverse CDF
    // r = a / sqrt(X^(-2/3) - 1) where X is uniform [0,1]
    const X = Math.random();
    const r = a / Math.sqrt(Math.pow(X, -2/3) - 1);

    // Random direction (uniform on sphere)
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    positions[idx] = x;
    positions[idx + 1] = y;
    positions[idx + 2] = z;
    positions[idx + 3] = 1.0; // mass

    // Velocity from Plummer distribution
    // Using rejection sampling for velocity magnitude
    const q = Math.random();
    const vEsc = Math.sqrt(2) * Math.pow(1 + r * r / (a * a), -0.25);
    const vMag = vEsc * q * 0.3;

    // Random velocity direction
    const vTheta = Math.random() * 2 * Math.PI;
    const vPhi = Math.acos(2 * Math.random() - 1);

    velocities[idx] = vMag * Math.sin(vPhi) * Math.cos(vTheta);
    velocities[idx + 1] = vMag * Math.sin(vPhi) * Math.sin(vTheta);
    velocities[idx + 2] = vMag * Math.cos(vPhi);
    velocities[idx + 3] = 0;
  }

  return { positions, velocities };
}

/**
 * Generate two clusters on collision course
 */
function generateTwoBodyCollision(count: number): ParticleInitData {
  const positions = new Float32Array(count * 4);
  const velocities = new Float32Array(count * 4);

  const halfCount = Math.floor(count / 2);
  const clusterRadius = 2;
  const separation = 8;
  const impactVelocity = 0.5;

  // First cluster (left, moving right)
  for (let i = 0; i < halfCount; i++) {
    const idx = i * 4;

    // Spherical distribution
    const r = Math.pow(Math.random(), 1/3) * clusterRadius;
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[idx] = r * Math.sin(phi) * Math.cos(theta) - separation / 2;
    positions[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[idx + 2] = r * Math.cos(phi);
    positions[idx + 3] = 1.0;

    velocities[idx] = impactVelocity;
    velocities[idx + 1] = 0;
    velocities[idx + 2] = 0;
    velocities[idx + 3] = 0;
  }

  // Second cluster (right, moving left)
  for (let i = halfCount; i < count; i++) {
    const idx = i * 4;

    const r = Math.pow(Math.random(), 1/3) * clusterRadius;
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[idx] = r * Math.sin(phi) * Math.cos(theta) + separation / 2;
    positions[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[idx + 2] = r * Math.cos(phi);
    positions[idx + 3] = 1.0;

    velocities[idx] = -impactVelocity;
    velocities[idx + 1] = 0;
    velocities[idx + 2] = 0;
    velocities[idx + 3] = 0;
  }

  return { positions, velocities };
}

/**
 * Generate solar system-like configuration
 * Central massive body with orbiting smaller bodies
 */
function generateSolarSystem(count: number): ParticleInitData {
  const positions = new Float32Array(count * 4);
  const velocities = new Float32Array(count * 4);

  // Central star (much larger mass)
  positions[0] = 0;
  positions[1] = 0;
  positions[2] = 0;
  positions[3] = count * 10; // Large mass

  velocities[0] = 0;
  velocities[1] = 0;
  velocities[2] = 0;
  velocities[3] = 0;

  const centralMass = count * 10;
  const G = 1.0;

  // Orbiting bodies
  for (let i = 1; i < count; i++) {
    const idx = i * 4;

    // Random orbital radius (distributed to fill space)
    const r = 1 + Math.sqrt(Math.random()) * 8;
    const theta = Math.random() * 2 * Math.PI;
    const inclination = (Math.random() - 0.5) * 0.2; // Slight inclination

    positions[idx] = r * Math.cos(theta);
    positions[idx + 1] = r * Math.sin(theta);
    positions[idx + 2] = r * inclination;
    positions[idx + 3] = 1.0; // Small mass

    // Circular orbital velocity
    const vMag = Math.sqrt(G * centralMass / r);
    velocities[idx] = -vMag * Math.sin(theta);
    velocities[idx + 1] = vMag * Math.cos(theta);
    velocities[idx + 2] = 0;
    velocities[idx + 3] = 0;
  }

  return { positions, velocities };
}

/**
 * Generate expanding shell
 */
function generateExpandingShell(count: number, radius: number = 5): ParticleInitData {
  const positions = new Float32Array(count * 4);
  const velocities = new Float32Array(count * 4);

  const expansionSpeed = 1.0;

  for (let i = 0; i < count; i++) {
    const idx = i * 4;

    // Uniform distribution on sphere surface
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    positions[idx] = x;
    positions[idx + 1] = y;
    positions[idx + 2] = z;
    positions[idx + 3] = 1.0;

    // Radial outward velocity
    const nx = Math.sin(phi) * Math.cos(theta);
    const ny = Math.sin(phi) * Math.sin(theta);
    const nz = Math.cos(phi);

    velocities[idx] = nx * expansionSpeed;
    velocities[idx + 1] = ny * expansionSpeed;
    velocities[idx + 2] = nz * expansionSpeed;
    velocities[idx + 3] = 0;
  }

  return { positions, velocities };
}

// Available presets
export const NBODY_PRESETS: Record<string, NBodyPreset> = {
  uniform: {
    name: 'Uniform Cube',
    description: 'Particles uniformly distributed in a cube with zero initial velocity',
    generator: (count) => generateUniformCube(count, 5),
  },
  disk: {
    name: 'Rotating Disk',
    description: 'Flat disk with circular orbital velocities - forms spiral structure',
    generator: (count) => generateDisk(count, 5, 0.5),
  },
  plummer: {
    name: 'Plummer Sphere',
    description: 'Spherical cluster with Plummer density profile - stable equilibrium',
    generator: (count) => generatePlummerSphere(count, 3),
  },
  collision: {
    name: 'Two-Body Collision',
    description: 'Two clusters on collision course - spectacular merger',
    generator: (count) => generateTwoBodyCollision(count),
  },
  solar: {
    name: 'Solar System',
    description: 'Central massive body with orbiting smaller particles',
    generator: (count) => generateSolarSystem(count),
  },
  shell: {
    name: 'Expanding Shell',
    description: 'Shell of particles expanding outward then collapsing',
    generator: (count) => generateExpandingShell(count, 5),
  },
};

// Preset names for UI
export const PRESET_OPTIONS = Object.keys(NBODY_PRESETS);
