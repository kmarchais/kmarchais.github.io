/**
 * DEM (Discrete Element Method) Shader
 *
 * Hertz-Mindlin contact model for granular simulations.
 * Features:
 * - Hertzian normal force (non-linear spring)
 * - Mindlin tangential force with Coulomb friction limit
 * - Damping in both normal and tangential directions
 * - Wall interactions (box container)
 */

export const DEM_WORKGROUP_SIZE = 256;

/**
 * DEM parameters size in bytes
 * - particleCount: u32 (4 bytes)
 * - radius: f32 (4 bytes)
 * - kn: f32 (normal stiffness) (4 bytes)
 * - kt: f32 (tangential stiffness) (4 bytes)
 * - dampingN: f32 (normal damping) (4 bytes)
 * - dampingT: f32 (tangential damping) (4 bytes)
 * - friction: f32 (friction coefficient) (4 bytes)
 * - restitution: f32 (4 bytes)
 * - gravity: vec3f (12 bytes) + padding (4 bytes)
 * - dt: f32 (4 bytes)
 * - boxMin: vec3f (12 bytes) + padding (4 bytes)
 * - boxMax: vec3f (12 bytes) + padding (4 bytes)
 * - containerType: u32 (4 bytes) - 0=box, 1=drum
 * - drumRadius: f32 (4 bytes)
 * - drumLength: f32 (4 bytes)
 * - drumOmega: f32 (4 bytes) - angular velocity (rad/s)
 * - drumCenterY: f32 (4 bytes) - Y position of drum axis
 * - padding (12 bytes)
 * Total: 128 bytes (aligned to 16)
 */
export const DEM_PARAMS_SIZE = 128;

export interface DEMParams {
  particleCount: number;
  radius: number;
  kn: number;
  kt: number;
  dampingN: number;
  dampingT: number;
  friction: number;
  restitution: number;
  gravity: [number, number, number];
  dt: number;
  boxMin: [number, number, number];
  boxMax: [number, number, number];
  containerType: number;  // 0=box, 1=drum
  drumRadius: number;
  drumLength: number;
  drumOmega: number;      // Angular velocity in rad/s
  drumCenterY: number;    // Y position of drum axis
}

export function createDEMParamsBuffer(params: DEMParams): ArrayBuffer {
  const buffer = new ArrayBuffer(DEM_PARAMS_SIZE);
  const u32View = new Uint32Array(buffer);
  const f32View = new Float32Array(buffer);

  u32View[0] = params.particleCount;
  f32View[1] = params.radius;
  f32View[2] = params.kn;
  f32View[3] = params.kt;
  f32View[4] = params.dampingN;
  f32View[5] = params.dampingT;
  f32View[6] = params.friction;
  f32View[7] = params.restitution;
  // gravity (vec3f at offset 32, needs 16-byte alignment)
  f32View[8] = params.gravity[0];
  f32View[9] = params.gravity[1];
  f32View[10] = params.gravity[2];
  f32View[11] = 0; // padding
  // dt
  f32View[12] = params.dt;
  f32View[13] = 0; // padding
  f32View[14] = 0; // padding
  f32View[15] = 0; // padding
  // boxMin (vec3f at offset 64)
  f32View[16] = params.boxMin[0];
  f32View[17] = params.boxMin[1];
  f32View[18] = params.boxMin[2];
  f32View[19] = 0; // padding

  return buffer;
}

