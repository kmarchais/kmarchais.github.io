/**
 * GPU-based Parallel Prefix Sum (Exclusive Scan)
 *
 * Work-efficient parallel scan using Blelloch algorithm.
 * Implemented as multi-pass for WebGPU without global synchronization.
 *
 * Three-pass algorithm for large arrays:
 * 1. localScan: Each workgroup scans its block, outputs block sums
 * 2. scanBlockSums: Scan the block sums (recursive if needed)
 * 3. addBlockSums: Add block prefix to each element in the block
 */

export const PREFIX_SUM_WORKGROUP_SIZE = 256;
export const PREFIX_SUM_ELEMENTS_PER_WORKGROUP = PREFIX_SUM_WORKGROUP_SIZE * 2;

/**
 * Calculate number of workgroups needed for prefix sum
 */
export function prefixSumWorkgroups(elementCount: number): number {
  return Math.ceil(elementCount / PREFIX_SUM_ELEMENTS_PER_WORKGROUP);
}

/**
 * Prefix sum shader - performs exclusive scan on u32 array
 *
 * Uses work-efficient Blelloch scan with up-sweep and down-sweep phases.
 * Each workgroup processes 2 * WORKGROUP_SIZE elements.
 */
export const prefixSumShader = /* wgsl */ `
const WORKGROUP_SIZE: u32 = ${PREFIX_SUM_WORKGROUP_SIZE}u;
const ELEMENTS_PER_WORKGROUP: u32 = ${PREFIX_SUM_ELEMENTS_PER_WORKGROUP}u;

struct PrefixSumParams {
  elementCount: u32,
  blockCount: u32,
  _padding1: u32,
  _padding2: u32,
}

@group(0) @binding(0) var<uniform> params: PrefixSumParams;
@group(0) @binding(1) var<storage, read> input: array<u32>;
@group(0) @binding(2) var<storage, read_write> output: array<u32>;
@group(0) @binding(3) var<storage, read_write> blockSums: array<u32>;

var<workgroup> sharedData: array<u32, ELEMENTS_PER_WORKGROUP>;

/**
 * Pass 1: Local scan within each workgroup
 * Each workgroup processes ELEMENTS_PER_WORKGROUP elements
 * Outputs the total sum of each block to blockSums
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn localScan(
  @builtin(global_invocation_id) global_id: vec3u,
  @builtin(local_invocation_id) local_id: vec3u,
  @builtin(workgroup_id) workgroup_id: vec3u
) {
  let tid = local_id.x;
  let blockIdx = workgroup_id.x;
  let blockOffset = blockIdx * ELEMENTS_PER_WORKGROUP;

  // Load two elements per thread into shared memory
  let idx1 = blockOffset + tid;
  let idx2 = blockOffset + tid + WORKGROUP_SIZE;

  sharedData[tid] = select(0u, input[idx1], idx1 < params.elementCount);
  sharedData[tid + WORKGROUP_SIZE] = select(0u, input[idx2], idx2 < params.elementCount);

  // Up-sweep (reduce) phase
  var offset: u32 = 1u;
  for (var d = ELEMENTS_PER_WORKGROUP >> 1u; d > 0u; d >>= 1u) {
    workgroupBarrier();
    if (tid < d) {
      let ai = offset * (2u * tid + 1u) - 1u;
      let bi = offset * (2u * tid + 2u) - 1u;
      sharedData[bi] += sharedData[ai];
    }
    offset <<= 1u;
  }

  // Store block sum and clear last element for exclusive scan
  if (tid == 0u) {
    blockSums[blockIdx] = sharedData[ELEMENTS_PER_WORKGROUP - 1u];
    sharedData[ELEMENTS_PER_WORKGROUP - 1u] = 0u;
  }

  // Down-sweep phase
  for (var d = 1u; d < ELEMENTS_PER_WORKGROUP; d <<= 1u) {
    offset >>= 1u;
    workgroupBarrier();
    if (tid < d) {
      let ai = offset * (2u * tid + 1u) - 1u;
      let bi = offset * (2u * tid + 2u) - 1u;
      let temp = sharedData[ai];
      sharedData[ai] = sharedData[bi];
      sharedData[bi] += temp;
    }
  }

  workgroupBarrier();

  // Write results to output
  if (idx1 < params.elementCount) {
    output[idx1] = sharedData[tid];
  }
  if (idx2 < params.elementCount) {
    output[idx2] = sharedData[tid + WORKGROUP_SIZE];
  }
}

/**
 * Pass 2: Scan block sums (for small number of blocks, single workgroup)
 * This is called when blockCount <= ELEMENTS_PER_WORKGROUP
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn scanBlockSums(
  @builtin(local_invocation_id) local_id: vec3u
) {
  let tid = local_id.x;

  // Load block sums into shared memory
  sharedData[tid] = select(0u, blockSums[tid], tid < params.blockCount);
  sharedData[tid + WORKGROUP_SIZE] = select(0u, blockSums[tid + WORKGROUP_SIZE], tid + WORKGROUP_SIZE < params.blockCount);

  // Up-sweep
  var offset: u32 = 1u;
  for (var d = ELEMENTS_PER_WORKGROUP >> 1u; d > 0u; d >>= 1u) {
    workgroupBarrier();
    if (tid < d) {
      let ai = offset * (2u * tid + 1u) - 1u;
      let bi = offset * (2u * tid + 2u) - 1u;
      if (bi < ELEMENTS_PER_WORKGROUP) {
        sharedData[bi] += sharedData[ai];
      }
    }
    offset <<= 1u;
  }

  // Clear last element
  if (tid == 0u) {
    sharedData[ELEMENTS_PER_WORKGROUP - 1u] = 0u;
  }

  // Down-sweep
  for (var d = 1u; d < ELEMENTS_PER_WORKGROUP; d <<= 1u) {
    offset >>= 1u;
    workgroupBarrier();
    if (tid < d) {
      let ai = offset * (2u * tid + 1u) - 1u;
      let bi = offset * (2u * tid + 2u) - 1u;
      if (bi < ELEMENTS_PER_WORKGROUP) {
        let temp = sharedData[ai];
        sharedData[ai] = sharedData[bi];
        sharedData[bi] += temp;
      }
    }
  }

  workgroupBarrier();

  // Write scanned block sums back
  if (tid < params.blockCount) {
    blockSums[tid] = sharedData[tid];
  }
  if (tid + WORKGROUP_SIZE < params.blockCount) {
    blockSums[tid + WORKGROUP_SIZE] = sharedData[tid + WORKGROUP_SIZE];
  }
}

/**
 * Pass 3: Add block prefix sums to each element
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn addBlockSums(
  @builtin(global_invocation_id) global_id: vec3u,
  @builtin(workgroup_id) workgroup_id: vec3u,
  @builtin(local_invocation_id) local_id: vec3u
) {
  let blockIdx = workgroup_id.x;
  let blockOffset = blockIdx * ELEMENTS_PER_WORKGROUP;
  let tid = local_id.x;

  // Load the prefix sum for this block
  var blockPrefix: u32 = 0u;
  if (blockIdx > 0u) {
    blockPrefix = blockSums[blockIdx];
  }

  // Add block prefix to each element
  let idx1 = blockOffset + tid;
  let idx2 = blockOffset + tid + WORKGROUP_SIZE;

  if (idx1 < params.elementCount) {
    output[idx1] += blockPrefix;
  }
  if (idx2 < params.elementCount) {
    output[idx2] += blockPrefix;
  }
}
`;

/**
 * Parameters buffer size for prefix sum
 * - elementCount: u32
 * - blockCount: u32
 * - padding: u32 x 2
 * Total: 16 bytes
 */
export const PREFIX_SUM_PARAMS_SIZE = 16;

export function createPrefixSumParamsBuffer(
  elementCount: number,
  blockCount: number
): ArrayBuffer {
  const buffer = new ArrayBuffer(PREFIX_SUM_PARAMS_SIZE);
  const u32View = new Uint32Array(buffer);

  u32View[0] = elementCount;
  u32View[1] = blockCount;
  u32View[2] = 0; // padding
  u32View[3] = 0; // padding

  return buffer;
}
