/**
 * WebGPU Buffer Manager
 *
 * Provides utilities for creating and managing GPU buffers
 * for particle simulations with ping-pong double buffering.
 */

export interface SimulationBuffers {
  /** Position buffers for ping-pong (vec4: x, y, z, mass/radius) */
  positionsA: GPUBuffer;
  positionsB: GPUBuffer;

  /** Velocity buffers for ping-pong (vec4: vx, vy, vz, padding) */
  velocitiesA: GPUBuffer;
  velocitiesB: GPUBuffer;

  /** Force/acceleration buffer (computed each frame) */
  forces: GPUBuffer;

  /** Staging buffer for CPU readback (rendering) */
  stagingPositions: GPUBuffer;

  /** Staging buffer for velocity readback (coloring) */
  stagingVelocities: GPUBuffer;

  /** Uniform buffer for simulation parameters */
  params: GPUBuffer;

  /** Current particle count */
  particleCount: number;
}

/** Maximum particles per cell for spatial hash */
export const MAX_PARTICLES_PER_CELL = 32;

/**
 * Spatial hash buffers for prefix-sum based neighbor search
 * Used by SPH for efficient O(N) neighbor queries
 */
export interface SpatialHashBuffers {
  /** Which cell each particle belongs to (one u32 per particle) */
  cellIndices: GPUBuffer;

  /** Cell particle counts (one u32 per cell) - used during construction */
  cellCounts: GPUBuffer;

  /** Prefix sum of cell counts - where each cell's particles start in sorted array */
  cellOffsets: GPUBuffer;

  /** Particle indices sorted by cell */
  sortedIndices: GPUBuffer;

  /** Number of cells */
  numCells: number;

  /** Fixed-size particle list per cell (legacy DEM approach) */
  cellParticles?: GPUBuffer;
}

/**
 * Calculate aligned buffer size (WebGPU requires 4-byte alignment for uniforms)
 */
export function alignedSize(size: number, alignment: number = 4): number {
  return Math.ceil(size / alignment) * alignment;
}

/**
 * Create simulation buffers for particle systems
 */
export function createSimulationBuffers(
  device: GPUDevice,
  particleCount: number,
  paramsByteSize: number
): SimulationBuffers {
  const vec4Size = 4 * 4; // 4 floats * 4 bytes
  const positionBufferSize = particleCount * vec4Size;
  const velocityBufferSize = particleCount * vec4Size;
  const forceBufferSize = particleCount * vec4Size;

  // Position buffers (ping-pong)
  const positionsA = device.createBuffer({
    size: positionBufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    label: 'positions_A',
  });

  const positionsB = device.createBuffer({
    size: positionBufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    label: 'positions_B',
  });

  // Velocity buffers (ping-pong)
  const velocitiesA = device.createBuffer({
    size: velocityBufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    label: 'velocities_A',
  });

  const velocitiesB = device.createBuffer({
    size: velocityBufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    label: 'velocities_B',
  });

  // Force buffer
  const forces = device.createBuffer({
    size: forceBufferSize,
    usage: GPUBufferUsage.STORAGE,
    label: 'forces',
  });

  // Staging buffers for CPU readback
  const stagingPositions = device.createBuffer({
    size: positionBufferSize,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    label: 'staging_positions',
  });

  const stagingVelocities = device.createBuffer({
    size: velocityBufferSize,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    label: 'staging_velocities',
  });

  // Uniform buffer for simulation parameters
  const params = device.createBuffer({
    size: alignedSize(paramsByteSize, 16), // 16-byte alignment for uniforms
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    label: 'simulation_params',
  });

  return {
    positionsA,
    positionsB,
    velocitiesA,
    velocitiesB,
    forces,
    stagingPositions,
    stagingVelocities,
    params,
    particleCount,
  };
}

/**
 * Create spatial hashing buffers for neighbor search (SPH)
 * Uses prefix-sum approach for memory-efficient sorted particle lists
 */