export function createDEMParamsBufferWithMax(params: DEMParams): ArrayBuffer {
  const buffer = new ArrayBuffer(96); // Extended for boxMax
  const u32View = new Uint32Array(buffer);
  const f32View = new Float32Array(buffer);

  u32View[0] = params.particleCount;
  f32View[1] = params.radius;
  f32View[2] = params.kn;
  f32View[3] = params.kt;
  f32View[4] = params.dampingN;
  f32View[5] = params.dampingT;
  f32View[6] = params.friction;
  f32View[7] = params.restitution;
  // gravity (vec3f)
  f32View[8] = params.gravity[0];
  f32View[9] = params.gravity[1];
  f32View[10] = params.gravity[2];
  f32View[11] = 0; // padding
  // dt
  f32View[12] = params.dt;
  f32View[13] = 0; // padding
  f32View[14] = 0; // padding
  f32View[15] = 0; // padding
  // boxMin (vec3f)
  f32View[16] = params.boxMin[0];
  f32View[17] = params.boxMin[1];
  f32View[18] = params.boxMin[2];
  f32View[19] = 0; // padding
  // boxMax (vec3f)
  f32View[20] = params.boxMax[0];
  f32View[21] = params.boxMax[1];
  f32View[22] = params.boxMax[2];
  f32View[23] = 0; // padding

  return buffer;
}

