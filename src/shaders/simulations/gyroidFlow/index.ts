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
 * Total: 160 bytes (aligned to 16) - extended for helix+stadium params
 */
export const GYROID_FLOW_PARAMS_SIZE = 160;

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
  geometryType: number;          // 0 = hourglass, 1 = gyroid, 2 = helix+stadium
  gyroidScale: number;           // Scale factor for gyroid (2π for unit cell)
  gyroidThreshold: number;       // SDF threshold for collision
  boxHalfSize?: number;          // Optional: Precomputed from (yMax - yMin) / 6 for periodic bounds
  // Helix+Stadium parameters (geometryType = 2)
  helixPitch: number;            // Helix pitch (vertical distance per turn)
  helixRadius: number;           // Helix outer radius
  helixShaftRadius: number;      // Helix shaft (inner) radius
  helixThickness: number;        // Blade thickness
  stadiumMajorRadius: number;    // Stadium torus major radius (semicircle ends)
  stadiumStraightLength: number; // Stadium torus straight section half-length
  stadiumTubeRadius: number;     // Stadium torus tube radius
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
  // Helix+Stadium parameters (indices 29-35)
  f32View[29] = params.helixPitch ?? 0.35;
  f32View[30] = params.helixRadius ?? 0.4;
  f32View[31] = params.helixShaftRadius ?? 0.08;
  f32View[32] = params.helixThickness ?? 0.05;
  f32View[33] = params.stadiumMajorRadius ?? 0.5;
  f32View[34] = params.stadiumStraightLength ?? 1.0;
  f32View[35] = params.stadiumTubeRadius ?? 0.5;
  // Padding to align to 160 bytes (40 floats)
  // f32View[36-39] are padding

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
  // Helix+Stadium parameters (geometryType = 2)
  helixPitch: f32,
  helixRadius: f32,
  helixShaftRadius: f32,
  helixThickness: f32,
  stadiumMajorRadius: f32,
  stadiumStraightLength: f32,
  stadiumTubeRadius: f32,
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
  // Clamp as floats BEFORE converting to u32 to avoid wraparound issues
  let cellCoordF = floor(localPos / hashParams.cellSize);
  let maxCell = vec3f(
    f32(hashParams.gridDimX - 1u),
    f32(hashParams.gridDimY - 1u),
    f32(hashParams.gridDimZ - 1u)
  );
  let clampedF = clamp(cellCoordF, vec3f(0.0), maxCell);
  return vec3u(clampedF);
}

fn cellToIndex(cell: vec3u) -> u32 {
  return cell.x + cell.y * hashParams.gridDimX + cell.z * hashParams.gridDimX * hashParams.gridDimY;
}

/**
 * Wrap a coordinate to stay within [-halfSize, halfSize]
 * Simple if-else version to avoid floating point edge cases
 */
fn wrapCoord(x: f32, halfSize: f32) -> f32 {
  let size = halfSize * 2.0;
  var result = x;
  // Use while loops to handle multiple wraps (shouldn't happen normally)
  if (result > halfSize) {
    result = result - size;
  }
  if (result < -halfSize) {
    result = result + size;
  }
  return result;
}

/**
 * Compute minimum image distance for periodic boundaries in X and Z
 * Returns the delta vector adjusted for periodic boundaries
 */
