/**
 * GPU Field Computation Shader for Marching Cubes
 *
 * Computes density and velocity fields on a 3D grid from particle data.
 * Uses the same spatial hash as SPH for efficient neighbor lookup.
 * This replaces the CPU-based computeFields() function.
 */

export const FIELD_COMPUTE_WORKGROUP_SIZE = 4; // 4x4x4 = 64 threads per workgroup

/**
 * Field compute parameters size in bytes
 * - gridDimX/Y/Z: u32 (12 bytes) + padding (4 bytes)
 * - gridMin: vec3f (12 bytes) + padding (4 bytes)
 * - gridMax: vec3f (12 bytes) + padding (4 bytes)
 * - cellSize: vec3f (12 bytes) + padding (4 bytes)
 * - smoothingRadius: f32 (4 bytes)
 * - particleCount: u32 (4 bytes)
 * - padding: 8 bytes
 * Total: 64 bytes
 */
export const FIELD_COMPUTE_PARAMS_SIZE = 64;

export interface FieldComputeParams {
  gridDimX: number;
  gridDimY: number;
  gridDimZ: number;
  gridMin: [number, number, number];
  gridMax: [number, number, number];
  smoothingRadius: number;
  particleCount: number;
}

export function createFieldComputeParamsBuffer(params: FieldComputeParams): ArrayBuffer {
  const buffer = new ArrayBuffer(FIELD_COMPUTE_PARAMS_SIZE);
  const u32View = new Uint32Array(buffer);
  const f32View = new Float32Array(buffer);

  // Grid dimensions (vec3u at offset 0)
  u32View[0] = params.gridDimX;
  u32View[1] = params.gridDimY;
  u32View[2] = params.gridDimZ;
  u32View[3] = 0; // padding

  // Grid min (vec3f at offset 16)
  f32View[4] = params.gridMin[0];
  f32View[5] = params.gridMin[1];
  f32View[6] = params.gridMin[2];
  f32View[7] = 0; // padding

  // Grid max (vec3f at offset 32)
  f32View[8] = params.gridMax[0];
  f32View[9] = params.gridMax[1];
  f32View[10] = params.gridMax[2];
  f32View[11] = 0; // padding

  // Smoothing radius, particle count (offset 48)
  f32View[12] = params.smoothingRadius;
  u32View[13] = params.particleCount;
  // Cell size computed in shader from grid dimensions and bounds
  f32View[14] = 0; // padding
  f32View[15] = 0; // padding

  return buffer;
}

