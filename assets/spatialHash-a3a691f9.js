const e=256,l=32,i=`
// Workgroup size for all spatial hash kernels
const WORKGROUP_SIZE: u32 = ${256}u;

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

@group(0) @binding(0) var<uniform> params: SpatialHashParams;
@group(0) @binding(1) var<storage, read> positions: array<vec4f>;
@group(0) @binding(2) var<storage, read_write> cellIndices: array<u32>;
@group(0) @binding(3) var<storage, read_write> cellCounts: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read> cellOffsets: array<u32>;
@group(0) @binding(5) var<storage, read_write> sortedIndices: array<u32>;

/**
 * Convert world position to grid cell coordinate
 */
fn positionToCell(pos: vec3f) -> vec3u {
  let gridMin = vec3f(params.gridMinX, params.gridMinY, params.gridMinZ);
  let localPos = pos - gridMin;
  let cellCoord = vec3u(floor(max(localPos, vec3f(0.0)) / params.cellSize));

  // Clamp to grid bounds
  return clamp(
    cellCoord,
    vec3u(0u),
    vec3u(params.gridDimX - 1u, params.gridDimY - 1u, params.gridDimZ - 1u)
  );
}

/**
 * Convert 3D cell coordinate to 1D cell index
 */
fn cellToIndex(cell: vec3u) -> u32 {
  return cell.x + cell.y * params.gridDimX + cell.z * params.gridDimX * params.gridDimY;
}

/**
 * Get total number of cells in the grid
 */
fn numCells() -> u32 {
  return params.gridDimX * params.gridDimY * params.gridDimZ;
}

/**
 * Kernel 1: Reset cell counts to zero
 * Dispatch: ceil(numCells / WORKGROUP_SIZE) workgroups
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn resetCellCounts(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  let totalCells = numCells();
  if (idx < totalCells) {
    atomicStore(&cellCounts[idx], 0u);
  }
}

/**
 * Kernel 2: Compute cell index for each particle and count particles per cell
 * Dispatch: ceil(particleCount / WORKGROUP_SIZE) workgroups
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn computeCellIndices(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) {
    return;
  }

  // Get particle position
  let pos = positions[idx].xyz;

  // Compute cell index
  let cell = positionToCell(pos);
  let cellIdx = cellToIndex(cell);

  // Store this particle's cell index
  cellIndices[idx] = cellIdx;

  // Atomically increment count for this cell
  atomicAdd(&cellCounts[cellIdx], 1u);
}

/**
 * Kernel 3: Sort particles by cell using prefix-sum offsets
 * After this, particles in cell c are at sortedIndices[cellOffsets[c]..cellOffsets[c+1]]
 * Dispatch: ceil(particleCount / WORKGROUP_SIZE) workgroups
 *
 * Note: cellOffsets must be computed on CPU as exclusive prefix sum of cellCounts
 *       before this kernel runs.
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn sortParticles(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) {
    return;
  }

  // Get this particle's cell
  let cellIdx = cellIndices[idx];

  // Atomically get a slot in the sorted array for this cell
  let slot = atomicAdd(&cellCounts[cellIdx], 1u);

  // The slot is relative to cellOffsets[cellIdx]
  // Note: cellCounts was reset, then incremented in computeCellIndices, then we build prefix sum,
  // then reset cellCounts again before sortParticles. So slot starts at 0 for each cell.
  let sortedPos = cellOffsets[cellIdx] + slot;

  // Store particle index at sorted position
  if (sortedPos < params.particleCount) {
    sortedIndices[sortedPos] = idx;
  }
}

// ============================================================================
// DEM-specific: Fixed max particles per cell (no prefix-sum needed)
// ============================================================================

const MAX_PARTICLES_PER_CELL: u32 = 32u;

// For DEM: cellParticles stores particle indices directly (fixed max per cell)
@group(0) @binding(6) var<storage, read_write> cellParticles: array<u32>;

/**
 * Kernel: Build spatial hash for DEM (fixed max per cell)
 * Each particle atomically adds itself to its cell's particle list.
 * Dispatch: ceil(particleCount / WORKGROUP_SIZE) workgroups
 *
 * This is simpler than the prefix-sum approach - just cap at MAX_PARTICLES_PER_CELL.
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn buildHash(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) {
    return;
  }

  // Get particle position
  let pos = positions[idx].xyz;

  // Compute cell index
  let cell = positionToCell(pos);
  let cellIdx = cellToIndex(cell);

  // Atomically get a slot in this cell (returns old count)
  let slot = atomicAdd(&cellCounts[cellIdx], 1u);

  // Only store if within max particles per cell
  if (slot < MAX_PARTICLES_PER_CELL) {
    cellParticles[cellIdx * MAX_PARTICLES_PER_CELL + slot] = idx;
  }
}
`;export{l as S,e as a,i as s};