export const demShader = /* wgsl */ `
// Workgroup size
const WORKGROUP_SIZE: u32 = ${DEM_WORKGROUP_SIZE}u;

struct DEMParams {
  particleCount: u32,
  radius: f32,
  kn: f32,           // Normal stiffness
  kt: f32,           // Tangential stiffness
  dampingN: f32,     // Normal damping coefficient
  dampingT: f32,     // Tangential damping coefficient
  friction: f32,     // Coulomb friction coefficient
  restitution: f32,  // Coefficient of restitution
  gravity: vec3f,
  dt: f32,
  boxMin: vec3f,
  boxMax: vec3f,
  containerType: u32,  // 0=box, 1=drum
  drumRadius: f32,     // Drum inner radius
  drumLength: f32,     // Drum length along X
  drumOmega: f32,      // Angular velocity (rad/s)
  drumCenterY: f32,    // Y position of drum axis
}

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

// Main simulation buffers
@group(0) @binding(0) var<uniform> params: DEMParams;
@group(0) @binding(1) var<storage, read> positions_in: array<vec4f>;
@group(0) @binding(2) var<storage, read> velocities_in: array<vec4f>;
@group(0) @binding(3) var<storage, read_write> positions_out: array<vec4f>;
@group(0) @binding(4) var<storage, read_write> velocities_out: array<vec4f>;
@group(0) @binding(5) var<storage, read_write> forces: array<vec4f>;

// Spatial hash buffers (simplified - no sorting needed)
// Maximum particles per cell
const MAX_PARTICLES_PER_CELL: u32 = 32u;

@group(1) @binding(0) var<uniform> hashParams: SpatialHashParams;
@group(1) @binding(1) var<storage, read> cellCounts: array<u32>;
@group(1) @binding(2) var<storage, read> cellParticles: array<u32>;

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

/**
 * Linear Spring-Dashpot contact force (Hookean model)
 *
 * This is a simple, numerically stable contact model.
 * Normal force: F_n = k_n * delta - c_n * v_n (spring + dashpot)
 * Tangential force: F_t = -c_t * v_t, capped by Coulomb friction
 *
 * The damping coefficient c_n is computed from the restitution coefficient:
 *   gamma = -ln(e) / sqrt(pi^2 + ln(e)^2)
 *   c_n = 2 * gamma * sqrt(m * k_n)
 *
 * Critical time step for stability: dt_crit = pi * sqrt(m / k_n)
 * We use dt << dt_crit for safety.
 *
 * Supports per-particle radii: contact_dist = radius_i + radius_j
 */
fn linearSpringDashpotForce(
  pos_i: vec3f, vel_i: vec3f, radius_i: f32,
  pos_j: vec3f, vel_j: vec3f, radius_j: f32
) -> vec3f {
  let delta_pos = pos_j - pos_i;
  let dist = length(delta_pos);
  let contact_dist = radius_i + radius_j;

  // No contact if particles don't overlap
  if (dist >= contact_dist || dist < 1e-6) {
    return vec3f(0.0);
  }

  // Overlap depth (penetration)
  let delta = contact_dist - dist;

  // Normal direction (from i to j)
  let n = delta_pos / dist;

  // Relative velocity of i with respect to j
  let v_rel = vel_i - vel_j;

  // Normal component of relative velocity (positive = approaching)
  let v_n_scalar = dot(v_rel, n);
  let v_n = v_n_scalar * n;

  // Tangential component of relative velocity
  let v_t = v_rel - v_n;

  // Normal force: linear spring + viscous damping
  // F = k * delta + c * v_n (in -n direction)
  // When approaching (v_n > 0): stronger repulsion (slows approach)
  // When separating (v_n < 0): weaker repulsion (slows separation)
  let F_n_spring = params.kn * delta;
  let F_n_damp = params.dampingN * v_n_scalar;

  // Total normal force magnitude (must be repulsive, i.e., >= 0)
  let F_n_mag = max(F_n_spring + F_n_damp, 0.0);

  // Normal force vector (points from j to i, i.e., repels i)
  let F_n = -F_n_mag * n;

  // Tangential force: viscous damping capped by Coulomb friction
  let v_t_mag = length(v_t);
  var F_t = vec3f(0.0);

  if (v_t_mag > 1e-6) {
    let t = v_t / v_t_mag;

    // Viscous tangential damping
    let F_t_visc = params.dampingT * v_t_mag;

    // Coulomb friction limit
    let F_t_coulomb = params.friction * F_n_mag;

    // Take minimum (friction-limited)
    let F_t_mag = min(F_t_visc, F_t_coulomb);

    // Tangential force opposes relative tangential motion
    F_t = -F_t_mag * t;
  }

  return F_n + F_t;
}

/**
 * Wall contact force (linear spring-dashpot)
 * Damping: + when approaching (stronger repulsion), - when leaving (weaker)
 */
fn wallForce(pos: vec3f, vel: vec3f, radius: f32) -> vec3f {
  var force = vec3f(0.0);

  // Bottom wall (y = boxMin.y)
  let bottom_dist = pos.y - params.boxMin.y - radius;
  if (bottom_dist < 0.0) {
    let delta = -bottom_dist;
    let v_n = -vel.y; // velocity into wall (positive = approaching)
    let F = max(params.kn * delta + params.dampingN * v_n, 0.0);
    force.y += F;
  }

  // Top wall (y = boxMax.y)
  let top_dist = params.boxMax.y - pos.y - radius;
  if (top_dist < 0.0) {
    let delta = -top_dist;
    let v_n = vel.y;
    let F = max(params.kn * delta + params.dampingN * v_n, 0.0);
    force.y -= F;
  }

  // Left wall (x = boxMin.x)
  let left_dist = pos.x - params.boxMin.x - radius;
  if (left_dist < 0.0) {
    let delta = -left_dist;
    let v_n = -vel.x;
    let F = max(params.kn * delta + params.dampingN * v_n, 0.0);
    force.x += F;
  }

  // Right wall (x = boxMax.x)
  let right_dist = params.boxMax.x - pos.x - radius;
  if (right_dist < 0.0) {
    let delta = -right_dist;
    let v_n = vel.x;
    let F = max(params.kn * delta + params.dampingN * v_n, 0.0);
    force.x -= F;
  }

  // Back wall (z = boxMin.z)
  let back_dist = pos.z - params.boxMin.z - radius;
  if (back_dist < 0.0) {
    let delta = -back_dist;
    let v_n = -vel.z;
    let F = max(params.kn * delta + params.dampingN * v_n, 0.0);
    force.z += F;
  }

  // Front wall (z = boxMax.z)
  let front_dist = params.boxMax.z - pos.z - radius;
  if (front_dist < 0.0) {
    let delta = -front_dist;
    let v_n = vel.z;
    let F = max(params.kn * delta + params.dampingN * v_n, 0.0);
    force.z -= F;
  }

  return force;
}

/**
 * Drum wall contact force (cylindrical wall + end caps)
 * Drum axis is along X, centered at (0, drumCenterY, 0)
 * Includes tangential friction from rotating wall
 */
fn drumWallForce(pos: vec3f, vel: vec3f, radius: f32) -> vec3f {
  var force = vec3f(0.0);

  // Position relative to drum axis
  let relY = pos.y - params.drumCenterY;
  let relZ = pos.z;

  // Distance from drum axis in YZ plane
  let distFromAxis = sqrt(relY * relY + relZ * relZ);

  // Cylindrical wall collision
  let wallDist = params.drumRadius - distFromAxis - radius;
  if (wallDist < 0.0) {
    let delta = -wallDist;

    // Radial direction pointing OUTWARD from axis (toward wall)
    let radialOut = vec3f(0.0, relY / distFromAxis, relZ / distFromAxis);

    // Normal for force application (pointing INWARD toward axis, pushes particle away from wall)
    let n = -radialOut;

    // Wall velocity at contact point (rotating drum)
    // v_wall = omega × r, where r is position from axis
    // For rotation around X-axis: v = (0, -omega*z, omega*y)
    let wallVel = vec3f(0.0, -params.drumOmega * relZ, params.drumOmega * relY);

    // Relative velocity of particle with respect to wall
    let v_rel = vel - wallVel;

    // Normal component of relative velocity INTO the wall (positive = approaching wall)
    // Use radialOut so positive means moving toward wall
    let v_into_wall = dot(v_rel, radialOut);
    let v_n = v_into_wall * radialOut;

    // Tangential component of relative velocity
    let v_t = v_rel - v_n;

    // Normal force: spring + damping
    // When approaching (v_into_wall > 0): damping adds to repulsion (slows approach)
    // When leaving (v_into_wall < 0): damping reduces repulsion (allows separation)
    let F_n_spring = params.kn * delta;
    let F_n_damp = params.dampingN * v_into_wall;
    let F_n_mag = max(F_n_spring + F_n_damp, 0.0);

    // Normal force vector (points inward, toward axis - pushes particle away from wall)
    force += F_n_mag * n;

    // Tangential friction force
    let v_t_mag = length(v_t);
    if (v_t_mag > 1e-6) {
      let t = v_t / v_t_mag;
      let F_t_visc = params.dampingT * v_t_mag;
      let F_t_coulomb = params.friction * F_n_mag;
      let F_t_mag = min(F_t_visc, F_t_coulomb);
      force -= F_t_mag * t;
    }
  }

  // End cap collisions (flat walls at X = ±drumLength/2)
  let halfLength = params.drumLength / 2.0;

  // Left end cap (X = -halfLength)
  let leftDist = pos.x - (-halfLength) - radius;
  if (leftDist < 0.0 && distFromAxis < params.drumRadius) {
    let delta = -leftDist;
    let v_n = -vel.x;
    let F = max(params.kn * delta + params.dampingN * v_n, 0.0);
    force.x += F;
  }

  // Right end cap (X = +halfLength)
  let rightDist = halfLength - pos.x - radius;
  if (rightDist < 0.0 && distFromAxis < params.drumRadius) {
    let delta = -rightDist;
    let v_n = vel.x;
    let F = max(params.kn * delta + params.dampingN * v_n, 0.0);
    force.x -= F;
  }

  return force;
}

/**
 * Kernel: Compute contact forces using spatial hash
 * Uses per-particle radius stored in positions.w
 * Uses simplified cell-based hash (no sorting, fixed max per cell)
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn computeForces(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) {
    return;
  }

  let pos_i = positions_in[idx].xyz;
  let vel_i = velocities_in[idx].xyz;
  let radius_i = positions_in[idx].w;  // Per-particle radius

  // Start with gravity
  var total_force = params.gravity;

  // Add wall forces based on container type
  if (params.containerType == 1u) {
    // Drum container
    total_force += drumWallForce(pos_i, vel_i, radius_i);
  } else {
    // Box container (default)
    total_force += wallForce(pos_i, vel_i, radius_i);
  }

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

        // Get number of particles in this cell (capped at MAX_PARTICLES_PER_CELL)
        let count = min(cellCounts[cellIdx], MAX_PARTICLES_PER_CELL);

        // Check each particle in the cell
        for (var k = 0u; k < count; k++) {
          let j = cellParticles[cellIdx * MAX_PARTICLES_PER_CELL + k];
          if (j == idx) {
            continue; // Skip self
          }

          let pos_j = positions_in[j].xyz;
          let vel_j = velocities_in[j].xyz;
          let radius_j = positions_in[j].w;  // Per-particle radius

          // Compute contact force with per-particle radii
          total_force += linearSpringDashpotForce(pos_i, vel_i, radius_i, pos_j, vel_j, radius_j);
        }
      }
    }
  }

  // Store force
  forces[idx] = vec4f(total_force, 0.0);
}

/**
 * Kernel: Compute forces without spatial hash (for small particle counts)
 * Uses direct O(N²) neighbor search
 * Uses per-particle radius stored in positions.w
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn computeForcesDirect(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) {
    return;
  }

  let pos_i = positions_in[idx].xyz;
  let vel_i = velocities_in[idx].xyz;
  let radius_i = positions_in[idx].w;  // Per-particle radius

  // Start with gravity (gravity is a vec3f, e.g., (0, -9.81, 0))
  var total_force = params.gravity;

  // Add wall forces based on container type
  if (params.containerType == 1u) {
    // Drum container
    total_force += drumWallForce(pos_i, vel_i, radius_i);
  } else {
    // Box container (default)
    total_force += wallForce(pos_i, vel_i, radius_i);
  }

  // Direct N² neighbor search for particle-particle contacts
  for (var j = 0u; j < params.particleCount; j++) {
    if (j == idx) {
      continue;
    }
    let pos_j = positions_in[j].xyz;
    let vel_j = velocities_in[j].xyz;
    let radius_j = positions_in[j].w;  // Per-particle radius
    total_force += linearSpringDashpotForce(pos_i, vel_i, radius_i, pos_j, vel_j, radius_j);
  }

  forces[idx] = vec4f(total_force, 0.0);
}

/**
 * Kernel: Velocity Verlet integration (first half - update velocity)
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn integrateVelocityHalf(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) {
    return;
  }

  let vel = velocities_in[idx].xyz;
  let force = forces[idx].xyz;
  let mass = 1.0; // Assuming unit mass

  // v(t + dt/2) = v(t) + a(t) * dt/2
  let new_vel = vel + (force / mass) * params.dt * 0.5;

  velocities_out[idx] = vec4f(new_vel, 0.0);
}

/**
 * Kernel: Velocity Verlet integration (update position)
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn integratePosition(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) {
    return;
  }

  let pos = positions_in[idx];
  let vel = velocities_in[idx].xyz;

  // x(t + dt) = x(t) + v(t + dt/2) * dt
  let new_pos = pos.xyz + vel * params.dt;

  // Keep mass/radius in w component
  positions_out[idx] = vec4f(new_pos, pos.w);
}

/**
 * Kernel: Velocity Verlet integration (second half - update velocity with new forces)
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn integrateVelocityFull(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) {
    return;
  }

  let vel = velocities_in[idx].xyz;
  let force = forces[idx].xyz;
  let mass = 1.0;

  // v(t + dt) = v(t + dt/2) + a(t + dt) * dt/2
  let new_vel = vel + (force / mass) * params.dt * 0.5;

  velocities_out[idx] = vec4f(new_vel, 0.0);
}

/**
 * Check if a vector contains NaN or very large values
 * NaN check: a value is NaN if it's not equal to itself
 */
fn isValidVec3(v: vec3f) -> bool {
  let maxVal = 1e10;
  // NaN check: v != v is true only for NaN
  let hasNaN = (v.x != v.x) || (v.y != v.y) || (v.z != v.z);
  return all(abs(v) < vec3f(maxVal)) && !hasNaN;
}

/**
 * Kernel: Simple Euler integration
 * No clamping - boundaries are enforced by wall contact forces
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
  let mass = 1.0;

  // Acceleration
  let acc = force / mass;

  // Update velocity (simple Euler)
  let new_vel = vel + acc * params.dt;

  // Update position (no clamping - wall forces handle boundaries)
  let new_pos = pos.xyz + new_vel * params.dt;

  // Store results
  positions_out[idx] = vec4f(new_pos, pos.w);
  velocities_out[idx] = vec4f(new_vel, 0.0);
}
`;
