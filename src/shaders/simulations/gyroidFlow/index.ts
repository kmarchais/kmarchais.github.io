/**
 * Hourglass Flow Shader
 *
 * Particle simulation in an hourglass container.
 * Features:
 * - Hourglass boundary collisions (narrow waist, wide top/bottom)
 * - Spring-dashpot collision response
 * - Particle respawning for continuous flow
 */

export const GYROID_FLOW_WORKGROUP_SIZE = 256;

/**
 * Hourglass flow parameters size in bytes
 * Total: 128 bytes (aligned to 16)
 */
export const GYROID_FLOW_PARAMS_SIZE = 128;

export interface GyroidFlowParams {
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
  hourglassRadiusTop: number;    // Radius at top and bottom (wide)
  hourglassYMin: number;         // Bottom of hourglass
  hourglassYMax: number;         // Top of hourglass
  spawnXMin: number;
  spawnXMax: number;
  spawnYMin: number;
  spawnYMax: number;
  spawnZMin: number;
  spawnZMax: number;
  respawnYThreshold: number;
  seed: number;
  hourglassRadiusWaist: number;  // Radius at waist (narrow)
  topCapEnabled: number;         // 1.0 = enabled, 0.0 = disabled
  geometryType: number;          // 0 = hourglass, 1 = gyroid
  gyroidScale: number;           // Scale factor for gyroid (2π for unit cell)
  gyroidThreshold: number;       // SDF threshold for collision
  boxHalfSize: number;           // Precomputed: (yMax - yMin) / 6 for periodic bounds
}

export function createGyroidFlowParamsBuffer(params: GyroidFlowParams): ArrayBuffer {
  const buffer = new ArrayBuffer(GYROID_FLOW_PARAMS_SIZE);
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
  f32View[8] = params.gravity[0];
  f32View[9] = params.gravity[1];
  f32View[10] = params.gravity[2];
  f32View[11] = params.dt;
  f32View[12] = params.hourglassRadiusTop;
  f32View[13] = params.hourglassYMin;
  f32View[14] = params.hourglassYMax;
  f32View[15] = params.spawnXMin;
  f32View[16] = params.spawnXMax;
  f32View[17] = params.spawnYMin;
  f32View[18] = params.spawnYMax;
  f32View[19] = params.spawnZMin;
  f32View[20] = params.spawnZMax;
  f32View[21] = params.respawnYThreshold;
  u32View[22] = params.seed;
  f32View[23] = params.hourglassRadiusWaist;
  f32View[24] = params.topCapEnabled;
  f32View[25] = params.geometryType;
  f32View[26] = params.gyroidScale;
  f32View[27] = params.gyroidThreshold;
  // Precompute boxHalfSize: (yMax - yMin) / 3 / 2 = (yMax - yMin) / 6
  f32View[28] = (params.hourglassYMax - params.hourglassYMin) / 6.0;

  return buffer;
}

