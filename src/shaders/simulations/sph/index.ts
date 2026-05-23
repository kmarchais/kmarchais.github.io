/**
 * SPH (Smoothed Particle Hydrodynamics) Shader
 *
 * Fluid simulation using SPH method with:
 * - Poly6 kernel for density estimation
 * - Spiky gradient kernel for pressure forces
 * - Viscosity Laplacian kernel for viscous forces
 * - Tait equation of state for pressure
 * - Boundary particle repulsion
 */

export const SPH_WORKGROUP_SIZE = 256;

/**
 * SPH parameters size in bytes
 * - particleCount: u32 (4 bytes)
 * - h: f32 (smoothing length) (4 bytes)
 * - restDensity: f32 (4 bytes)
 * - stiffness: f32 (4 bytes)
 * - viscosity: f32 (4 bytes)
 * - particleMass: f32 (4 bytes)
 * - dt: f32 (4 bytes)
 * - padding: f32 (4 bytes)
 * - gravity: vec3f (12 bytes) + padding (4 bytes)
 * - boxMin: vec3f (12 bytes) + padding (4 bytes)
 * - boxMax: vec3f (12 bytes) + padding (4 bytes)
 * Total: 80 bytes (aligned to 16)
 */
export const SPH_PARAMS_SIZE = 80;

export interface SPHParams {
  particleCount: number;
  h: number;           // Smoothing length
  restDensity: number; // Reference density (kg/m³)
  stiffness: number;   // Pressure stiffness coefficient
  viscosity: number;   // Dynamic viscosity
  particleMass: number;
  dt: number;
  gravity: [number, number, number];
  boxMin: [number, number, number];
  boxMax: [number, number, number];
}

export function createSPHParamsBuffer(params: SPHParams): ArrayBuffer {
  const buffer = new ArrayBuffer(SPH_PARAMS_SIZE);
  const u32View = new Uint32Array(buffer);
  const f32View = new Float32Array(buffer);

  u32View[0] = params.particleCount;
  f32View[1] = params.h;
  f32View[2] = params.restDensity;
  f32View[3] = params.stiffness;
  f32View[4] = params.viscosity;
  f32View[5] = params.particleMass;
  f32View[6] = params.dt;
  f32View[7] = 0; // padding
  // gravity (vec3f at offset 32)
  f32View[8] = params.gravity[0];
  f32View[9] = params.gravity[1];
  f32View[10] = params.gravity[2];
  f32View[11] = 0; // padding
  // boxMin (vec3f at offset 48)
  f32View[12] = params.boxMin[0];
  f32View[13] = params.boxMin[1];
  f32View[14] = params.boxMin[2];
  f32View[15] = 0; // padding
  // boxMax (vec3f at offset 64)
  f32View[16] = params.boxMax[0];
  f32View[17] = params.boxMax[1];
  f32View[18] = params.boxMax[2];
  f32View[19] = 0; // padding

  return buffer;
}

export const sphShader = /* wgsl */ `
// Workgroup size
const WORKGROUP_SIZE: u32 = ${SPH_WORKGROUP_SIZE}u;

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
`;