fn periodicDelta(delta: vec3f, halfSize: f32) -> vec3f {
  let size = halfSize * 2.0;
  var dx = delta.x;
  var dz = delta.z;

  if (dx > halfSize) { dx = dx - size; }
  else if (dx < -halfSize) { dx = dx + size; }

  if (dz > halfSize) { dz = dz - size; }
  else if (dz < -halfSize) { dz = dz + size; }

  return vec3f(dx, delta.y, dz);
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
 * Stadium torus SDF (Inigo Quilez sdLink formula)
 * A torus with a stretched straight section - perfect for a capsule-shaped ring
 *
 * @param p - Point to evaluate
 * @param le - Half-length of the straight section
 * @param r1 - Major radius (radius of the ring)
 * @param r2 - Minor radius (tube thickness)
 */
fn sdLink(p: vec3f, le: f32, r1: f32, r2: f32) -> f32 {
  // For stadium torus oriented along Y axis:
  // - le is half the straight length
  // - r1 is the major radius (XZ plane)
  // - r2 is the tube radius
  let q = vec3f(p.x, max(abs(p.y) - le, 0.0), p.z);
  return length(vec2f(length(q.xz) - r1, q.y)) - r2;
}

/**
 * Stadium torus gradient for normal calculation
 */
fn sdLinkGradient(p: vec3f, le: f32, r1: f32, r2: f32) -> vec3f {
  let eps = 0.001;
  let dx = sdLink(p + vec3f(eps, 0.0, 0.0), le, r1, r2) - sdLink(p - vec3f(eps, 0.0, 0.0), le, r1, r2);
  let dy = sdLink(p + vec3f(0.0, eps, 0.0), le, r1, r2) - sdLink(p - vec3f(0.0, eps, 0.0), le, r1, r2);
  let dz = sdLink(p + vec3f(0.0, 0.0, eps), le, r1, r2) - sdLink(p - vec3f(0.0, 0.0, eps), le, r1, r2);
  return normalize(vec3f(dx, dy, dz));
}

/**
 * Helix SDF using derivative-based closest point search
 * Based on Shadertoy approach - searches for closest point on helix curve
 *
 * The helix is parameterized as:
 *   x(t) = R * cos(t)
 *   z(t) = R * sin(t)
 *   y(t) = pitch * t / (2π)
 *
 * @param p - Point to evaluate (in helix local space, helix along Y axis)
 * @param R - Helix outer radius
 * @param pitch - Vertical distance per revolution
 * @param shaftR - Shaft (inner) radius
 * @param thickness - Blade half-thickness
 */
fn helixSDF(p: vec3f, R: f32, pitch: f32, shaftR: f32, thickness: f32) -> f32 {
  let PI = 3.14159265359;
  let TAU = 6.28318530718;

  // Helix pitch factor: y = pitch * t / TAU, so t = y * TAU / pitch
  let k = pitch / TAU;  // dy/dt

  // Initial guess for parameter t based on angle and height
  let angle = atan2(p.z, p.x);  // Range: [-π, π]
  let tFromAngle = angle;
  let tFromY = p.y / k;

  // Search across multiple periods to find closest point
  var minDist = 1e10;

  // Search in a window around the expected t value
  let numPeriods = 3;  // Search ±3 periods

  for (var period = -numPeriods; period <= numPeriods; period++) {
    // Start with angle-based guess plus period offset
    var t = tFromAngle + f32(period) * TAU;

    // Newton-Raphson iterations to find closest point on helix
    for (var iter = 0; iter < 5; iter++) {
      // Point on helix at parameter t
      let hx = R * cos(t);
      let hz = R * sin(t);
      let hy = k * t;

      // Vector from helix point to query point
      let dx = p.x - hx;
      let dy = p.y - hy;
      let dz = p.z - hz;

      // Helix tangent at t: d/dt (R*cos(t), k*t, R*sin(t)) = (-R*sin(t), k, R*cos(t))
      let tx = -R * sin(t);
      let ty = k;
      let tz = R * cos(t);

      // Project delta onto tangent to find correction
      let dot_delta_tangent = dx * tx + dy * ty + dz * tz;
      let tangent_len_sq = tx * tx + ty * ty + tz * tz;

      if (tangent_len_sq < 1e-10) { break; }

      // Newton step
      let dt = dot_delta_tangent / tangent_len_sq;
      t = t + dt;

      // Early exit if converged
      if (abs(dt) < 0.001) { break; }
    }

    // Compute final distance to helix curve at converged t
    let hx = R * cos(t);
    let hz = R * sin(t);
    let hy = k * t;

    let dist = length(vec3f(p.x - hx, p.y - hy, p.z - hz));
    minDist = min(minDist, dist);
  }

  // Distance to helicoid blade = distance to helix curve - thickness
  let bladeDist = minDist - thickness;

  // Distance to central shaft (cylinder along Y)
  let shaftDist = length(p.xz) - shaftR;

  // Union of blade and shaft
  return min(bladeDist, shaftDist);
}

/**
 * Helix SDF gradient for normal calculation
 */
fn helixSDFGradient(p: vec3f, R: f32, pitch: f32, shaftR: f32, thickness: f32) -> vec3f {
  let eps = 0.001;
  let dx = helixSDF(p + vec3f(eps, 0.0, 0.0), R, pitch, shaftR, thickness)
         - helixSDF(p - vec3f(eps, 0.0, 0.0), R, pitch, shaftR, thickness);
  let dy = helixSDF(p + vec3f(0.0, eps, 0.0), R, pitch, shaftR, thickness)
         - helixSDF(p - vec3f(0.0, eps, 0.0), R, pitch, shaftR, thickness);
  let dz = helixSDF(p + vec3f(0.0, 0.0, eps), R, pitch, shaftR, thickness)
         - helixSDF(p - vec3f(0.0, 0.0, eps), R, pitch, shaftR, thickness);
  let grad = vec3f(dx, dy, dz);
  let len = length(grad);
  if (len < 1e-6) {
    return vec3f(0.0, 1.0, 0.0);
  }
  return grad / len;
}

/**
 * Helix + Stadium Torus boundary force
 * - Stadium torus acts as outer container (particles inside)
 * - Helix acts as obstacle (particles outside)
 *
 * Helix is positioned along the straight section of the stadium torus
 */
fn helixStadiumBoundaryForce(pos: vec3f, vel: vec3f, radius: f32) -> vec3f {
  var force = vec3f(0.0);

  // Stadium torus parameters (oriented along Y axis, centered at origin)
  let stadiumR1 = params.stadiumMajorRadius;
  let stadiumLe = params.stadiumStraightLength;
  let stadiumR2 = params.stadiumTubeRadius;

  // Helix parameters
  let helixR = params.helixRadius;
  let helixPitch = params.helixPitch;
  let helixShaftR = params.helixShaftRadius;
  let helixThick = params.helixThickness;

  // === Stadium Torus (outer container) ===
  // Particles should be INSIDE the torus (negative SDF)
  let stadiumDist = sdLink(pos, stadiumLe, stadiumR1, stadiumR2);
  let penetrationStadium = stadiumDist + radius;  // Positive when particle penetrates wall

  if (penetrationStadium > 0.0) {
    // Particle is penetrating the stadium torus wall
    let n = sdLinkGradient(pos, stadiumLe, stadiumR1, stadiumR2);
    let v_n_scalar = dot(vel, n);

    let F_spring = params.kn * penetrationStadium;
    let F_damp = params.dampingN * max(v_n_scalar, 0.0);  // Damp when moving outward
    let F_n_mag = F_spring + F_damp;

    // Push inward (opposite to gradient which points outward)
    force -= F_n_mag * n;

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

  // === Helix (obstacle in straight section) ===
  // Only apply helix collision in the straight section of stadium torus
  if (abs(pos.y) <= stadiumLe + stadiumR2) {
    // Transform to helix local space (helix is along Y axis at the center)
    // The helix is at distance stadiumR1 from the stadium center, along Z axis
    let helixLocalPos = vec3f(pos.x, pos.y, pos.z - stadiumR1);

    let helixDist = helixSDF(helixLocalPos, helixR, helixPitch, helixShaftR, helixThick);
    let penetrationHelix = -(helixDist - radius);  // Positive when inside helix solid

    if (penetrationHelix > 0.0) {
      // Particle is penetrating the helix
      let n = helixSDFGradient(helixLocalPos, helixR, helixPitch, helixShaftR, helixThick);
      let v_n_scalar = dot(vel, n);

      let F_spring = params.kn * penetrationHelix;
      let F_damp = params.dampingN * max(-v_n_scalar, 0.0);  // Damp when moving into helix
      let F_n_mag = F_spring + F_damp;

      // Push outward (along gradient which points away from helix surface)
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

  let wallThickness = params.gyroidThreshold;

  // XZ walls for all regions (periodic boundaries disabled)
  if (pos.x - radius < -boxHalfSize) {
    let delta = -boxHalfSize - (pos.x - radius);
    let v_n = -vel.x;
    force.x += max(params.kn * delta + params.dampingN * max(v_n, 0.0), 0.0);
  }
  if (pos.x + radius > boxHalfSize) {
    let delta = (pos.x + radius) - boxHalfSize;
    let v_n = vel.x;
    force.x -= max(params.kn * delta + params.dampingN * max(v_n, 0.0), 0.0);
  }
  if (pos.z - radius < -boxHalfSize) {
    let delta = -boxHalfSize - (pos.z - radius);
    let v_n = -vel.z;
    force.z += max(params.kn * delta + params.dampingN * max(v_n, 0.0), 0.0);
  }
  if (pos.z + radius > boxHalfSize) {
    let delta = (pos.z + radius) - boxHalfSize;
    let v_n = vel.z;
    force.z -= max(params.kn * delta + params.dampingN * max(v_n, 0.0), 0.0);
  }

  // Box regions: just floor/ceiling
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

/**
 * Linear spring-dashpot collision force between two particles
 */
fn linearSpringDashpotForce(
  pos_i: vec3f, vel_i: vec3f, radius_i: f32,
  pos_j: vec3f, vel_j: vec3f, radius_j: f32,
  usePeriodic: bool
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

  let geomType = i32(params.geometryType + 0.5);  // Round to nearest int

  var total_force = params.gravity;
  if (geomType == 2) {
    total_force += helixStadiumBoundaryForce(pos_i, vel_i, radius_i);
  } else if (geomType == 1) {
    total_force += gyroidBoundaryForce(pos_i, vel_i, radius_i);
  } else {
    total_force += hourglassBoundaryForce(pos_i, vel_i, radius_i);
  }

  let cell = positionToCell(pos_i);
  let gridDimX = i32(hashParams.gridDimX);
  let gridDimY = i32(hashParams.gridDimY);
  let gridDimZ = i32(hashParams.gridDimZ);

  for (var dz: i32 = -1; dz <= 1; dz++) {
    for (var dy: i32 = -1; dy <= 1; dy++) {
      for (var dx: i32 = -1; dx <= 1; dx++) {
        var nx = i32(cell.x) + dx;
        let ny = i32(cell.y) + dy;
        var nz = i32(cell.z) + dz;

        // Skip out-of-bounds cells
        if (ny < 0 || ny >= gridDimY) { continue; }
        if (nx < 0 || nx >= gridDimX || nz < 0 || nz >= gridDimZ) { continue; }

        let neighborCell = vec3u(u32(nx), u32(ny), u32(nz));
        let cellIdx = cellToIndex(neighborCell);
        let count = min(cellCounts[cellIdx], MAX_PARTICLES_PER_CELL);

        for (var k = 0u; k < count; k++) {
          let j = cellParticles[cellIdx * MAX_PARTICLES_PER_CELL + k];
          if (j == idx) { continue; }

          let pos_j = positions_in[j].xyz;
          let vel_j = velocities_in[j].xyz;
          let radius_j = positions_in[j].w;

          total_force += linearSpringDashpotForce(pos_i, vel_i, radius_i, pos_j, vel_j, radius_j, geomType == 1);
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

  let geomType = i32(params.geometryType + 0.5);  // Round to nearest int

  var total_force = params.gravity;
  if (geomType == 2) {
    total_force += helixStadiumBoundaryForce(pos_i, vel_i, radius_i);
  } else if (geomType == 1) {
    total_force += gyroidBoundaryForce(pos_i, vel_i, radius_i);
  } else {
    total_force += hourglassBoundaryForce(pos_i, vel_i, radius_i);
  }

  for (var j = 0u; j < params.particleCount; j++) {
    if (j == idx) { continue; }
    let pos_j = positions_in[j].xyz;
    let vel_j = velocities_in[j].xyz;
    let radius_j = positions_in[j].w;
    total_force += linearSpringDashpotForce(pos_i, vel_i, radius_i, pos_j, vel_j, radius_j, geomType == 1);
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

  let geomType = i32(params.geometryType + 0.5);
  let boxHalfSize = params.boxHalfSize;

  // TODO: Periodic boundary wrapping (disabled - causes jumping at corners)
  // Needs debugging in a 2D test case first
  // if (isGyroid) {
  //   new_pos.x = wrapCoord(new_pos.x, boxHalfSize);
  //   new_pos.z = wrapCoord(new_pos.z, boxHalfSize);
  // }

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
  if (geomType == 1) {
    let cubeSize = boxHalfSize * 2.0;
    let boxYMin = params.hourglassYMin;
    let boxYMax = params.hourglassYMax;
    let gyroidYMin = boxYMin + cubeSize;
    let gyroidYMax = boxYMax - cubeSize;

    // Only update channel when particle is inside the gyroid region
    if (new_pos.y >= gyroidYMin && new_pos.y <= gyroidYMax) {
      let gyroidCenterY = (gyroidYMin + gyroidYMax) * 0.5;
      // Use wrapped position for gyroid calculation (already wrapped above)
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
