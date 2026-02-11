import{d as Ne,j as S,b as i,C as rt,i as st,f as at,G as ot,e as nt,S as lt,F as Se}from"./vendor-r3f-b9e513d9.js";import{r as x}from"./vendor-react-11ad1bf9.js";import{m as xe,a4 as ct,as as fe,B as ut,D as dt}from"./vendor-three-a8671fcb.js";import{F as ke,N as _e,C as pt,S as ft}from"./index-c8982a94.js";import{B as mt}from"./Breadcrumb-746ada9d.js";import"./vendor-ui-4807b111.js";import{g as ht,u as gt}from"./gpuCapabilities-6d047e77.js";import{W as bt}from"./WebGPUNotSupported-857de87f.js";import{d as yt,h as vt,w as De,u as Ge,b as xt,i as _t,e as Re,s as le,f as ce,c as Ee}from"./pipelineBuilder-ebda840f.js";import{a as Pt,S as Oe,s as St}from"./spatialHash-a3a691f9.js";import{g as wt}from"./marchingCubes-e878911d.js";const Ae=256,ze=80,Ct=`
// Workgroup size
const WORKGROUP_SIZE: u32 = ${Ae}u;

// Mathematical constants
const PI: f32 = 3.14159265359;

struct SPHParams {
  particleCount: u32,
  h: f32,              // Smoothing length
  restDensity: f32,    // Reference density (ρ₀)
  stiffness: f32,      // Pressure stiffness (k)
  viscosity: f32,      // Dynamic viscosity (μ)
  particleMass: f32,   // Particle mass
  dt: f32,             // Time step
  _padding: f32,
  gravity: vec3f,
  boxMin: vec3f,
  boxMax: vec3f,
}

// Main simulation buffers
@group(0) @binding(0) var<uniform> params: SPHParams;
@group(0) @binding(1) var<storage, read> positions_in: array<vec4f>;
@group(0) @binding(2) var<storage, read> velocities_in: array<vec4f>;
@group(0) @binding(3) var<storage, read_write> positions_out: array<vec4f>;
@group(0) @binding(4) var<storage, read_write> velocities_out: array<vec4f>;
@group(0) @binding(5) var<storage, read_write> densities: array<f32>;
@group(0) @binding(6) var<storage, read_write> pressures: array<f32>;
@group(0) @binding(7) var<storage, read_write> forces: array<vec4f>;

// Spatial hash parameters and buffers
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

@group(1) @binding(0) var<uniform> hashParams: SpatialHashParams;
@group(1) @binding(1) var<storage, read> cellIndices: array<u32>;
@group(1) @binding(2) var<storage, read> cellOffsets: array<u32>;
@group(1) @binding(3) var<storage, read> sortedIndices: array<u32>;

/**
 * Convert world position to grid cell coordinate
 */
fn positionToCell(pos: vec3f) -> vec3u {
  let gridMin = vec3f(hashParams.gridMinX, hashParams.gridMinY, hashParams.gridMinZ);
  let localPos = pos - gridMin;
  let cellCoord = vec3u(floor(localPos / hashParams.cellSize));
  return clamp(
    cellCoord,
    vec3u(0u),
    vec3u(hashParams.gridDimX - 1u, hashParams.gridDimY - 1u, hashParams.gridDimZ - 1u)
  );
}

/**
 * Convert 3D cell coordinate to 1D index
 */
fn cellToIndex(cell: vec3u) -> u32 {
  return cell.x + cell.y * hashParams.gridDimX + cell.z * hashParams.gridDimX * hashParams.gridDimY;
}

/**
 * Total number of cells
 */
fn numCells() -> u32 {
  return hashParams.gridDimX * hashParams.gridDimY * hashParams.gridDimZ;
}

// ============================================================================
// SPH Kernel Functions
// ============================================================================

/**
 * Poly6 Kernel - Used for density estimation
 * W(r, h) = 315 / (64 * π * h⁹) * (h² - r²)³  for r ≤ h
 *         = 0                                   for r > h
 */
fn kernelPoly6(r: f32, h: f32) -> f32 {
  if (r > h) {
    return 0.0;
  }
  let h2 = h * h;
  let r2 = r * r;
  let diff = h2 - r2;
  let coeff = 315.0 / (64.0 * PI * pow(h, 9.0));
  return coeff * diff * diff * diff;
}

/**
 * Spiky Kernel Gradient - Used for pressure forces
 * ∇W(r, h) = -45 / (π * h⁶) * (h - r)² * (r̂)  for r ≤ h
 * Returns the gradient magnitude (multiply by direction separately)
 */
fn kernelSpikyGrad(r: f32, h: f32) -> f32 {
  if (r > h || r < 0.0001) {
    return 0.0;
  }
  let diff = h - r;
  let coeff = -45.0 / (PI * pow(h, 6.0));
  return coeff * diff * diff;
}

/**
 * Viscosity Kernel Laplacian - Used for viscosity forces
 * ∇²W(r, h) = 45 / (π * h⁶) * (h - r)  for r ≤ h
 */
fn kernelViscosityLaplacian(r: f32, h: f32) -> f32 {
  if (r > h) {
    return 0.0;
  }
  let coeff = 45.0 / (PI * pow(h, 6.0));
  return coeff * (h - r);
}

// ============================================================================
// Boundary Handling
// ============================================================================

/**
 * Compute boundary force to keep particles inside the container
 * Uses a soft penalty force when particles approach walls
 */
fn boundaryForce(pos: vec3f, vel: vec3f) -> vec3f {
  var force = vec3f(0.0);
  let boundaryStiffness = params.stiffness * 10.0;
  let boundaryDamping = 0.5;
  let margin = params.h * 0.5;

  // X boundaries
  if (pos.x < params.boxMin.x + margin) {
    let penetration = params.boxMin.x + margin - pos.x;
    force.x += boundaryStiffness * penetration - boundaryDamping * vel.x;
  }
  if (pos.x > params.boxMax.x - margin) {
    let penetration = pos.x - (params.boxMax.x - margin);
    force.x -= boundaryStiffness * penetration + boundaryDamping * vel.x;
  }

  // Y boundaries (floor is most important)
  if (pos.y < params.boxMin.y + margin) {
    let penetration = params.boxMin.y + margin - pos.y;
    force.y += boundaryStiffness * penetration - boundaryDamping * vel.y;
  }
  if (pos.y > params.boxMax.y - margin) {
    let penetration = pos.y - (params.boxMax.y - margin);
    force.y -= boundaryStiffness * penetration + boundaryDamping * vel.y;
  }

  // Z boundaries
  if (pos.z < params.boxMin.z + margin) {
    let penetration = params.boxMin.z + margin - pos.z;
    force.z += boundaryStiffness * penetration - boundaryDamping * vel.z;
  }
  if (pos.z > params.boxMax.z - margin) {
    let penetration = pos.z - (params.boxMax.z - margin);
    force.z -= boundaryStiffness * penetration + boundaryDamping * vel.z;
  }

  return force;
}

// ============================================================================
// Compute Kernels
// ============================================================================

/**
 * Kernel 1: Compute density for each particle using spatial hash (O(N) neighbor search)
 * ρᵢ = Σⱼ mⱼ W(|rᵢ - rⱼ|, h)
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn computeDensity(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) {
    return;
  }

  let pos_i = positions_in[idx].xyz;
  var density = 0.0;

  // Self-contribution
  density += params.particleMass * kernelPoly6(0.0, params.h);

  // Get this particle's cell
  let cell = positionToCell(pos_i);

  // Iterate over neighbor cells (3x3x3 = 27 cells)
  for (var dz: i32 = -1; dz <= 1; dz++) {
    for (var dy: i32 = -1; dy <= 1; dy++) {
      for (var dx: i32 = -1; dx <= 1; dx++) {
        let nx = i32(cell.x) + dx;
        let ny = i32(cell.y) + dy;
        let nz = i32(cell.z) + dz;

        // Check bounds
        if (nx < 0 || nx >= i32(hashParams.gridDimX) ||
            ny < 0 || ny >= i32(hashParams.gridDimY) ||
            nz < 0 || nz >= i32(hashParams.gridDimZ)) {
          continue;
        }

        let neighborCell = vec3u(u32(nx), u32(ny), u32(nz));
        let cellIdx = cellToIndex(neighborCell);

        // Get range of particles in this cell
        let start = cellOffsets[cellIdx];
        let end = select(cellOffsets[cellIdx + 1u], params.particleCount, cellIdx + 1u >= numCells());

        // Check each particle in the cell
        for (var k = start; k < end; k++) {
          let j = sortedIndices[k];
          if (j == idx) {
            continue; // Already counted self
          }

          let pos_j = positions_in[j].xyz;
          let r_vec = pos_i - pos_j;
          let r = length(r_vec);

          density += params.particleMass * kernelPoly6(r, params.h);
        }
      }
    }
  }

  // Ensure minimum density (avoid division by zero)
  density = max(density, params.restDensity * 0.1);

  densities[idx] = density;
}

/**
 * Kernel 1 Direct: Compute density using O(N²) neighbor search (fallback)
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn computeDensityDirect(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) {
    return;
  }

  let pos_i = positions_in[idx].xyz;
  var density = 0.0;

  // Sum contributions from all particles (including self)
  for (var j = 0u; j < params.particleCount; j++) {
    let pos_j = positions_in[j].xyz;
    let r_vec = pos_i - pos_j;
    let r = length(r_vec);

    density += params.particleMass * kernelPoly6(r, params.h);
  }

  // Ensure minimum density (avoid division by zero)
  density = max(density, params.restDensity * 0.1);

  densities[idx] = density;
}

/**
 * Kernel 2: Compute pressure using Tait equation of state
 * p = k * ((ρ/ρ₀)^γ - 1)
 * Using γ = 7 (common for water-like fluids)
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn computePressure(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) {
    return;
  }

  let density = densities[idx];
  let gamma = 7.0;

  // Tait equation
  let densityRatio = density / params.restDensity;
  let pressure = params.stiffness * (pow(densityRatio, gamma) - 1.0);

  // Only allow positive pressure (repulsion) - no attraction when sparse
  pressures[idx] = max(pressure, 0.0);
}

/**
 * Kernel 3: Compute forces using spatial hash (O(N) neighbor search)
 *
 * Pressure force: Fᵢᵖ = -mᵢ Σⱼ mⱼ (pᵢ/ρᵢ² + pⱼ/ρⱼ²) ∇W(rᵢⱼ, h)
 * Viscosity force: Fᵢᵛ = μ mᵢ Σⱼ mⱼ (vⱼ - vᵢ)/ρⱼ ∇²W(rᵢⱼ, h)
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn computeForces(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) {
    return;
  }

  let pos_i = positions_in[idx].xyz;
  let vel_i = velocities_in[idx].xyz;
  let density_i = densities[idx];
  let pressure_i = pressures[idx];

  var pressure_force = vec3f(0.0);
  var viscosity_force = vec3f(0.0);

  // Precompute pressure term for particle i
  let pressure_term_i = pressure_i / (density_i * density_i);

  // Get this particle's cell
  let cell = positionToCell(pos_i);

  // Iterate over neighbor cells (3x3x3 = 27 cells)
  for (var dz: i32 = -1; dz <= 1; dz++) {
    for (var dy: i32 = -1; dy <= 1; dy++) {
      for (var dx: i32 = -1; dx <= 1; dx++) {
        let nx = i32(cell.x) + dx;
        let ny = i32(cell.y) + dy;
        let nz = i32(cell.z) + dz;

        // Check bounds
        if (nx < 0 || nx >= i32(hashParams.gridDimX) ||
            ny < 0 || ny >= i32(hashParams.gridDimY) ||
            nz < 0 || nz >= i32(hashParams.gridDimZ)) {
          continue;
        }

        let neighborCell = vec3u(u32(nx), u32(ny), u32(nz));
        let cellIdx = cellToIndex(neighborCell);

        // Get range of particles in this cell
        let start = cellOffsets[cellIdx];
        let end = select(cellOffsets[cellIdx + 1u], params.particleCount, cellIdx + 1u >= numCells());

        // Check each particle in the cell
        for (var k = start; k < end; k++) {
          let j = sortedIndices[k];
          if (j == idx) {
            continue;
          }

          let pos_j = positions_in[j].xyz;
          let vel_j = velocities_in[j].xyz;
          let density_j = densities[j];
          let pressure_j = pressures[j];

          let r_vec = pos_i - pos_j;
          let r = length(r_vec);

          if (r < params.h && r > 0.0001) {
            let r_norm = r_vec / r;

            // Pressure force (symmetric formulation)
            let pressure_term_j = pressure_j / (density_j * density_j);
            let pressure_kernel = kernelSpikyGrad(r, params.h);
            pressure_force += params.particleMass * (pressure_term_i + pressure_term_j) * pressure_kernel * r_norm;

            // Viscosity force
            let viscosity_kernel = kernelViscosityLaplacian(r, params.h);
            viscosity_force += params.particleMass * (vel_j - vel_i) / density_j * viscosity_kernel;
          }
        }
      }
    }
  }

  // Scale forces
  pressure_force *= -params.particleMass;
  viscosity_force *= params.viscosity * params.particleMass;

  // Gravity force
  let gravity_force = params.particleMass * params.gravity;

  // Boundary force
  let boundary_force = boundaryForce(pos_i, vel_i);

  // Total force
  let total_force = pressure_force + viscosity_force + gravity_force + boundary_force;

  forces[idx] = vec4f(total_force, 0.0);
}

/**
 * Kernel 3 Direct: Compute forces using O(N²) neighbor search (fallback)
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn computeForcesDirect(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) {
    return;
  }

  let pos_i = positions_in[idx].xyz;
  let vel_i = velocities_in[idx].xyz;
  let density_i = densities[idx];
  let pressure_i = pressures[idx];

  var pressure_force = vec3f(0.0);
  var viscosity_force = vec3f(0.0);

  // Precompute pressure term for particle i
  let pressure_term_i = pressure_i / (density_i * density_i);

  for (var j = 0u; j < params.particleCount; j++) {
    if (j == idx) {
      continue;
    }

    let pos_j = positions_in[j].xyz;
    let vel_j = velocities_in[j].xyz;
    let density_j = densities[j];
    let pressure_j = pressures[j];

    let r_vec = pos_i - pos_j;
    let r = length(r_vec);

    if (r < params.h && r > 0.0001) {
      let r_norm = r_vec / r;

      // Pressure force (symmetric formulation)
      let pressure_term_j = pressure_j / (density_j * density_j);
      let pressure_kernel = kernelSpikyGrad(r, params.h);
      pressure_force += params.particleMass * (pressure_term_i + pressure_term_j) * pressure_kernel * r_norm;

      // Viscosity force
      let viscosity_kernel = kernelViscosityLaplacian(r, params.h);
      viscosity_force += params.particleMass * (vel_j - vel_i) / density_j * viscosity_kernel;
    }
  }

  // Scale forces
  pressure_force *= -params.particleMass;
  viscosity_force *= params.viscosity * params.particleMass;

  // Gravity force
  let gravity_force = params.particleMass * params.gravity;

  // Boundary force
  let boundary_force = boundaryForce(pos_i, vel_i);

  // Total force
  let total_force = pressure_force + viscosity_force + gravity_force + boundary_force;

  forces[idx] = vec4f(total_force, 0.0);
}

/**
 * Kernel 4: Symplectic Euler integration
 * v(t+dt) = v(t) + a(t) * dt
 * x(t+dt) = x(t) + v(t+dt) * dt
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn integrate(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) {
    return;
  }

  let pos = positions_in[idx];
  let vel = velocities_in[idx].xyz;
  let force = forces[idx].xyz;
  let density = densities[idx];

  // Acceleration (F = ma, so a = F/m)
  let acc = force / params.particleMass;

  // Update velocity
  var new_vel = vel + acc * params.dt;

  // Velocity damping for stability
  let maxSpeed = 10.0;
  let speed = length(new_vel);
  if (speed > maxSpeed) {
    new_vel = new_vel * (maxSpeed / speed);
  }

  // Update position
  var new_pos = pos.xyz + new_vel * params.dt;

  // Hard boundary clamp (safety)
  let margin = params.h * 0.25;
  new_pos = clamp(new_pos, params.boxMin + margin, params.boxMax - margin);

  // Store results (keep mass/w component)
  positions_out[idx] = vec4f(new_pos, pos.w);
  velocities_out[idx] = vec4f(new_vel, density); // Store density in w for visualization
}

/**
 * Alternative: Leapfrog integration (more accurate for long simulations)
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn integrateLeapfrog(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) {
    return;
  }

  let pos = positions_in[idx];
  let vel = velocities_in[idx].xyz;
  let force = forces[idx].xyz;
  let density = densities[idx];

  // Acceleration
  let acc = force / params.particleMass;

  // Leapfrog: v(t + dt/2) = v(t - dt/2) + a(t) * dt
  // For first step, assume v_in is at t-dt/2
  var new_vel = vel + acc * params.dt;

  // Velocity limit
  let maxSpeed = 15.0;
  let speed = length(new_vel);
  if (speed > maxSpeed) {
    new_vel = new_vel * (maxSpeed / speed);
  }

  // Position: x(t + dt) = x(t) + v(t + dt/2) * dt
  var new_pos = pos.xyz + new_vel * params.dt;

  // Hard boundary clamp
  let margin = params.h * 0.25;
  new_pos = clamp(new_pos, params.boxMin + margin, params.boxMax - margin);

  positions_out[idx] = vec4f(new_pos, pos.w);
  velocities_out[idx] = vec4f(new_vel, density);
}
`,We=256,Te=We*2;function Fe(t){return Math.ceil(t/Te)}const Mt=`
const WORKGROUP_SIZE: u32 = ${We}u;
const ELEMENTS_PER_WORKGROUP: u32 = ${Te}u;

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
`,je=16;function Bt(t,e){const a=new ArrayBuffer(je),r=new Uint32Array(a);return r[0]=t,r[1]=e,r[2]=0,r[3]=0,a}const Ze=4,He=64;function kt(t){const e=new ArrayBuffer(He),a=new Uint32Array(e),r=new Float32Array(e);return a[0]=t.gridDimX,a[1]=t.gridDimY,a[2]=t.gridDimZ,a[3]=0,r[4]=t.gridMin[0],r[5]=t.gridMin[1],r[6]=t.gridMin[2],r[7]=0,r[8]=t.gridMax[0],r[9]=t.gridMax[1],r[10]=t.gridMax[2],r[11]=0,r[12]=t.smoothingRadius,a[13]=t.particleCount,r[14]=0,r[15]=0,e}const Dt=`
// Workgroup size for 3D dispatch
const WG_SIZE: u32 = ${Ze}u;

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
`;function Gt(t,e){const a=new Float32Array(t*4),r=new Float32Array(t*4),d=e.boxSize[0]*.4,g=e.boxSize[1]*.8,y=e.boxSize[2]*.9,B=d*g*y,o=Math.cbrt(B/t),c=Math.ceil(d/o),_=Math.ceil(g/o),P=Math.ceil(y/o),v=e.boxSize[0]/2,R=e.boxSize[2]/2;let p=0;for(let m=0;m<_&&p<t;m++)for(let C=0;C<P&&p<t;C++)for(let h=0;h<c&&p<t;h++){const l=-v+o*.5+h*o,n=o*.5+m*o,f=-R+(e.boxSize[2]-y)/2+C*o,s=o*.05;a[p*4]=l+(Math.random()-.5)*s,a[p*4+1]=n+(Math.random()-.5)*s,a[p*4+2]=f+(Math.random()-.5)*s,a[p*4+3]=1,r[p*4]=0,r[p*4+1]=0,r[p*4+2]=0,r[p*4+3]=0,p++}return{positions:a,velocities:r}}function Rt(t,e){const a=new Float32Array(t*4),r=new Float32Array(t*4),d=e.smoothingLength/2,g=Math.cbrt(3*t*Math.pow(d,3)/(4*Math.PI)),y=e.boxSize[1]*.7,B=(1+Math.sqrt(5))/2;for(let o=0;o<t;o++){const c=2*Math.PI*o/B,_=Math.acos(1-2*(o+.5)/t),P=g*Math.cbrt(Math.random()),v=P*Math.sin(_)*Math.cos(c),R=P*Math.cos(_)+y,p=P*Math.sin(_)*Math.sin(c);a[o*4]=v,a[o*4+1]=R,a[o*4+2]=p,a[o*4+3]=1,r[o*4]=0,r[o*4+1]=-1,r[o*4+2]=0,r[o*4+3]=0}return{positions:a,velocities:r}}function Et(t,e){const a=new Float32Array(t*4),r=new Float32Array(t*4),d=Math.floor(t/2),g=e.boxSize[0]*.2,y=e.boxSize[1]*.6,B=e.boxSize[2]*.8,o=2*g*y*B;let c=Math.cbrt(o/t)*.95,_,P,v;do _=Math.floor(g/c),P=Math.floor(y/c),v=Math.floor(B/c),2*_*P*v<t&&(c*=.95);while(2*_*P*v<t);const R=e.boxSize[0]/2,p=e.boxSize[2]/2;let m=0;for(let C=0;C<P&&m<d;C++)for(let h=0;h<v&&m<d;h++)for(let l=0;l<_&&m<d;l++){const n=-R+c+l*c,f=c+C*c,s=-p+(e.boxSize[2]-B)/2+h*c,u=c*.1;a[m*4]=n+(Math.random()-.5)*u,a[m*4+1]=f+(Math.random()-.5)*u,a[m*4+2]=s+(Math.random()-.5)*u,a[m*4+3]=1,r[m*4]=0,r[m*4+1]=0,r[m*4+2]=0,r[m*4+3]=0,m++}for(let C=0;C<P&&m<t;C++)for(let h=0;h<v&&m<t;h++)for(let l=0;l<_&&m<t;l++){const n=R-g-c+l*c,f=c+C*c,s=-p+(e.boxSize[2]-B)/2+h*c,u=c*.1;a[m*4]=n+(Math.random()-.5)*u,a[m*4+1]=f+(Math.random()-.5)*u,a[m*4+2]=s+(Math.random()-.5)*u,a[m*4+3]=1,r[m*4]=0,r[m*4+1]=0,r[m*4+2]=0,r[m*4+3]=0,m++}return{positions:a,velocities:r}}function Ot(t,e){const a=new Float32Array(t*4),r=new Float32Array(t*4),d=e.boxSize[0]*.3,g=e.boxSize[2]*.3,y=e.boxSize[1]*.6,B=d*y*g;let o=Math.cbrt(B/t)*.95,c,_,P;do c=Math.floor(d/o),_=Math.floor(y/o),P=Math.floor(g/o),c*_*P<t&&(o*=.95);while(c*_*P<t);let v=0;for(let R=0;R<_&&v<t;R++)for(let p=0;p<P&&v<t;p++)for(let m=0;m<c&&v<t;m++){const C=-d/2+m*o,h=e.boxSize[1]*.3+R*o,l=-g/2+p*o,n=o*.1;a[v*4]=C+(Math.random()-.5)*n,a[v*4+1]=h+(Math.random()-.5)*n,a[v*4+2]=l+(Math.random()-.5)*n,a[v*4+3]=1,r[v*4]=0,r[v*4+1]=-2,r[v*4+2]=0,r[v*4+3]=0,v++}return{positions:a,velocities:r}}function zt(t,e){const a=new Float32Array(t*4),r=new Float32Array(t*4),d=Math.ceil(Math.cbrt(t)),g=Math.min(e.boxSize[0],e.boxSize[2])*.6,y=g/d,B=g/2;let o=0;for(let c=0;c<d&&o<t;c++)for(let _=0;_<d&&o<t;_++)for(let P=0;P<d&&o<t;P++){const v=-B+P*y+y/2,R=e.boxSize[1]*.5+c*y,p=-B+_*y+y/2,m=y*.05;a[o*4]=v+(Math.random()-.5)*m,a[o*4+1]=R+(Math.random()-.5)*m,a[o*4+2]=p+(Math.random()-.5)*m,a[o*4+3]=1,r[o*4]=0,r[o*4+1]=0,r[o*4+2]=0,r[o*4+3]=0,o++}return{positions:a,velocities:r}}function Ft(t,e){const a=new Float32Array(t*4),r=new Float32Array(t*4),d=e.boxSize[0]*.9,g=e.boxSize[1]*.3,y=e.boxSize[2]*.9,B=d*g*y;let o=Math.cbrt(B/t)*.95,c,_,P;do c=Math.floor(d/o),_=Math.floor(g/o),P=Math.floor(y/o),c*_*P<t&&(o*=.95);while(c*_*P<t);const v=e.boxSize[0]/2,R=e.boxSize[2]/2;let p=0;for(let m=0;m<_&&p<t;m++)for(let C=0;C<P&&p<t;C++)for(let h=0;h<c&&p<t;h++){const l=-v+(e.boxSize[0]-d)/2+h*o,n=o+m*o,f=-R+(e.boxSize[2]-y)/2+C*o,s=o*.1;a[p*4]=l+(Math.random()-.5)*s,a[p*4+1]=n+(Math.random()-.5)*s,a[p*4+2]=f+(Math.random()-.5)*s,a[p*4+3]=1;const u=Math.sin(l/d*Math.PI*2);r[p*4]=u*2,r[p*4+1]=0,r[p*4+2]=0,r[p*4+3]=0,p++}return{positions:a,velocities:r}}const me={damBreak:{name:"Dam Break",description:"Classic dam break scenario",generator:Gt},droplet:{name:"Droplet",description:"Falling water droplet",generator:Rt},doubleDam:{name:"Double Dam",description:"Two colliding water columns",generator:Et},waterfall:{name:"Waterfall",description:"Particles streaming down",generator:Ot},cube:{name:"Cube",description:"Simple cube of fluid",generator:zt},wave:{name:"Wave Pool",description:"Pool with initial wave motion",generator:Ft}},Ut={damBreak:"Dam Break",droplet:"Droplet",doubleDam:"Double Dam",waterfall:"Waterfall",cube:"Cube",wave:"Wave Pool"},It={particleCount:1e3,smoothingLength:.22,restDensity:1e3,stiffness:50,viscosity:.1,particleMass:1.3,gravity:-9.81,dt:.001,preset:"damBreak",boxSize:[1.5,2,1.5],useSpatialHash:!0};function Lt(t,e){return[Math.ceil(t[0]/e)+2,Math.ceil(t[1]/e)+2,Math.ceil(t[2]/e)+2]}function Nt(t={}){const e=x.useRef({device:null,buffers:null,hashBuffers:null,hashParams:null,densityPipeline:null,densityDirectPipeline:null,pressurePipeline:null,forcesPipeline:null,forcesDirectPipeline:null,integratePipeline:null,hashPipelines:null,prefixSumPipelines:null,prefixSumBuffers:null,prefixSumBindGroupLayout:null,fieldComputePipeline:null,fieldComputeDirectPipeline:null,fieldComputeBindGroupLayout:null,fieldComputeHashBindGroupLayout:null,fieldBuffers:null,fieldComputeInProgress:!1,bindGroupLayout:null,hashBindGroupLayout:null,pingPongBindGroups:null,gridDimensions:[1,1,1],gridMin:[0,0,0],cellSize:.2,pingPong:!1,config:{...It,...t}}),[a,r]=x.useState({running:!1,frame:0,time:0,initialized:!1,error:null}),[d,g]=x.useState(null),[y,B]=x.useState(null),o=x.useRef(0),c=x.useRef(!1),_=x.useCallback(n=>{const f=new ArrayBuffer(ze),s=new Uint32Array(f),u=new Float32Array(f),D=n.boxSize.map(G=>G/2);return s[0]=n.particleCount,u[1]=n.smoothingLength,u[2]=n.restDensity,u[3]=n.stiffness,u[4]=n.viscosity,u[5]=n.particleMass,u[6]=n.dt,u[7]=0,u[8]=0,u[9]=n.gravity,u[10]=0,u[11]=0,u[12]=-D[0],u[13]=0,u[14]=-D[2],u[15]=0,u[16]=D[0],u[17]=n.boxSize[1],u[18]=D[2],u[19]=0,f},[]),P=x.useCallback((n,f,s,u)=>{const D=new ArrayBuffer(Oe),G=new Uint32Array(D),O=new Float32Array(D);return G[0]=n.particleCount,G[1]=f[0],G[2]=f[1],G[3]=f[2],O[4]=u,O[5]=s[0],O[6]=s[1],O[7]=s[2],D},[]);x.useEffect(()=>{let n=!0;return(async()=>{try{const s=await ht();if(!s){n&&r(ne=>({...ne,error:"WebGPU not available"}));return}if(!n){s.destroy();return}e.current.device=s;const u=e.current.config,D=u.boxSize.map(ne=>ne/2),G=u.smoothingLength,O=Lt(u.boxSize,G),j=[-D[0]-G,-G,-D[2]-G];e.current.gridDimensions=O,e.current.gridMin=j,e.current.cellSize=G;const K=xt(s,u.particleCount,ze),M=s.createBuffer({size:u.particleCount*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"densities"}),w=s.createBuffer({size:u.particleCount*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"pressures"}),k={...K,densities:M,pressures:w};e.current.buffers=k;const b=_t(s,u.particleCount,O);e.current.hashBuffers=b;const N=s.createBuffer({size:Oe,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"spatial_hash_params"});e.current.hashParams=N;const X=P(u,O,j,G);s.queue.writeBuffer(N,0,X);const q=(me[u.preset]||me.damBreak).generator(u.particleCount,u);Ge(s,k,q.positions,q.velocities);const re=_(u);s.queue.writeBuffer(k.params,0,re);const U=[Re(0),le(1),le(2),ce(3),ce(4),ce(5),ce(6),ce(7)],se=[Re(0),le(1),le(2),le(3)],E=s.createBindGroupLayout({entries:U,label:"sph_main_bind_group_layout"});e.current.bindGroupLayout=E;const H=s.createBindGroupLayout({entries:se,label:"sph_hash_bind_group_layout"});e.current.hashBindGroupLayout=H;const z=s.createPipelineLayout({bindGroupLayouts:[E,H],label:"sph_combined_pipeline_layout"}),L=s.createPipelineLayout({bindGroupLayouts:[E],label:"sph_main_only_pipeline_layout"}),F=s.createShaderModule({code:Ct,label:"sph_shader"}),V=s.createComputePipeline({layout:z,compute:{module:F,entryPoint:"computeDensity"},label:"sph_density"}),Y=s.createComputePipeline({layout:z,compute:{module:F,entryPoint:"computeForces"},label:"sph_forces"}),ge=s.createComputePipeline({layout:L,compute:{module:F,entryPoint:"computeDensityDirect"},label:"sph_density_direct"}),pe=s.createComputePipeline({layout:L,compute:{module:F,entryPoint:"computeForcesDirect"},label:"sph_forces_direct"}),I=s.createComputePipeline({layout:L,compute:{module:F,entryPoint:"computePressure"},label:"sph_pressure"}),A=s.createComputePipeline({layout:L,compute:{module:F,entryPoint:"integrate"},label:"sph_integrate"});e.current.densityPipeline=V,e.current.densityDirectPipeline=ge,e.current.pressurePipeline=I,e.current.forcesPipeline=Y,e.current.forcesDirectPipeline=pe,e.current.integratePipeline=A;const W=s.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:4,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:5,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}}],label:"spatial_hash_bind_group_layout"}),T=s.createPipelineLayout({bindGroupLayouts:[W],label:"spatial_hash_pipeline_layout"}),$=s.createShaderModule({code:St,label:"spatial_hash_shader"}),ae=s.createComputePipeline({layout:T,compute:{module:$,entryPoint:"computeCellIndices"},label:"compute_cell_indices"}),te=s.createComputePipeline({layout:T,compute:{module:$,entryPoint:"resetCellCounts"},label:"reset_cell_counts"}),oe=s.createComputePipeline({layout:T,compute:{module:$,entryPoint:"sortParticles"},label:"sort_particles"});e.current.hashPipelines={computeCellIndices:ae,resetCellCounts:te,sortParticles:oe};const Q=b.numCells,ie=Fe(Q),J=s.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}}],label:"prefix_sum_bind_group_layout"});e.current.prefixSumBindGroupLayout=J;const ee=s.createPipelineLayout({bindGroupLayouts:[J],label:"prefix_sum_pipeline_layout"}),be=s.createShaderModule({code:Mt,label:"prefix_sum_shader"}),Ve=s.createComputePipeline({layout:ee,compute:{module:be,entryPoint:"localScan"},label:"prefix_sum_local_scan"}),Ke=s.createComputePipeline({layout:ee,compute:{module:be,entryPoint:"scanBlockSums"},label:"prefix_sum_scan_block_sums"}),Ye=s.createComputePipeline({layout:ee,compute:{module:be,entryPoint:"addBlockSums"},label:"prefix_sum_add_block_sums"});e.current.prefixSumPipelines={localScan:Ve,scanBlockSums:Ke,addBlockSums:Ye};const ye=s.createBuffer({size:je,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"prefix_sum_params"}),we=s.createBuffer({size:Math.max(ie,1)*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"prefix_sum_block_sums"});e.current.prefixSumBuffers={params:ye,blockSums:we};const Xe=Bt(Q,ie);s.queue.writeBuffer(ye,0,Xe);const ve=s.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:4,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:5,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:6,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}}],label:"field_compute_bind_group_layout"}),Ce=s.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}}],label:"field_compute_hash_bind_group_layout"});e.current.fieldComputeBindGroupLayout=ve,e.current.fieldComputeHashBindGroupLayout=Ce;const Me=s.createShaderModule({code:Dt,label:"field_compute_shader"}),qe=s.createPipelineLayout({bindGroupLayouts:[ve,Ce],label:"field_compute_combined_pipeline_layout"}),$e=s.createPipelineLayout({bindGroupLayouts:[ve],label:"field_compute_main_only_pipeline_layout"});e.current.fieldComputePipeline=s.createComputePipeline({layout:qe,compute:{module:Me,entryPoint:"computeFields"},label:"field_compute_pipeline"}),e.current.fieldComputeDirectPipeline=s.createComputePipeline({layout:$e,compute:{module:Me,entryPoint:"computeFieldsDirect"},label:"field_compute_direct_pipeline"});const Qe=Ee(s,E,[{binding:0,resource:{buffer:k.params}},{binding:1,resource:{buffer:k.positionsA}},{binding:2,resource:{buffer:k.velocitiesA}},{binding:3,resource:{buffer:k.positionsB}},{binding:4,resource:{buffer:k.velocitiesB}},{binding:5,resource:{buffer:k.densities}},{binding:6,resource:{buffer:k.pressures}},{binding:7,resource:{buffer:k.forces}}]),Je=Ee(s,E,[{binding:0,resource:{buffer:k.params}},{binding:1,resource:{buffer:k.positionsB}},{binding:2,resource:{buffer:k.velocitiesB}},{binding:3,resource:{buffer:k.positionsA}},{binding:4,resource:{buffer:k.velocitiesA}},{binding:5,resource:{buffer:k.densities}},{binding:6,resource:{buffer:k.pressures}},{binding:7,resource:{buffer:k.forces}}]),et=s.createBindGroup({layout:W,entries:[{binding:0,resource:{buffer:N}},{binding:1,resource:{buffer:k.positionsA}},{binding:2,resource:{buffer:b.cellIndices}},{binding:3,resource:{buffer:b.cellCounts}},{binding:4,resource:{buffer:b.cellOffsets}},{binding:5,resource:{buffer:b.sortedIndices}}],label:"hash_build_bind_group_a"}),tt=s.createBindGroup({layout:W,entries:[{binding:0,resource:{buffer:N}},{binding:1,resource:{buffer:k.positionsB}},{binding:2,resource:{buffer:b.cellIndices}},{binding:3,resource:{buffer:b.cellCounts}},{binding:4,resource:{buffer:b.cellOffsets}},{binding:5,resource:{buffer:b.sortedIndices}}],label:"hash_build_bind_group_b"}),Be=s.createBindGroup({layout:H,entries:[{binding:0,resource:{buffer:N}},{binding:1,resource:{buffer:b.cellIndices}},{binding:2,resource:{buffer:b.cellOffsets}},{binding:3,resource:{buffer:b.sortedIndices}}],label:"hash_query_bind_group"}),it=s.createBindGroup({layout:J,entries:[{binding:0,resource:{buffer:ye}},{binding:1,resource:{buffer:b.cellCounts}},{binding:2,resource:{buffer:b.cellOffsets}},{binding:3,resource:{buffer:we}}],label:"prefix_sum_bind_group"});e.current.pingPongBindGroups={mainA:Qe,mainB:Je,hashBuildA:et,hashBuildB:tt,hashQueryA:Be,hashQueryB:Be,prefixSum:it},g(new Float32Array(q.positions)),B(new Float32Array(q.velocities)),n&&r(ne=>({...ne,initialized:!0}))}catch(s){n&&r(u=>({...u,error:s instanceof Error?s.message:"Unknown error"}))}})(),()=>{n=!1,e.current.buffers&&(yt(e.current.buffers),e.current.buffers.densities.destroy(),e.current.buffers.pressures.destroy()),e.current.hashBuffers&&vt(e.current.hashBuffers),e.current.hashParams&&e.current.hashParams.destroy(),e.current.prefixSumBuffers&&(e.current.prefixSumBuffers.params.destroy(),e.current.prefixSumBuffers.blockSums.destroy()),e.current.fieldBuffers&&(e.current.fieldBuffers.params.destroy(),e.current.fieldBuffers.densityField.destroy(),e.current.fieldBuffers.velocityFieldX.destroy(),e.current.fieldBuffers.velocityFieldY.destroy(),e.current.fieldBuffers.velocityFieldZ.destroy(),e.current.fieldBuffers.staging.destroy()),e.current.device&&e.current.device.destroy()}},[_,P]),Ne(()=>{const{device:n,buffers:f,hashBuffers:s,hashParams:u,densityPipeline:D,densityDirectPipeline:G,pressurePipeline:O,forcesPipeline:j,forcesDirectPipeline:K,integratePipeline:M,hashPipelines:w,hashBindGroupLayout:k,pingPongBindGroups:b,config:N}=e.current;if(!n||!f||!D||!G||!O||!j||!K||!M||!b||!a.running)return;const{prefixSumPipelines:X,prefixSumBuffers:de,prefixSumBindGroupLayout:q}=e.current,re=N.useSpatialHash&&s&&u&&w&&k&&X&&de&&q,U=De(N.particleCount,Ae),se=re?De(s.numCells,Pt):0,E=n.createCommandEncoder(),H=e.current.pingPong,z=H?b.mainB:b.mainA,L=H?b.hashBuildB:b.hashBuildA,F=H?b.hashQueryB:b.hashQueryA;if(re){const I=Fe(s.numCells),A=E.beginComputePass();A.setPipeline(w.resetCellCounts),A.setBindGroup(0,L),A.dispatchWorkgroups(se),A.end();const W=E.beginComputePass();W.setPipeline(w.computeCellIndices),W.setBindGroup(0,L),W.dispatchWorkgroups(U),W.end();const T=E.beginComputePass();if(T.setPipeline(X.localScan),T.setBindGroup(0,b.prefixSum),T.dispatchWorkgroups(I),T.end(),I>1){const J=E.beginComputePass();J.setPipeline(X.scanBlockSums),J.setBindGroup(0,b.prefixSum),J.dispatchWorkgroups(1),J.end();const ee=E.beginComputePass();ee.setPipeline(X.addBlockSums),ee.setBindGroup(0,b.prefixSum),ee.dispatchWorkgroups(I),ee.end()}const $=E.beginComputePass();$.setPipeline(w.resetCellCounts),$.setBindGroup(0,L),$.dispatchWorkgroups(se),$.end();const ae=E.beginComputePass();ae.setPipeline(w.sortParticles),ae.setBindGroup(0,L),ae.dispatchWorkgroups(U),ae.end();const te=E.beginComputePass();te.setPipeline(D),te.setBindGroup(0,z),te.setBindGroup(1,F),te.dispatchWorkgroups(U),te.end();const oe=E.beginComputePass();oe.setPipeline(O),oe.setBindGroup(0,z),oe.dispatchWorkgroups(U),oe.end();const Q=E.beginComputePass();Q.setPipeline(j),Q.setBindGroup(0,z),Q.setBindGroup(1,F),Q.dispatchWorkgroups(U),Q.end();const ie=E.beginComputePass();ie.setPipeline(M),ie.setBindGroup(0,z),ie.dispatchWorkgroups(U),ie.end()}else{const I=E.beginComputePass();I.setPipeline(G),I.setBindGroup(0,z),I.dispatchWorkgroups(U),I.end();const A=E.beginComputePass();A.setPipeline(O),A.setBindGroup(0,z),A.dispatchWorkgroups(U),A.end();const W=E.beginComputePass();W.setPipeline(K),W.setBindGroup(0,z),W.dispatchWorkgroups(U),W.end();const T=E.beginComputePass();T.setPipeline(M),T.setBindGroup(0,z),T.dispatchWorkgroups(U),T.end()}const V=!H;e.current.pingPong=V;const Y=V?f.positionsB:f.positionsA,ge=V?f.velocitiesB:f.velocitiesA;o.current+=1;const pe=!c.current;pe&&(E.copyBufferToBuffer(Y,0,f.stagingPositions,0,N.particleCount*16),E.copyBufferToBuffer(ge,0,f.stagingVelocities,0,N.particleCount*16)),n.queue.submit([E.finish()]),pe&&(c.current=!0,Promise.all([f.stagingPositions.mapAsync(GPUMapMode.READ),f.stagingVelocities.mapAsync(GPUMapMode.READ)]).then(()=>{const I=new Float32Array(f.stagingPositions.getMappedRange().slice(0)),A=new Float32Array(f.stagingVelocities.getMappedRange().slice(0));f.stagingPositions.unmap(),f.stagingVelocities.unmap(),g(I),B(A),c.current=!1}).catch(()=>{c.current=!1})),r(I=>({...I,frame:I.frame+1,time:I.time+N.dt}))});const v=x.useCallback(()=>{r(n=>({...n,running:!0}))},[]),R=x.useCallback(()=>{r(n=>({...n,running:!1}))},[]),p=x.useCallback(()=>{r(n=>({...n,running:!n.running}))},[]),m=x.useCallback(()=>{const{device:n,buffers:f,config:s}=e.current;if(!n||!f)return;const D=(me[s.preset]||me.damBreak).generator(s.particleCount,s);Ge(n,f,D.positions,D.velocities),e.current.pingPong=!1,o.current=0,g(new Float32Array(D.positions)),B(new Float32Array(D.velocities)),r(G=>({...G,frame:0,time:0}))},[]),C=x.useCallback(n=>{const{device:f,buffers:s,config:u}=e.current;e.current.config={...u,...n};const D=e.current.config;if(f&&s){const G=_(D);f.queue.writeBuffer(s.params,0,G)}},[_]),h=x.useCallback(async n=>{const{device:f,buffers:s,hashBuffers:u,hashParams:D,fieldComputePipeline:G,fieldComputeBindGroupLayout:O,fieldComputeHashBindGroupLayout:j,config:K,pingPong:M}=e.current;if(e.current.fieldComputeInProgress||!f||!s||!u||!D||!G||!O||!j)return null;e.current.fieldComputeInProgress=!0;try{const w=n.gridResolution,k=w*w*w;let b=e.current.fieldBuffers;if(!b||b.gridResolution!==w){b&&(b.params.destroy(),b.densityField.destroy(),b.velocityFieldX.destroy(),b.velocityFieldY.destroy(),b.velocityFieldZ.destroy(),b.staging.destroy());const Y=k*4;b={params:f.createBuffer({size:He,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"field_compute_params"}),densityField:f.createBuffer({size:Y,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC,label:"density_field"}),velocityFieldX:f.createBuffer({size:Y,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC,label:"velocity_field_x"}),velocityFieldY:f.createBuffer({size:Y,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC,label:"velocity_field_y"}),velocityFieldZ:f.createBuffer({size:Y,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC,label:"velocity_field_z"}),staging:f.createBuffer({size:Y*4,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST,label:"field_staging"}),gridResolution:w,totalCells:k},e.current.fieldBuffers=b}const N=kt({gridDimX:w,gridDimY:w,gridDimZ:w,gridMin:n.bounds.min,gridMax:n.bounds.max,smoothingRadius:K.smoothingLength,particleCount:K.particleCount});f.queue.writeBuffer(b.params,0,N);const X=M?s.positionsA:s.positionsB,de=M?s.velocitiesA:s.velocitiesB,q=f.createBindGroup({layout:O,entries:[{binding:0,resource:{buffer:b.params}},{binding:1,resource:{buffer:X}},{binding:2,resource:{buffer:de}},{binding:3,resource:{buffer:b.densityField}},{binding:4,resource:{buffer:b.velocityFieldX}},{binding:5,resource:{buffer:b.velocityFieldY}},{binding:6,resource:{buffer:b.velocityFieldZ}}],label:"field_compute_main_bind_group"}),re=f.createBindGroup({layout:j,entries:[{binding:0,resource:{buffer:D}},{binding:1,resource:{buffer:u.cellIndices}},{binding:2,resource:{buffer:u.cellOffsets}},{binding:3,resource:{buffer:u.sortedIndices}}],label:"field_compute_hash_bind_group"}),U=Ze,se=Math.ceil(w/U),E=Math.ceil(w/U),H=Math.ceil(w/U),z=f.createCommandEncoder(),L=z.beginComputePass();L.setPipeline(G),L.setBindGroup(0,q),L.setBindGroup(1,re),L.dispatchWorkgroups(se,E,H),L.end();const F=k*4;z.copyBufferToBuffer(b.densityField,0,b.staging,0,F),z.copyBufferToBuffer(b.velocityFieldX,0,b.staging,F,F),z.copyBufferToBuffer(b.velocityFieldY,0,b.staging,F*2,F),z.copyBufferToBuffer(b.velocityFieldZ,0,b.staging,F*3,F),f.queue.submit([z.finish()]),await b.staging.mapAsync(GPUMapMode.READ);const V=new Float32Array(b.staging.getMappedRange().slice(0));return b.staging.unmap(),e.current.fieldComputeInProgress=!1,{density:V.slice(0,k),velocityX:V.slice(k,k*2),velocityY:V.slice(k*2,k*3),velocityZ:V.slice(k*3,k*4),gridResolution:w}}catch(w){return e.current.fieldComputeInProgress=!1,console.error("Field computation failed:",w),null}},[]);return[a,{start:v,pause:R,toggle:p,reset:m,updateConfig:C,computeFields:h},d,y,e.current.config]}function At({colormap:t,min:e,max:a,label:r}){const d=x.useMemo(()=>{const g={0:["#440154","#482777","#3F4A8A","#31678D","#26838E","#1F9E89","#35B778","#6DCD59","#B4DD2C","#FDE724"],1:["#0D0887","#47039F","#7301A8","#9C179E","#BD3786","#D8576B","#ED7953","#FA9E3B","#FDC328","#F0F921"],2:["#30123B","#4662D7","#35ABE8","#1AE4B6","#72FE5E","#C8EF34","#FCCE2E","#F98E09","#D65F0E","#7A0403"],3:["#3B4CC0","#6788EE","#9ABBFF","#C9D7F0","#EDDBD5","#F6BDA2","#F18E6F","#D95847","#B40426"],4:["#A50026","#D73027","#F46D43","#FDAE61","#FEE090","#FFFFBF","#E0F3F8","#ABD9E9","#74ADD1","#4575B4","#313695"]},y=g[t]||g[0];return{background:`linear-gradient(to top, ${y.map((o,c)=>`${o} ${c/(y.length-1)*100}%`).join(", ")})`}},[t]);return S("div",{className:"absolute bottom-8 right-[328px] z-30 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-lg p-3",children:[S("div",{className:"flex flex-col items-center gap-1",children:[i("span",{className:"text-white text-xs font-mono",children:a.toFixed(2)}),i("div",{className:"w-5 h-40 rounded",style:d}),i("span",{className:"text-white text-xs font-mono",children:e.toFixed(2)})]}),i("div",{className:"flex items-center justify-center h-40",children:i("span",{className:"text-white text-sm -rotate-90 whitespace-nowrap",children:r})})]})}function Wt({size:t}){return S("mesh",{position:[0,t[1]/2,0],children:[i("boxGeometry",{args:[t[0],t[1],t[2]]}),i("meshStandardMaterial",{color:"#4488ff",opacity:.15,transparent:!0,side:ct,depthWrite:!1})]})}function Tt({size:t}){return i("gridHelper",{args:[Math.max(t[0],t[2]),Math.max(t[0],t[2])],position:[0,.001,0],children:i("meshBasicMaterial",{color:"#446688",opacity:.5,transparent:!0})})}function Z({label:t,value:e,min:a,max:r,step:d,onChange:g,unit:y=""}){const B=d<1?Math.max(2,-Math.floor(Math.log10(d))):0,o=(e-a)/(r-a)*100;return S("div",{className:"group",children:[S("div",{className:"flex items-center justify-between mb-1.5",children:[i("span",{className:"text-[11px] text-white/60 font-medium uppercase tracking-wide",children:t}),S("span",{className:"text-xs text-white font-mono bg-white/10 px-1.5 py-0.5 rounded",children:[e.toFixed(B),y]})]}),S("div",{className:"relative h-1.5 bg-white/10 rounded-full overflow-hidden",children:[i("div",{className:"absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all",style:{width:`${o}%`}}),i("input",{type:"range",min:a,max:r,step:d,value:e,onChange:c=>g(parseFloat(c.target.value)),className:"absolute inset-0 w-full h-full opacity-0 cursor-pointer"})]})]})}function jt({label:t,value:e,options:a,onChange:r}){return S("div",{children:[i("span",{className:"text-[11px] text-white/60 font-medium uppercase tracking-wide block mb-1.5",children:t}),S("div",{className:"relative",children:[i("select",{value:e,onChange:d=>{const g=d.target.value,y=parseFloat(g);r(isNaN(y)?g:y)},className:"w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white appearance-none cursor-pointer hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-primary transition-colors",children:a.map(d=>i("option",{value:d.value,className:"bg-gray-900",children:d.label},d.value))}),i("div",{className:"absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40",children:i("svg",{className:"w-4 h-4",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:i("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M19 9l-7 7-7-7"})})})]})]})}function he({title:t,icon:e,children:a,defaultOpen:r=!0}){const[d,g]=x.useState(r);return S("div",{className:"bg-white/[0.02] rounded-xl border border-white/5 overflow-hidden",children:[S("button",{onClick:()=>g(!d),className:"w-full flex items-center gap-2 px-4 py-3 hover:bg-white/5 transition-colors",children:[e&&i("span",{className:"text-cyan-400",children:e}),i("span",{className:"text-sm font-semibold text-white flex-1 text-left",children:t}),i("svg",{className:`w-4 h-4 text-white/40 transition-transform ${d?"rotate-180":""}`,fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:i("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M19 9l-7 7-7-7"})})]}),i("div",{className:`transition-all duration-200 ${d?"max-h-[1000px] opacity-100":"max-h-0 opacity-0 overflow-hidden"}`,children:i("div",{className:"px-4 pb-4 space-y-4",children:a})})]})}function Zt({physics:t,setPhysics:e,container:a,setContainer:r,particleCount:d,setParticleCount:g,derivedParams:y,isRunning:B,frame:o,time:c,onToggle:_,onReset:P}){const v=Object.entries(Ut).map(([h,l])=>({value:h,label:l})),R=i("svg",{className:"w-4 h-4",fill:"currentColor",viewBox:"0 0 20 20",children:i("path",{fillRule:"evenodd",d:"M10 18a8 8 0 100-16 8 8 0 000 16zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z",clipRule:"evenodd"})}),p=i("svg",{className:"w-4 h-4",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:i("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M13 10V3L4 14h7v7l9-11h-7z"})}),m=i("svg",{className:"w-4 h-4",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:i("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"})}),C=i("svg",{className:"w-4 h-4",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:i("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"})});return i("div",{className:"fixed right-0 top-20 bottom-0 w-80 bg-gradient-to-b from-gray-900/95 to-black/95 backdrop-blur-xl border-l border-white/10 overflow-y-auto z-10",children:S("div",{className:"p-5 space-y-5",children:[S("div",{className:"flex items-center gap-3",children:[i("div",{className:"w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20",children:i("svg",{className:"w-5 h-5 text-white",fill:"currentColor",viewBox:"0 0 20 20",children:i("path",{fillRule:"evenodd",d:"M10 18a8 8 0 100-16 8 8 0 000 16zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z",clipRule:"evenodd"})})}),S("div",{children:[i("h2",{className:"text-lg font-bold text-white",children:"SPH Fluid"}),i("p",{className:"text-[11px] text-white/40",children:"Smoothed Particle Hydrodynamics"})]})]}),S("div",{className:"flex gap-2",children:[i("button",{onClick:_,className:`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${B?"bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30":"bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"}`,children:B?S(Se,{children:[i("svg",{className:"w-4 h-4",fill:"currentColor",viewBox:"0 0 20 20",children:i("path",{fillRule:"evenodd",d:"M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z",clipRule:"evenodd"})}),"Pause"]}):S(Se,{children:[i("svg",{className:"w-4 h-4",fill:"currentColor",viewBox:"0 0 20 20",children:i("path",{fillRule:"evenodd",d:"M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z",clipRule:"evenodd"})}),"Play"]})}),S("button",{onClick:P,className:"py-2.5 px-4 rounded-xl text-sm font-semibold bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white transition-all duration-200 flex items-center gap-2",children:[i("svg",{className:"w-4 h-4",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:i("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"})}),"Reset"]})]}),S("div",{className:"grid grid-cols-2 gap-2",children:[S("div",{className:"bg-white/5 rounded-lg px-3 py-2 border border-white/5",children:[i("div",{className:"text-[10px] text-white/40 uppercase tracking-wider",children:"Frame"}),i("div",{className:"text-sm font-mono text-white",children:o.toLocaleString()})]}),S("div",{className:"bg-white/5 rounded-lg px-3 py-2 border border-white/5",children:[i("div",{className:"text-[10px] text-white/40 uppercase tracking-wider",children:"Time"}),S("div",{className:"text-sm font-mono text-white",children:[c.toFixed(3),"s"]})]}),S("div",{className:"bg-white/5 rounded-lg px-3 py-2 border border-white/5",children:[i("div",{className:"text-[10px] text-white/40 uppercase tracking-wider",children:"~Neighbors"}),i("div",{className:"text-sm font-mono text-white",children:y.expectedNeighbors})]})]}),S("div",{className:"space-y-3",children:[S(he,{title:"Particles",icon:R,children:[i(Z,{label:"Count",value:d,min:1e3,max:5e4,step:500,onChange:g}),i(jt,{label:"Initial Setup",value:t.preset,options:v,onChange:h=>e(l=>({...l,preset:h}))})]}),S(he,{title:"Fluid Properties",icon:p,defaultOpen:!1,children:[i(Z,{label:"Particle Mass",value:t.particleMass,min:.5,max:5,step:.1,unit:" kg",onChange:h=>e(l=>({...l,particleMass:h}))}),i(Z,{label:"Rest Density",value:t.restDensity,min:500,max:2e3,step:50,unit:" kg/m³",onChange:h=>e(l=>({...l,restDensity:h,dt:ue(l.smoothingLength,l.stiffness,h,l.gravity),particleMass:Le(l.smoothingLength,h)}))}),i(Z,{label:"Stiffness",value:t.stiffness,min:100,max:5e3,step:100,onChange:h=>e(l=>({...l,stiffness:h,dt:ue(l.smoothingLength,h,l.restDensity,l.gravity)}))}),i(Z,{label:"Viscosity",value:t.viscosity,min:0,max:.5,step:.01,onChange:h=>e(l=>({...l,viscosity:h}))}),i(Z,{label:"Smoothing Length",value:t.smoothingLength,min:.02,max:.5,step:.005,onChange:h=>e(l=>({...l,smoothingLength:h,dt:ue(h,l.stiffness,l.restDensity,l.gravity),particleMass:Le(h,l.restDensity)}))})]}),S(he,{title:"Environment",icon:m,defaultOpen:!1,children:[i(Z,{label:"Gravity",value:t.gravity,min:-20,max:0,step:.1,unit:" m/s²",onChange:h=>e(l=>({...l,gravity:h,dt:ue(l.smoothingLength,l.stiffness,l.restDensity,h)}))}),i(Z,{label:"Time Step",value:t.dt,min:5e-4,max:.005,step:1e-4,onChange:h=>e(l=>({...l,dt:h}))})]}),i(he,{title:"Container",icon:C,defaultOpen:!1,children:S("div",{className:"grid grid-cols-3 gap-3",children:[i(Z,{label:"W",value:a.boxWidth,min:1,max:6,step:.25,onChange:h=>r(l=>({...l,boxWidth:h}))}),i(Z,{label:"H",value:a.boxHeight,min:1,max:6,step:.25,onChange:h=>r(l=>({...l,boxHeight:h}))}),i(Z,{label:"D",value:a.boxDepth,min:1,max:6,step:.25,onChange:h=>r(l=>({...l,boxDepth:h}))})]})})]}),i("div",{className:"pt-4 border-t border-white/5",children:S("div",{className:"flex items-start gap-3 text-[11px] text-white/30",children:[i("div",{className:"flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center",children:i("svg",{className:"w-4 h-4",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:i("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:1.5,d:"M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"})})}),S("p",{className:"leading-relaxed",children:["WCSPH with Tait equation of state, Poly6/Spiky kernels, and spatial hashing.",i("span",{className:"block mt-1 text-white/20",children:"Drag to rotate • Scroll to zoom • Middle-click to pan"})]})]})})]})})}const Ue={0:[[.267,.004,.329],[.283,.141,.458],[.254,.265,.53],[.207,.372,.553],[.164,.471,.558],[.128,.567,.551],[.135,.659,.518],[.267,.749,.441],[.478,.821,.318],[.741,.873,.15],[.993,.906,.144]],1:[[.05,.03,.528],[.254,.014,.615],[.417,.031,.595],[.558,.087,.536],[.682,.159,.464],[.798,.28,.377],[.881,.402,.283],[.949,.517,.196],[.988,.652,.118],[.988,.809,.145],[.94,.975,.131]],2:[[.189,.071,.232],[.232,.298,.752],[.163,.471,.884],[.127,.617,.76],[.267,.749,.441],[.478,.821,.318],[.741,.873,.15],[.928,.736,.11],[.974,.478,.089],[.858,.19,.069],[.645,.107,.043]],3:[[.23,.299,.754],[.413,.51,.878],[.607,.706,.957],[.787,.854,.974],[.931,.921,.921],[.955,.832,.792],[.934,.697,.621],[.873,.508,.434],[.758,.297,.263],[.588,.13,.138],[.417,0,.108]],4:[[.647,0,.149],[.843,.188,.153],[.957,.427,.263],[.992,.682,.38],[.996,.878,.565],[1,1,.749],[.878,.953,.973],[.671,.851,.914],[.455,.678,.82],[.271,.459,.706],[.192,.212,.584]]};function Ie(t,e){const a=Ue[e]||Ue[0],r=Math.min(Math.floor(t*(a.length-1)),a.length-2),d=t*(a.length-1)-r,g=a[r],y=a[r+1];return[g[0]+d*(y[0]-g[0]),g[1]+d*(y[1]-g[1]),g[2]+d*(y[2]-g[2])]}function Ht(t){switch(t){case 0:return"velocity";case 4:return"height";default:return"velocity"}}function Vt({boxSize:t,gridResolution:e,isoLevel:a,fieldType:r,colormap:d,computeFields:g,onFieldRangeChange:y,isRunning:B}){const o=x.useRef(null),c=x.useRef(null),_=x.useRef(null),P=x.useRef(r),v=x.useRef(d),R=x.useRef(!1),p=x.useRef(0),m=x.useMemo(()=>({min:[-t[0]/2,0,-t[2]/2],max:[t[0]/2,t[1],t[2]/2]}),[t]);return x.useEffect(()=>{P.current!==r&&(P.current=r,y(1/0,-1/0))},[r,y]),x.useEffect(()=>{if(v.current!==d&&_.current&&c.current){v.current=d;const C=_.current,h=new Float32Array(C.vertexCount*3),l=C.fieldMax-C.fieldMin;for(let n=0;n<C.vertexCount;n++){const f=l>.001?(C.fieldValues[n]-C.fieldMin)/l:.5,[s,u,D]=Ie(Math.max(0,Math.min(1,f)),d);h[n*3]=s,h[n*3+1]=u,h[n*3+2]=D}c.current.setAttribute("color",new fe(h,3))}},[d]),Ne(()=>{if(p.current++,p.current<3||(p.current=0,R.current))return;R.current=!0,g({gridResolution:e,bounds:m}).then(h=>{if(R.current=!1,!h)return;const l=Ht(r),n=wt(h,m,a>0?a:void 0,l);if(n.vertexCount>0){_.current=n,y(n.fieldMin,n.fieldMax),c.current||(c.current=new ut),c.current.setAttribute("position",new fe(n.positions,3)),c.current.setAttribute("normal",new fe(n.normals,3));const f=new Float32Array(n.vertexCount*3),s=n.fieldMax-n.fieldMin;for(let u=0;u<n.vertexCount;u++){const D=s>.001?(n.fieldValues[u]-n.fieldMin)/s:.5,[G,O,j]=Ie(Math.max(0,Math.min(1,D)),d);f[u*3]=G,f[u*3+1]=O,f[u*3+2]=j}c.current.setAttribute("color",new fe(f,3)),c.current.computeBoundingSphere(),o.current&&(o.current.geometry=c.current)}}).catch(()=>{R.current=!1})}),x.useEffect(()=>()=>{c.current&&c.current.dispose()},[]),S("mesh",{ref:o,children:[i("bufferGeometry",{}),i("meshPhysicalMaterial",{vertexColors:!0,metalness:.1,roughness:.3,clearcoat:.3,clearcoatRoughness:.25,side:dt})]})}function Kt({particleCount:t,renderConfig:e,boxSize:a,physics:r,fieldType:d,rendering:g,onStateChange:y,onFieldRangeChange:B}){const[o,c,_,P]=Nt({particleCount:t,boxSize:a}),v=x.useRef({min:1/0,max:-1/0}),R=x.useRef(d);return x.useEffect(()=>{R.current!==d&&(v.current={min:1/0,max:-1/0},R.current=d)},[d]),x.useEffect(()=>{if(!_||!P)return;let p=v.current.min,m=v.current.max,C=!1;const h=Math.max(1,Math.floor(t/500));if(d===0)for(let l=0;l<t;l+=h){const n=P[l*4],f=P[l*4+1],s=P[l*4+2],u=Math.sqrt(n*n+f*f+s*s);u<p&&(p=u,C=!0),u>m&&(m=u,C=!0)}else if(d===4)for(let l=0;l<t;l+=h){const n=_[l*4+1];n<p&&(p=n,C=!0),n>m&&(m=n,C=!0)}C&&(v.current={min:p,max:m},B({min:p,max:m}))},[_,P,t,d,B]),x.useEffect(()=>{y(o,c)},[o,c,y]),x.useEffect(()=>{c.updateConfig({smoothingLength:r.smoothingLength,restDensity:r.restDensity,stiffness:r.stiffness,viscosity:r.viscosity,particleMass:r.particleMass,gravity:r.gravity,dt:r.dt,preset:r.preset})},[r,c]),x.useEffect(()=>{c.reset(),v.current={min:1/0,max:-1/0},B({min:1/0,max:-1/0})},[r.preset,B]),o.error?null:S(Se,{children:[g.renderMode==="mesh"?i(Vt,{boxSize:a,gridResolution:g.meshResolution,isoLevel:g.meshIsoLevel,fieldType:d,colormap:g.colormap,computeFields:c.computeFields,onFieldRangeChange:(p,m)=>B({min:p,max:m}),isRunning:o.running}):i(ft,{positions:_,velocities:P,particleCount:t,config:e}),i(Wt,{size:a}),i(Tt,{size:a})]})}function Pe(t,e,a,r,d,g=2){const y=.2880000000000001,B=e[0]*e[1]*e[2]*y,o=Math.cbrt(B/t),c=o*g,_=a*Math.pow(o,3),P=Math.round(4/3*Math.PI*Math.pow(c/o,3)),v=ue(c,r,a,d);return{spacing:o,smoothingLength:c,mass:_,dt:v,expectedNeighbors:P}}function ue(t,e,a,r=-9.81){const g=Math.sqrt(e/a),y=.1*t/g,B=Math.abs(r),o=.1*Math.sqrt(t/Math.max(B,.1)),c=Math.min(y,o);return Math.max(1e-4,Math.min(.002,c))}function Le(t,e){const a=t/2;return e*Math.pow(a,3)}function ai(){const t=gt(),e=50,a=1e3,r=-9.81,d=[1.5,2,1.5],g=5e3,[y,B]=x.useState(g),[o,c]=x.useState({boxWidth:d[0],boxHeight:d[1],boxDepth:d[2]}),[_,P]=x.useState(()=>Pe(g,d,a,e,r)),[v,R]=x.useState(()=>{const M=Pe(g,d,a,e,r);return{restDensity:a,stiffness:e,viscosity:.1,particleMass:M.mass,smoothingLength:M.smoothingLength,gravity:r,dt:M.dt,preset:"damBreak"}}),[p,m]=x.useState({pointSize:1,fieldType:0,colormap:0,blendMode:2,brightness:1.5,renderMode:"points",meshResolution:48,meshIsoLevel:0}),[C,h]=x.useState({running:!1,frame:0,time:0}),[l,n]=x.useState(null),[f,s]=x.useState({min:0,max:1}),u=x.useCallback((M,w)=>{h(M),n(w)},[]),D=x.useCallback(M=>{s(M)},[]),G=[o.boxWidth,o.boxHeight,o.boxDepth],O=x.useCallback(M=>{B(M);const w=Pe(M,G,v.restDensity,v.stiffness,v.gravity);P(w),R(k=>({...k,particleMass:w.mass,smoothingLength:w.smoothingLength,dt:w.dt}))},[G,v.restDensity,v.stiffness,v.gravity]),j=x.useMemo(()=>{const M=ke.find(w=>w.value===p.fieldType);return(M==null?void 0:M.label)||"Value"},[p.fieldType]),K=x.useMemo(()=>({pointSize:v.smoothingLength*.15,minSize:.01,maxSize:.5,velocityScale:.5,colorMode:1,fieldType:p.fieldType,colormap:p.colormap,fieldMin:isFinite(f.min)?f.min:0,fieldMax:isFinite(f.max)?f.max:1,gaussianSigma:.5,minAlpha:.01,blendMode:p.blendMode,brightness:p.brightness,baseColor:[.3,.6,1]}),[p,f,v.smoothingLength]);return t===null?S("div",{className:"min-h-screen bg-primary",children:[i(_e,{}),i("div",{className:"flex items-center justify-center h-[calc(100vh-80px)]",children:i("div",{className:"text-secondary",children:"Detecting GPU capabilities..."})})]}):t.webgpu?S("div",{className:"min-h-screen bg-primary",children:[i(_e,{}),i("div",{className:"pt-16",children:i(mt,{items:[{label:"Home",path:"/"},{label:"Simulations",path:"/showcase/simulations"},{label:"Fluid (SPH)"}]})}),i(Zt,{physics:v,setPhysics:R,container:o,setContainer:c,particleCount:y,setParticleCount:O,derivedParams:_,isRunning:C.running,frame:C.frame,time:C.time,onToggle:()=>l==null?void 0:l.toggle(),onReset:()=>{l==null||l.reset(),s({min:1/0,max:-1/0})}}),S("section",{className:"w-full h-screen pt-20 pr-80 relative",children:[i(At,{colormap:p.colormap,min:isFinite(f.min)?f.min:0,max:isFinite(f.max)?f.max:1,label:j}),S("div",{className:"absolute top-24 right-[328px] z-30 flex flex-col gap-2",children:[S("div",{className:"flex gap-2",children:[S("div",{className:"flex bg-black/70 rounded border border-white/20 backdrop-blur-sm overflow-hidden",children:[i("button",{onClick:()=>m(M=>({...M,renderMode:"points"})),className:`px-3 py-1 text-sm transition-colors ${p.renderMode==="points"?"bg-cyan-500/30 text-cyan-300":"text-white/60 hover:text-white hover:bg-white/10"}`,children:"Points"}),i("button",{onClick:()=>m(M=>({...M,renderMode:"mesh"})),className:`px-3 py-1 text-sm transition-colors ${p.renderMode==="mesh"?"bg-cyan-500/30 text-cyan-300":"text-white/60 hover:text-white hover:bg-white/10"}`,children:"Mesh"})]}),i("select",{value:p.fieldType,onChange:M=>m(w=>({...w,fieldType:parseInt(M.target.value)})),className:"bg-black/70 text-white text-sm px-2 py-1 rounded border border-white/20 backdrop-blur-sm cursor-pointer hover:border-white/40",children:ke.map(({value:M,label:w})=>i("option",{value:M,children:w},M))}),i("select",{value:p.colormap,onChange:M=>m(w=>({...w,colormap:parseInt(M.target.value)})),className:"bg-black/70 text-white text-sm px-2 py-1 rounded border border-white/20 backdrop-blur-sm cursor-pointer hover:border-white/40",children:pt.map(({value:M,label:w})=>i("option",{value:M,children:w},M))})]}),p.renderMode==="mesh"&&S("div",{className:"flex gap-2 items-center",children:[i("label",{className:"text-white/60 text-xs",children:"Grid:"}),S("select",{value:p.meshResolution,onChange:M=>m(w=>({...w,meshResolution:parseInt(M.target.value)})),className:"bg-black/70 text-white text-sm px-2 py-1 rounded border border-white/20 backdrop-blur-sm cursor-pointer hover:border-white/40",children:[i("option",{value:16,children:"16 (Fast)"}),i("option",{value:24,children:"24"}),i("option",{value:32,children:"32"}),i("option",{value:48,children:"48 (Default)"}),i("option",{value:64,children:"64"}),i("option",{value:96,children:"96 (High)"}),i("option",{value:128,children:"128 (Very High)"})]})]})]}),S(rt,{dpr:[1,2],gl:{antialias:!0,powerPreference:"high-performance"},children:[i("color",{attach:"background",args:["#1a1a24"]}),i(st,{makeDefault:!0,position:[8,6,8],fov:50}),i(at,{enableDamping:!0,dampingFactor:.05,target:[0,o.boxHeight/2,0],mouseButtons:{LEFT:xe.ROTATE,MIDDLE:xe.PAN,RIGHT:xe.DOLLY}}),i("ambientLight",{intensity:.6}),i("directionalLight",{position:[10,10,5],intensity:.8}),i("directionalLight",{position:[-5,8,-5],intensity:.4}),i("pointLight",{position:[0,15,0],intensity:.5}),i(Kt,{particleCount:y,renderConfig:K,boxSize:G,physics:v,fieldType:p.fieldType,rendering:p,onStateChange:u,onFieldRangeChange:D},`sph-${y}-${G.join("-")}`),i(ot,{alignment:"bottom-left",margin:[80,80],children:i(nt,{axisColors:["#ff4444","#44ff44","#4444ff"]})}),i(lt,{className:"!absolute !left-4 !top-20"})]})]})]}):S("div",{className:"min-h-screen bg-primary",children:[i(_e,{}),i(bt,{})]})}export{ai as SPHSimulation,ai as default};