export const fieldComputeShader = /* wgsl */ `
// Workgroup size for 3D dispatch
const WG_SIZE: u32 = ${FIELD_COMPUTE_WORKGROUP_SIZE}u;

// Mathematical constants
const PI: f32 = 3.14159265359;

struct FieldComputeParams {
  gridDim: vec3u,
  _pad0: u32,
  gridMin: vec3f,
  _pad1: f32,
  gridMax: vec3f,
  _pad2: f32,
  smoothingRadius: f32,
  particleCount: u32,
  _pad3: f32,
  _pad4: f32,
}

// Spatial hash parameters (same as SPH)
struct SpatialHashParams {
  particleCount: u32,
  gridDimX: u32,
  gridDimY: u32,
  gridDimZ: u32,
  cellSize: f32,
  gridMinX: f32,
  gridMinY: f32,
  gridMinZ: f32,
}

// Bindings
@group(0) @binding(0) var<uniform> params: FieldComputeParams;
@group(0) @binding(1) var<storage, read> positions: array<vec4f>;
@group(0) @binding(2) var<storage, read> velocities: array<vec4f>;
@group(0) @binding(3) var<storage, read_write> densityField: array<f32>;
@group(0) @binding(4) var<storage, read_write> velocityFieldX: array<f32>;
@group(0) @binding(5) var<storage, read_write> velocityFieldY: array<f32>;
@group(0) @binding(6) var<storage, read_write> velocityFieldZ: array<f32>;

// Spatial hash bindings (group 1)
@group(1) @binding(0) var<uniform> hashParams: SpatialHashParams;
@group(1) @binding(1) var<storage, read> cellIndices: array<u32>;
@group(1) @binding(2) var<storage, read> cellOffsets: array<u32>;
@group(1) @binding(3) var<storage, read> sortedIndices: array<u32>;

/**
 * Poly6 Kernel - Same as SPH density estimation
 */
fn kernelPoly6(r: f32, h: f32) -> f32 {
  if (r >= h) {
    return 0.0;
  }
  let h2 = h * h;
  let r2 = r * r;
  let diff = h2 - r2;
  let coeff = 315.0 / (64.0 * PI * pow(h, 9.0));
  return coeff * diff * diff * diff;
}

/**
 * Convert world position to spatial hash cell coordinate
 */
fn positionToHashCell(pos: vec3f) -> vec3i {
  let gridMin = vec3f(hashParams.gridMinX, hashParams.gridMinY, hashParams.gridMinZ);
  let localPos = pos - gridMin;
  return vec3i(floor(localPos / hashParams.cellSize));
}

/**
 * Convert 3D hash cell coordinate to 1D index
 */
fn hashCellToIndex(cell: vec3i) -> u32 {
  let c = vec3u(clamp(cell, vec3i(0), vec3i(i32(hashParams.gridDimX) - 1, i32(hashParams.gridDimY) - 1, i32(hashParams.gridDimZ) - 1)));
  return c.x + c.y * hashParams.gridDimX + c.z * hashParams.gridDimX * hashParams.gridDimY;
}

/**
 * Total number of hash cells
 */
fn numHashCells() -> u32 {
  return hashParams.gridDimX * hashParams.gridDimY * hashParams.gridDimZ;
}

/**
 * Check if hash cell is valid
 */
fn isValidHashCell(cell: vec3i) -> bool {
  return cell.x >= 0 && cell.x < i32(hashParams.gridDimX) &&
         cell.y >= 0 && cell.y < i32(hashParams.gridDimY) &&
         cell.z >= 0 && cell.z < i32(hashParams.gridDimZ);
}

/**
 * Convert grid index to world position
 */
fn gridToWorld(gridPos: vec3u) -> vec3f {
  let cellSize = (params.gridMax - params.gridMin) / vec3f(params.gridDim - vec3u(1u));
  return params.gridMin + vec3f(gridPos) * cellSize;
}

/**
 * Convert 3D grid position to 1D index
 */
fn gridToIndex(pos: vec3u) -> u32 {
  return pos.x + pos.y * params.gridDim.x + pos.z * params.gridDim.x * params.gridDim.y;
}

/**
 * Main kernel: Compute density and velocity at each grid point
 * Uses spatial hash for efficient neighbor lookup
 */
@compute @workgroup_size(WG_SIZE, WG_SIZE, WG_SIZE)
fn computeFields(@builtin(global_invocation_id) global_id: vec3u) {
  // Check grid bounds
  if (global_id.x >= params.gridDim.x ||
      global_id.y >= params.gridDim.y ||
      global_id.z >= params.gridDim.z) {
    return;
  }

  let gridIdx = gridToIndex(global_id);
  let worldPos = gridToWorld(global_id);
  let h = params.smoothingRadius;

  var density = 0.0;
  var velocitySum = vec3f(0.0);
  var weightSum = 0.0;

  // Get the hash cell for this world position
  let hashCell = positionToHashCell(worldPos);

  // Compute search radius in hash cells
  let searchRadius = i32(ceil(h / hashParams.cellSize)) + 1;

  // Iterate over neighboring hash cells
  for (var dz = -searchRadius; dz <= searchRadius; dz++) {
    for (var dy = -searchRadius; dy <= searchRadius; dy++) {
      for (var dx = -searchRadius; dx <= searchRadius; dx++) {
        let neighborCell = hashCell + vec3i(dx, dy, dz);

        if (!isValidHashCell(neighborCell)) {
          continue;
        }

        let cellIdx = hashCellToIndex(neighborCell);

        // Get particle range in this cell
        let start = cellOffsets[cellIdx];
        let end = select(cellOffsets[cellIdx + 1u], params.particleCount, cellIdx + 1u >= numHashCells());

        // Process particles in this cell
        for (var k = start; k < end; k++) {
          let particleIdx = sortedIndices[k];
          let particlePos = positions[particleIdx].xyz;
          let particleVel = velocities[particleIdx].xyz;

          let diff = worldPos - particlePos;
          let dist = length(diff);

          let w = kernelPoly6(dist, h);
          if (w > 0.0) {
            density += w;
            velocitySum += particleVel * w;
            weightSum += w;
          }
        }
      }
    }
  }

  // Store results
  densityField[gridIdx] = density;

  // Normalize velocity by weight
  if (weightSum > 0.0) {
    let avgVel = velocitySum / weightSum;
    velocityFieldX[gridIdx] = avgVel.x;
    velocityFieldY[gridIdx] = avgVel.y;
    velocityFieldZ[gridIdx] = avgVel.z;
  } else {
    velocityFieldX[gridIdx] = 0.0;
    velocityFieldY[gridIdx] = 0.0;
    velocityFieldZ[gridIdx] = 0.0;
  }
}

/**
 * Direct version without spatial hash (fallback for small particle counts)
 * O(N) per grid cell, but simpler
 */
@compute @workgroup_size(WG_SIZE, WG_SIZE, WG_SIZE)
fn computeFieldsDirect(@builtin(global_invocation_id) global_id: vec3u) {
  // Check grid bounds
  if (global_id.x >= params.gridDim.x ||
      global_id.y >= params.gridDim.y ||
      global_id.z >= params.gridDim.z) {
    return;
  }

  let gridIdx = gridToIndex(global_id);
  let worldPos = gridToWorld(global_id);
  let h = params.smoothingRadius;

  var density = 0.0;
  var velocitySum = vec3f(0.0);
  var weightSum = 0.0;

  // Check all particles (O(N) per grid cell)
  for (var i = 0u; i < params.particleCount; i++) {
    let particlePos = positions[i].xyz;
    let particleVel = velocities[i].xyz;

    let diff = worldPos - particlePos;
    let dist = length(diff);

    let w = kernelPoly6(dist, h);
    if (w > 0.0) {
      density += w;
      velocitySum += particleVel * w;
      weightSum += w;
    }
  }

  // Store results
  densityField[gridIdx] = density;

  if (weightSum > 0.0) {
    let avgVel = velocitySum / weightSum;
    velocityFieldX[gridIdx] = avgVel.x;
    velocityFieldY[gridIdx] = avgVel.y;
    velocityFieldZ[gridIdx] = avgVel.z;
  } else {
    velocityFieldX[gridIdx] = 0.0;
    velocityFieldY[gridIdx] = 0.0;
    velocityFieldZ[gridIdx] = 0.0;
  }
}

/**
 * Reset field buffers to zero
 */
@compute @workgroup_size(256)
fn resetFields(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  let totalCells = params.gridDim.x * params.gridDim.y * params.gridDim.z;

  if (idx >= totalCells) {
    return;
  }

  densityField[idx] = 0.0;
  velocityFieldX[idx] = 0.0;
  velocityFieldY[idx] = 0.0;
  velocityFieldZ[idx] = 0.0;
}
`;