export const gyroidFlowShader = /* wgsl */ `
const WORKGROUP_SIZE: u32 = ${GYROID_FLOW_WORKGROUP_SIZE}u;

struct GyroidFlowParams {
  particleCount: u32,
  radius: f32,
  kn: f32,
  kt: f32,
  dampingN: f32,
  dampingT: f32,
  friction: f32,
  restitution: f32,
  gravity: vec3f,
  dt: f32,
  hourglassRadiusTop: f32,
  hourglassYMin: f32,
  hourglassYMax: f32,
  spawnXMin: f32,
  spawnXMax: f32,
  spawnYMin: f32,
  spawnYMax: f32,
  spawnZMin: f32,
  spawnZMax: f32,
  respawnYThreshold: f32,
  seed: u32,
  hourglassRadiusWaist: f32,
  topCapEnabled: f32,
  geometryType: f32,
  gyroidScale: f32,
  gyroidThreshold: f32,
  boxHalfSize: f32,
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

@group(0) @binding(0) var<uniform> params: GyroidFlowParams;
@group(0) @binding(1) var<storage, read> positions_in: array<vec4f>;
@group(0) @binding(2) var<storage, read> velocities_in: array<vec4f>;
@group(0) @binding(3) var<storage, read_write> positions_out: array<vec4f>;
@group(0) @binding(4) var<storage, read_write> velocities_out: array<vec4f>;
@group(0) @binding(5) var<storage, read_write> forces: array<vec4f>;

const MAX_PARTICLES_PER_CELL: u32 = 32u;

@group(1) @binding(0) var<uniform> hashParams: SpatialHashParams;
@group(1) @binding(1) var<storage, read> cellCounts: array<u32>;
@group(1) @binding(2) var<storage, read> cellParticles: array<u32>;

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

fn cellToIndex(cell: vec3u) -> u32 {
  return cell.x + cell.y * hashParams.gridDimX + cell.z * hashParams.gridDimX * hashParams.gridDimY;
}

/**
 * Hourglass radius at a given height (quadratic profile)
 * Wide at top/bottom, narrow at waist (center)
 * r(y) = waist + (top - waist) * yNorm^2
 */
fn hourglassRadius(y: f32) -> f32 {
  let height = params.hourglassYMax - params.hourglassYMin;
  let yCenter = params.hourglassYMin + height * 0.5;
  let yNorm = clamp((y - yCenter) / (height * 0.5), -1.0, 1.0);
  return params.hourglassRadiusWaist + (params.hourglassRadiusTop - params.hourglassRadiusWaist) * yNorm * yNorm;
}

/**
 * Derivative of hourglass radius with respect to y
 * dr/dy = (top - waist) * 2 * yNorm / halfHeight
 */
fn hourglassRadiusDerivative(y: f32) -> f32 {
  let height = params.hourglassYMax - params.hourglassYMin;
  let halfHeight = height * 0.5;
  let yCenter = params.hourglassYMin + halfHeight;
  let yNorm = clamp((y - yCenter) / halfHeight, -1.0, 1.0);
  return (params.hourglassRadiusTop - params.hourglassRadiusWaist) * 2.0 * yNorm / halfHeight;
}

/**
 * Gyroid implicit function: G(x,y,z) = sin(x)cos(y) + sin(y)cos(z) + sin(z)cos(x)
 */
fn gyroidImplicit(pos: vec3f, scale: f32) -> f32 {
  let p = pos * scale;
  return sin(p.x) * cos(p.y) + sin(p.y) * cos(p.z) + sin(p.z) * cos(p.x);
}

/**
 * Gyroid implicit function gradient
 */
fn gyroidImplicitGradient(pos: vec3f, scale: f32) -> vec3f {
  let p = pos * scale;
  let gx = cos(p.x) * cos(p.y) - sin(p.z) * sin(p.x);
  let gy = -sin(p.x) * sin(p.y) + cos(p.y) * cos(p.z);
  let gz = -sin(p.y) * sin(p.z) + cos(p.z) * cos(p.x);
  return vec3f(gx, gy, gz) * scale;
}

/**
 * Approximate SDF to the thick-walled gyroid VOLUME
 * Wall exists where |G| <= wallThickness (same as marching cubes visualization)
 * Channel (void) exists where |G| > wallThickness
 *
 * Uses first-order approximation: distance ≈ (|G| - t) / |∇G|
 * Returns: negative inside wall, positive in channel
 */
fn gyroidVolumeSDF(pos: vec3f, scale: f32, wallThickness: f32) -> f32 {
  let g = gyroidImplicit(pos, scale);
  let grad = gyroidImplicitGradient(pos, scale);
  let gradLen = length(grad);

  if (gradLen < 0.001) {
    // At a saddle point, use raw value
    return abs(g) - wallThickness;
  }

  // Approximate distance to wall boundary (|G| = wallThickness)
  return (abs(g) - wallThickness) / gradLen;
}

/**
 * Gyroid boundary force - keeps particles inside gyroid channels
 * Particles flow through the channel where G < 0
 *
 * Geometry: 3 equal cubes stacked vertically
 * - Bottom cube: solid box
 * - Middle cube: gyroid unit cell (2 periods)
 * - Top cube: solid box
 */
fn gyroidBoundaryForce(pos: vec3f, vel: vec3f, radius: f32) -> vec3f {
  var force = vec3f(0.0);

  // Use precomputed boxHalfSize, derive other values
  let boxHalfSize = params.boxHalfSize;
  let cubeSize = boxHalfSize * 2.0;
  let boxYMin = params.hourglassYMin;
  let boxYMax = params.hourglassYMax;

  let gyroidYMin = boxYMin + cubeSize;  // Gyroid starts after bottom cube
  let gyroidYMax = boxYMax - cubeSize;  // Gyroid ends before top cube
  let gyroidCenterY = (gyroidYMin + gyroidYMax) * 0.5;

  // Gyroid position (centered on gyroid region)
  let gyroidPos = vec3f(pos.x, pos.y - gyroidCenterY, pos.z);

  // Bottom box floor
  if (pos.y - radius < boxYMin) {
    let delta = boxYMin - (pos.y - radius);
    let v_n = -vel.y;
    let F = max(params.kn * delta + params.dampingN * max(v_n, 0.0), 0.0);
    force.y += F;
  }

  // Top box ceiling (when enabled)
  if (params.topCapEnabled > 0.5 && pos.y + radius > boxYMax) {
    let delta = (pos.y + radius) - boxYMax;
    let v_n = vel.y;
    let F = max(params.kn * delta + params.dampingN * max(v_n, 0.0), 0.0);
    force.y -= F;
  }

  // Determine which region the particle is in
  let inBottomBox = pos.y < gyroidYMin;
  let inTopBox = pos.y > gyroidYMax;

  // XZ wall collision (applies to all regions)
  if (abs(pos.x) + radius > boxHalfSize) {
    let sign_x = sign(pos.x);
    let delta = abs(pos.x) + radius - boxHalfSize;
    let n = vec3f(-sign_x, 0.0, 0.0);
    let v_n_scalar = dot(vel, n);
    let F_n_mag = max(params.kn * delta + params.dampingN * max(-v_n_scalar, 0.0), 0.0);
    force += F_n_mag * n;
  }
  if (abs(pos.z) + radius > boxHalfSize) {
    let sign_z = sign(pos.z);
    let delta = abs(pos.z) + radius - boxHalfSize;
    let n = vec3f(0.0, 0.0, -sign_z);
    let v_n_scalar = dot(vel, n);
    let F_n_mag = max(params.kn * delta + params.dampingN * max(-v_n_scalar, 0.0), 0.0);
    force += F_n_mag * n;
  }

  let wallThickness = params.gyroidThreshold;

  // Box regions: only XZ walls apply, no gyroid collision
  if (inBottomBox || inTopBox) {
    return force;
  }

  // === Gyroid region collision ===
  // Simple approach: if |G| < threshold, particle is in wall, push toward channel

  let g = gyroidImplicit(gyroidPos, params.gyroidScale);
  let absG = abs(g);

  // Check if particle is inside the wall region
  if (absG < wallThickness) {
    let grad = gyroidImplicitGradient(gyroidPos, params.gyroidScale);
    let gradLen = length(grad);

    if (gradLen > 0.01) {
      // How deep inside the wall (0 at boundary, wallThickness at G=0)
      let depthInWall = wallThickness - absG;

      // Normalized depth (0 to 1)
      let normalizedDepth = depthInWall / wallThickness;

      // Normal pointing toward increasing |G| (out of wall, into channel)
      var sdfSign = 1.0;
      if (g < 0.0) { sdfSign = -1.0; }
      let n = grad / gradLen * sdfSign;

      let v_n_scalar = dot(vel, n);

      // Soft spring force - use normalized depth for smoother response
      let F_spring = params.kn * radius * normalizedDepth;

      // Damping when moving into the wall
      let F_damp = params.dampingN * max(-v_n_scalar, 0.0);

      let F_n_mag = F_spring + F_damp;
      force += F_n_mag * n;

      // Tangential friction
      let v_t = vel - v_n_scalar * n;
      let v_t_mag = length(v_t);
      if (v_t_mag > 1e-6) {
        let t = v_t / v_t_mag;
        let F_t_visc = params.dampingT * v_t_mag;
        let F_t_coulomb = params.friction * F_n_mag;
        force -= min(F_t_visc, F_t_coulomb) * t;
      }
    }
  }

  return force;
}

/**
 * Hourglass boundary force - keeps particles inside the hourglass wall
 */
fn hourglassBoundaryForce(pos: vec3f, vel: vec3f, radius: f32) -> vec3f {
  var force = vec3f(0.0);

  // Bottom cap collision (solid floor)
  if (pos.y - radius < params.hourglassYMin) {
    let r = length(pos.xz);
    if (r < params.hourglassRadiusTop) {
      let delta = params.hourglassYMin - (pos.y - radius);
      let v_n = -vel.y;
      let F = max(params.kn * delta + params.dampingN * v_n, 0.0);
      force.y += F;

      // Floor friction
      let v_t = vec2f(vel.x, vel.z);
      let v_t_mag = length(v_t);
      if (v_t_mag > 1e-6) {
        let F_t_visc = params.dampingT * v_t_mag;
        let F_t_coulomb = params.friction * F;
        let t = v_t / v_t_mag;
        force.x -= min(F_t_visc, F_t_coulomb) * t.x;
        force.z -= min(F_t_visc, F_t_coulomb) * t.y;
      }
    }
  }

  // Top cap collision (solid ceiling) - only when enabled
  if (params.topCapEnabled > 0.5 && pos.y + radius > params.hourglassYMax) {
    let r = length(pos.xz);
    if (r < params.hourglassRadiusTop) {
      let delta = (pos.y + radius) - params.hourglassYMax;
      let v_n = vel.y;
      let F = max(params.kn * delta + params.dampingN * v_n, 0.0);
      force.y -= F;

      // Ceiling friction
      let v_t = vec2f(vel.x, vel.z);
      let v_t_mag = length(v_t);
      if (v_t_mag > 1e-6) {
        let F_t_visc = params.dampingT * v_t_mag;
        let F_t_coulomb = params.friction * F;
        let t = v_t / v_t_mag;
        force.x -= min(F_t_visc, F_t_coulomb) * t.x;
        force.z -= min(F_t_visc, F_t_coulomb) * t.y;
      }
    }
  }

  // Cylinder collision above hourglass (spawn area) - only when top cap disabled
  if (params.topCapEnabled < 0.5 && pos.y >= params.hourglassYMax) {
    let r = length(pos.xz);
    let penetration = (r + radius) - params.hourglassRadiusTop;

    if (penetration > 0.0 && r > 0.001) {
      // Inward radial normal (horizontal, pointing toward axis)
      let n = vec3f(-pos.x / r, 0.0, -pos.z / r);

      let v_n_scalar = dot(vel, n);
      let F_spring = params.kn * penetration;
      let F_damp = params.dampingN * max(-v_n_scalar, 0.0);
      let F_n_mag = max(F_spring + F_damp, 0.0);

      force += F_n_mag * n;

      // Tangential friction
      let v_t = vel - v_n_scalar * n;
      let v_t_mag = length(v_t);
      if (v_t_mag > 1e-6) {
        let t = v_t / v_t_mag;
        let F_t_visc = params.dampingT * v_t_mag;
        let F_t_coulomb = params.friction * F_n_mag;
        force -= min(F_t_visc, F_t_coulomb) * t;
      }
    }
    return force;
  }

  // Only apply hourglass wall collision within hourglass height range
  if (pos.y < params.hourglassYMin || pos.y > params.hourglassYMax) {
    return force;
  }

  let r = length(pos.xz);
  let targetR = hourglassRadius(pos.y);
  let penetration = (r + radius) - targetR;

  if (penetration > 0.0 && r > 0.001) {
    // Compute inward normal to hourglass surface
    let dRdy = hourglassRadiusDerivative(pos.y);

    // Radial direction in XZ plane
    let radialDir = vec2f(pos.x / r, pos.z / r);

    // For implicit surface F = r - f(y) = 0, gradient is (x/r, -f'(y), z/r)
    // Inward normal (toward axis) is negative gradient: (-x/r, f'(y), -z/r) normalized
    let nLen = sqrt(1.0 + dRdy * dRdy);
    let n_radial = -1.0 / nLen;  // inward radial component
    let n_y = dRdy / nLen;       // vertical component (positive when wall widens upward)

    let n = vec3f(n_radial * radialDir.x, n_y, n_radial * radialDir.y);

    // Spring-dashpot force
    let v_n_scalar = dot(vel, n);
    let F_spring = params.kn * penetration;
    let F_damp = params.dampingN * max(-v_n_scalar, 0.0);
    let F_n_mag = max(F_spring + F_damp, 0.0);

    force += F_n_mag * n;

    // Tangential friction
    let v_t = vel - v_n_scalar * n;
    let v_t_mag = length(v_t);
    if (v_t_mag > 1e-6) {
      let t = v_t / v_t_mag;
      let F_t_visc = params.dampingT * v_t_mag;
      let F_t_coulomb = params.friction * F_n_mag;
      force -= min(F_t_visc, F_t_coulomb) * t;
    }
  }

  return force;
}

fn linearSpringDashpotForce(
  pos_i: vec3f, vel_i: vec3f, radius_i: f32,
  pos_j: vec3f, vel_j: vec3f, radius_j: f32
) -> vec3f {
  let delta_pos = pos_j - pos_i;
  let dist = length(delta_pos);
  let contact_dist = radius_i + radius_j;

  if (dist >= contact_dist || dist < 1e-6) {
    return vec3f(0.0);
  }

  let delta = contact_dist - dist;
  let n = delta_pos / dist;
  let v_rel = vel_i - vel_j;
  let v_n_scalar = dot(v_rel, n);
  let v_t = v_rel - v_n_scalar * n;

  let F_n_mag = max(params.kn * delta + params.dampingN * v_n_scalar, 0.0);
  let F_n = -F_n_mag * n;

  var F_t = vec3f(0.0);
  let v_t_mag = length(v_t);
  if (v_t_mag > 1e-6) {
    let t = v_t / v_t_mag;
    F_t = -min(params.dampingT * v_t_mag, params.friction * F_n_mag) * t;
  }

  return F_n + F_t;
}

@compute @workgroup_size(WORKGROUP_SIZE)
fn computeForces(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) { return; }

  let pos_i = positions_in[idx].xyz;
  let vel_i = velocities_in[idx].xyz;
  let radius_i = positions_in[idx].w;

  var total_force = params.gravity;
  if (params.geometryType > 0.5) {
    total_force += gyroidBoundaryForce(pos_i, vel_i, radius_i);
  } else {
    total_force += hourglassBoundaryForce(pos_i, vel_i, radius_i);
  }

  let cell = positionToCell(pos_i);

  for (var dz: i32 = -1; dz <= 1; dz++) {
    for (var dy: i32 = -1; dy <= 1; dy++) {
      for (var dx: i32 = -1; dx <= 1; dx++) {
        let nx = i32(cell.x) + dx;
        let ny = i32(cell.y) + dy;
        let nz = i32(cell.z) + dz;

        if (nx < 0 || nx >= i32(hashParams.gridDimX) ||
            ny < 0 || ny >= i32(hashParams.gridDimY) ||
            nz < 0 || nz >= i32(hashParams.gridDimZ)) {
          continue;
        }

        let neighborCell = vec3u(u32(nx), u32(ny), u32(nz));
        let cellIdx = cellToIndex(neighborCell);
        let count = min(cellCounts[cellIdx], MAX_PARTICLES_PER_CELL);

        for (var k = 0u; k < count; k++) {
          let j = cellParticles[cellIdx * MAX_PARTICLES_PER_CELL + k];
          if (j == idx) { continue; }

          let pos_j = positions_in[j].xyz;
          let vel_j = velocities_in[j].xyz;
          let radius_j = positions_in[j].w;

          total_force += linearSpringDashpotForce(pos_i, vel_i, radius_i, pos_j, vel_j, radius_j);
        }
      }
    }
  }

  forces[idx] = vec4f(total_force, 0.0);
}

@compute @workgroup_size(WORKGROUP_SIZE)
fn computeForcesDirect(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) { return; }

  let pos_i = positions_in[idx].xyz;
  let vel_i = velocities_in[idx].xyz;
  let radius_i = positions_in[idx].w;

  var total_force = params.gravity;
  if (params.geometryType > 0.5) {
    total_force += gyroidBoundaryForce(pos_i, vel_i, radius_i);
  } else {
    total_force += hourglassBoundaryForce(pos_i, vel_i, radius_i);
  }

  for (var j = 0u; j < params.particleCount; j++) {
    if (j == idx) { continue; }
    let pos_j = positions_in[j].xyz;
    let vel_j = velocities_in[j].xyz;
    let radius_j = positions_in[j].w;
    total_force += linearSpringDashpotForce(pos_i, vel_i, radius_i, pos_j, vel_j, radius_j);
  }

  forces[idx] = vec4f(total_force, 0.0);
}

fn hash(seed: u32) -> u32 {
  var x = seed;
  x = ((x >> 16u) ^ x) * 0x45d9f3bu;
  x = ((x >> 16u) ^ x) * 0x45d9f3bu;
  x = (x >> 16u) ^ x;
  return x;
}

fn randomFloat(seed: u32) -> f32 {
  return f32(hash(seed) & 0x00FFFFFFu) / f32(0x01000000u);
}

@compute @workgroup_size(WORKGROUP_SIZE)
fn integrate(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) { return; }

  let pos = positions_in[idx];
  let vel = velocities_in[idx];
  let force = forces[idx].xyz;

  let acc = force;
  var new_vel = vel.xyz + acc * params.dt;
  var new_pos = pos.xyz + new_vel * params.dt;

  // Preserve existing channel value (stored in velocity.w)
  var channel = vel.w;

  // Respawn if below threshold
  if (new_pos.y < params.respawnYThreshold) {
    let seedBase = params.seed + idx * 3u;
    let rx = randomFloat(seedBase);
    let ry = randomFloat(seedBase + 1u);
    let rz = randomFloat(seedBase + 2u);

    new_pos.x = params.spawnXMin + rx * (params.spawnXMax - params.spawnXMin);
    new_pos.y = params.spawnYMin + ry * (params.spawnYMax - params.spawnYMin);
    new_pos.z = params.spawnZMin + rz * (params.spawnZMax - params.spawnZMin);

    new_vel = vec3f(0.0, -0.5, 0.0);
    // Reset channel on respawn (will be set when entering gyroid)
    channel = 0.5;  // Neutral value
  }

  // Update channel when in gyroid region (only for gyroid geometry)
  if (params.geometryType > 0.5) {
    let boxHalfSize = params.boxHalfSize;
    let cubeSize = boxHalfSize * 2.0;
    let boxYMin = params.hourglassYMin;
    let boxYMax = params.hourglassYMax;
    let gyroidYMin = boxYMin + cubeSize;
    let gyroidYMax = boxYMax - cubeSize;

    // Only update channel when particle is inside the gyroid region
    if (new_pos.y >= gyroidYMin && new_pos.y <= gyroidYMax) {
      let gyroidCenterY = (gyroidYMin + gyroidYMax) * 0.5;
      let gyroidPos = vec3f(new_pos.x, new_pos.y - gyroidCenterY, new_pos.z);
      let g = gyroidImplicit(gyroidPos, params.gyroidScale);
      // Map to 0 or 1 based on sign of gyroid function
      channel = select(0.0, 1.0, g >= 0.0);
    }
  }

  positions_out[idx] = vec4f(new_pos, pos.w);
  velocities_out[idx] = vec4f(new_vel, channel);
}
`;