export function createSpatialHashBuffers(
  device: GPUDevice,
  particleCount: number,
  gridDimensions: [number, number, number]
): SpatialHashBuffers {
  const numCells = gridDimensions[0] * gridDimensions[1] * gridDimensions[2];

  // Cell indices - which cell each particle belongs to (one u32 per particle)
  const cellIndices = device.createBuffer({
    size: particleCount * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    label: 'cell_indices',
  });

  // Cell counts buffer - one atomic u32 per cell (used during hash construction)
  const cellCounts = device.createBuffer({
    size: numCells * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    label: 'cell_counts',
  });

  // Cell offsets - prefix sum, where each cell's particles start (numCells + 1 for end marker)
  const cellOffsets = device.createBuffer({
    size: (numCells + 1) * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    label: 'cell_offsets',
  });

  // Sorted particle indices - particles sorted by their cell
  const sortedIndices = device.createBuffer({
    size: particleCount * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    label: 'sorted_indices',
  });

  // Fixed-size particle list per cell (legacy approach for DEM)
  // Each cell stores MAX_PARTICLES_PER_CELL particle indices
  const cellParticles = device.createBuffer({
    size: numCells * MAX_PARTICLES_PER_CELL * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    label: 'cell_particles',
  });

  return {
    cellIndices,
    cellCounts,
    cellOffsets,
    sortedIndices,
    numCells,
    cellParticles,
  };
}

/**
 * Upload initial particle data to GPU buffers
 */
export function uploadParticleData(
  device: GPUDevice,
  buffers: SimulationBuffers,
  positions: Float32Array,
  velocities: Float32Array
): void {
  // Use slice() to ensure we have a regular ArrayBuffer, not SharedArrayBuffer
  device.queue.writeBuffer(buffers.positionsA, 0, positions.buffer.slice(positions.byteOffset, positions.byteOffset + positions.byteLength));
  device.queue.writeBuffer(buffers.positionsB, 0, positions.buffer.slice(positions.byteOffset, positions.byteOffset + positions.byteLength));
  device.queue.writeBuffer(buffers.velocitiesA, 0, velocities.buffer.slice(velocities.byteOffset, velocities.byteOffset + velocities.byteLength));
  device.queue.writeBuffer(buffers.velocitiesB, 0, velocities.buffer.slice(velocities.byteOffset, velocities.byteOffset + velocities.byteLength));
}

/**
 * Copy positions to staging buffer and read back to CPU
 */
export async function readParticlePositions(
  device: GPUDevice,
  positionBuffer: GPUBuffer,
  stagingBuffer: GPUBuffer,
  particleCount: number
): Promise<Float32Array> {
  const bufferSize = particleCount * 16; // 4 floats * 4 bytes

  // Encode copy command
  const encoder = device.createCommandEncoder();
  encoder.copyBufferToBuffer(positionBuffer, 0, stagingBuffer, 0, bufferSize);
  device.queue.submit([encoder.finish()]);

  // Map and read
  await stagingBuffer.mapAsync(GPUMapMode.READ);
  const data = new Float32Array(stagingBuffer.getMappedRange().slice(0));
  stagingBuffer.unmap();

  return data;
}

/**
 * Copy velocities to staging buffer and read back to CPU
 */
export async function readParticleVelocities(
  device: GPUDevice,
  velocityBuffer: GPUBuffer,
  stagingBuffer: GPUBuffer,
  particleCount: number
): Promise<Float32Array> {
  const bufferSize = particleCount * 16;

  const encoder = device.createCommandEncoder();
  encoder.copyBufferToBuffer(velocityBuffer, 0, stagingBuffer, 0, bufferSize);
  device.queue.submit([encoder.finish()]);

  await stagingBuffer.mapAsync(GPUMapMode.READ);
  const data = new Float32Array(stagingBuffer.getMappedRange().slice(0));
  stagingBuffer.unmap();

  return data;
}

/**
 * Destroy all simulation buffers
 */
export function destroySimulationBuffers(buffers: SimulationBuffers): void {
  buffers.positionsA.destroy();
  buffers.positionsB.destroy();
  buffers.velocitiesA.destroy();
  buffers.velocitiesB.destroy();
  buffers.forces.destroy();
  buffers.stagingPositions.destroy();
  buffers.stagingVelocities.destroy();
  buffers.params.destroy();
}

/**
 * Destroy spatial hash buffers
 */
export function destroySpatialHashBuffers(buffers: SpatialHashBuffers): void {
  buffers.cellIndices.destroy();
  buffers.cellCounts.destroy();
  buffers.cellOffsets.destroy();
  buffers.sortedIndices.destroy();
  if (buffers.cellParticles) {
    buffers.cellParticles.destroy();
  }
}
