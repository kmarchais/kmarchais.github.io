import{d as xe,b as g,j as A,C as Se,i as Pe,f as Re,F as ze}from"./vendor-r3f-b9e513d9.js";import{r as o}from"./vendor-react-11ad1bf9.js";import{ae as oe,D as le,V as Fe,aK as Te,aL as Ye,c as H,B as ye,as as ve,a4 as Ce,aM as ke}from"./vendor-three-a8671fcb.js";import{S as De}from"./index-c8982a94.js";import{g as Ge}from"./gpuCapabilities-6d047e77.js";import{d as Be,h as Le,w as pe,c as fe,u as he,b as Ae,i as Ie,e as me,s as te,f as ne}from"./pipelineBuilder-ebda840f.js";import{S as ge,s as He,a as Ee}from"./spatialHash-a3a691f9.js";import{a as Xe}from"./marchingCubes-e878911d.js";import"./vendor-ui-4807b111.js";const Me=256,be=160;function Ze(e){const t=new ArrayBuffer(be),n=new Uint32Array(t),a=new Float32Array(t);return n[0]=e.particleCount,a[1]=e.radius,a[2]=e.kn,a[3]=e.kt,a[4]=e.dampingN,a[5]=e.dampingT,a[6]=e.friction,a[7]=e.restitution,a[8]=e.gravity[0],a[9]=e.gravity[1],a[10]=e.gravity[2],a[11]=e.dt,a[12]=e.hourglassRadiusTop,a[13]=e.hourglassYMin,a[14]=e.hourglassYMax,a[15]=e.spawnXMin,a[16]=e.spawnXMax,a[17]=e.spawnYMin,a[18]=e.spawnYMax,a[19]=e.spawnZMin,a[20]=e.spawnZMax,a[21]=e.respawnYThreshold,n[22]=e.seed,a[23]=e.hourglassRadiusWaist,a[24]=e.topCapEnabled,a[25]=e.geometryType,a[26]=e.gyroidScale,a[27]=e.gyroidThreshold,a[28]=(e.hourglassYMax-e.hourglassYMin)/6,a[29]=e.helixPitch??.35,a[30]=e.helixRadius??.4,a[31]=e.helixShaftRadius??.08,a[32]=e.helixThickness??.05,a[33]=e.stadiumMajorRadius??.5,a[34]=e.stadiumStraightLength??1,a[35]=e.stadiumTubeRadius??.5,t}const Ue=`
const WORKGROUP_SIZE: u32 = ${Me}u;

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
`;function We(e,t){const n=new Float32Array(e*4),a=new Float32Array(e*4),l=t.spawnXMax-t.spawnXMin,u=t.spawnYMax-t.spawnYMin,y=t.spawnZMax-t.spawnZMin,c=t.radiusMin??t.radius,h=(t.radiusMax??t.radius)-c;for(let d=0;d<e;d++){const v=t.spawnXMin+Math.random()*l,f=t.spawnYMin+Math.random()*u,m=t.spawnZMin+Math.random()*y,M=c+Math.random()*h;n[d*4]=v,n[d*4+1]=f,n[d*4+2]=m,n[d*4+3]=M,a[d*4]=(Math.random()-.5)*.5,a[d*4+1]=-Math.random()*1,a[d*4+2]=(Math.random()-.5)*.5,a[d*4+3]=.5}return{positions:n,velocities:a}}function je(e,t){const n=new Float32Array(e*4),a=new Float32Array(e*4),l=t.radius*2.5,u=t.spawnXMax-t.spawnXMin,y=t.spawnZMax-t.spawnZMin,c=Math.max(1,Math.floor(u/l)),x=Math.max(1,Math.floor(y/l));for(let h=0;h<e;h++){const d=h%c,v=Math.floor(h/c)%x,f=Math.floor(h/(c*x)),m=f%2*(l/2),M=f%2*(l/2),S=t.spawnXMin+l/2+d*l+m,P=t.spawnYMin+t.radius+f*l,w=t.spawnZMin+l/2+v*l+M;n[h*4]=S,n[h*4+1]=P,n[h*4+2]=w,n[h*4+3]=t.radius,a[h*4]=0,a[h*4+1]=0,a[h*4+2]=0,a[h*4+3]=.5}return{positions:n,velocities:a}}const ae={default:{name:"Random Spawn",description:"Particles spawn randomly in the upper box",generator:We},layered:{name:"Layered",description:"Particles spawn in organized layers",generator:je}};function Ne(e,t,n=1){const a=Math.max(.01,Math.min(.99,e)),l=Math.log(a);return 2*(-l/Math.sqrt(Math.PI*Math.PI+l*l))*Math.sqrt(n*t)}function _e(e,t=1,n=.3){return Math.PI*Math.sqrt(t/e)*n}const Oe={particleCount:2e3,radius:.08,radiusMin:.08,radiusMax:.08,stiffness:15e3,tangentialRatio:.5,friction:.3,restitution:.4,gravity:-9.81,dt:.001,hourglassRadiusTop:2.5,hourglassRadiusWaist:.5,hourglassYMin:0,hourglassYMax:6,spawnXMin:-1.5,spawnXMax:1.5,spawnYMin:6.5,spawnYMax:8,spawnZMin:-1.5,spawnZMax:1.5,respawnYThreshold:-.5,topCapEnabled:!1,geometryType:0,gyroidScale:2*Math.PI,gyroidThreshold:.3,preset:"default",autoStart:!1};function Ve(e,t){const n=e.geometryType===1,a=(e.hourglassYMax-e.hourglassYMin)/6,l=n?a*2:e.spawnXMax-e.spawnXMin,u=e.hourglassYMax-e.hourglassYMin,y=n?a*2:e.spawnZMax-e.spawnZMin;return[n?Math.ceil(l/t):Math.ceil(l/t)+2,Math.ceil(u/t)+2,n?Math.ceil(y/t):Math.ceil(y/t)+2]}function qe(e={}){const t=o.useRef({device:null,buffers:null,hashBuffers:null,hashParams:null,forcesPipeline:null,integratePipeline:null,hashPipelines:null,bindGroupLayout:null,hashBindGroupLayout:null,hashBuildLayout:null,gridDimensions:[1,1,1],gridMin:[0,0,0],cellSize:.2,pingPong:!1,config:{...Oe,...e},frameCounter:0}),[n,a]=o.useState({running:!1,frame:0,time:0,initialized:!1,error:null}),l=o.useRef(!1),[u,y]=o.useState(null),[c,x]=o.useState(null),h=o.useRef(0),d=o.useRef(!1),v=o.useRef(0),f=o.useRef(0),m=o.useRef(!0),M=o.useCallback((i,r)=>{const s=Ne(i.restitution,i.stiffness),p=s*i.tangentialRatio,_=_e(i.stiffness),b=Math.min(i.dt,_);return Ze({particleCount:i.particleCount,radius:i.radius,kn:i.stiffness,kt:i.stiffness*i.tangentialRatio,dampingN:s,dampingT:p,friction:i.friction,restitution:i.restitution,gravity:[0,i.gravity,0],dt:b,hourglassRadiusTop:i.hourglassRadiusTop,hourglassYMin:i.hourglassYMin,hourglassYMax:i.hourglassYMax,spawnXMin:i.spawnXMin,spawnXMax:i.spawnXMax,spawnYMin:i.spawnYMin,spawnYMax:i.spawnYMax,spawnZMin:i.spawnZMin,spawnZMax:i.spawnZMax,respawnYThreshold:i.respawnYThreshold,seed:r,hourglassRadiusWaist:i.hourglassRadiusWaist,topCapEnabled:i.topCapEnabled?1:0,geometryType:i.geometryType,gyroidScale:i.gyroidScale,gyroidThreshold:i.gyroidThreshold,helixPitch:i.helixPitch??.35,helixRadius:i.helixRadius??.4,helixShaftRadius:i.helixShaftRadius??.08,helixThickness:i.helixThickness??.05,stadiumMajorRadius:i.stadiumMajorRadius??.5,stadiumStraightLength:i.stadiumStraightLength??1,stadiumTubeRadius:i.stadiumTubeRadius??.5})},[]),S=o.useCallback((i,r,s,p)=>{const _=new ArrayBuffer(ge),b=new Uint32Array(_),z=new Float32Array(_);return b[0]=i.particleCount,b[1]=r[0],b[2]=r[1],b[3]=r[2],z[4]=p,z[5]=s[0],z[6]=s[1],z[7]=s[2],_},[]);o.useEffect(()=>{f.current+=1;const i=f.current;return m.current=!0,(async()=>{try{const s=await Ge();if(!s){m.current&&f.current===i&&a(E=>({...E,error:"WebGPU not available"}));return}if(!m.current||f.current!==i){s.destroy();return}t.current.device=s;const p=t.current.config,_=p.radius*2,b=Ve(p,_),z=p.geometryType===1,C=(p.hourglassYMax-p.hourglassYMin)/6,G=[z?-C:p.spawnXMin-_,p.hourglassYMin-_,z?-C:p.spawnZMin-_];t.current.gridDimensions=b,t.current.gridMin=G,t.current.cellSize=_;const k=Ae(s,p.particleCount,be);t.current.buffers=k;const U=Ie(s,p.particleCount,b);t.current.hashBuffers=U;const B=s.createBuffer({size:ge,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"gyroid_hash_params"});t.current.hashParams=B;const W=S(p,b,G,_);s.queue.writeBuffer(B,0,W);const X=(ae[p.preset]||ae.default).generator(p.particleCount,p);he(s,k,X.positions,X.velocities);const ie=M(p,0);s.queue.writeBuffer(k.params,0,ie);const j=s.createBindGroupLayout({entries:[me(0),te(1),te(2),ne(3),ne(4),ne(5)],label:"gyroid_main_bind_group_layout"});t.current.bindGroupLayout=j;const T=s.createBindGroupLayout({entries:[me(0),te(1),te(2)],label:"gyroid_hash_bind_group_layout"});t.current.hashBindGroupLayout=T;const q=s.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:6,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}}],label:"gyroid_hash_build_layout"});t.current.hashBuildLayout=q;const L=s.createPipelineLayout({bindGroupLayouts:[j,T],label:"gyroid_force_pipeline_layout"}),se=s.createPipelineLayout({bindGroupLayouts:[j],label:"gyroid_integrate_pipeline_layout"}),K=s.createPipelineLayout({bindGroupLayouts:[q],label:"gyroid_hash_build_pipeline_layout"}),$=s.createShaderModule({code:Ue,label:"gyroid_flow_shader"}),N=s.createShaderModule({code:He,label:"gyroid_hash_shader"}),I=s.createComputePipeline({layout:L,compute:{module:$,entryPoint:"computeForces"},label:"gyroid_forces"}),Z=s.createComputePipeline({layout:se,compute:{module:$,entryPoint:"integrate"},label:"gyroid_integrate"});t.current.forcesPipeline=I,t.current.integratePipeline=Z;const O=s.createComputePipeline({layout:K,compute:{module:N,entryPoint:"resetCellCounts"},label:"gyroid_reset_cell_counts"}),re=s.createComputePipeline({layout:K,compute:{module:N,entryPoint:"buildHash"},label:"gyroid_build_hash"});t.current.hashPipelines={resetCellCounts:O,buildHash:re},m.current&&f.current===i&&(y(new Float32Array(X.positions)),x(new Float32Array(X.velocities)),a(E=>({...E,initialized:!0})),p.autoStart&&(l.current=!0,a(E=>({...E,running:!0}))))}catch(s){m.current&&f.current===i&&a(p=>({...p,error:s instanceof Error?s.message:"Unknown error"}))}})(),()=>{m.current=!1,t.current.buffers&&Be(t.current.buffers),t.current.hashBuffers&&Le(t.current.hashBuffers),t.current.hashParams&&t.current.hashParams.destroy(),t.current.device&&t.current.device.destroy()}},[M,S]),xe(()=>{const{device:i,buffers:r,hashBuffers:s,hashParams:p,forcesPipeline:_,integratePipeline:b,hashPipelines:z,bindGroupLayout:C,hashBindGroupLayout:G,hashBuildLayout:k,gridDimensions:U,config:B}=t.current;if(!i||!r||!s||!p||!_||!b||!z||!C||!G||!k||!l.current)return;const W=pe(B.particleCount,Me),ce=U[0]*U[1]*U[2],X=pe(ce,Ee),ie=_e(B.stiffness),j=Math.min(B.dt,ie);let T=t.current.pingPong;t.current.frameCounter++;const q=M(B,t.current.frameCounter);i.queue.writeBuffer(r.params,0,q);const L=i.createCommandEncoder(),se=16;for(let I=0;I<se;I++){const Z=T?r.positionsB:r.positionsA,O=T?r.positionsA:r.positionsB,re=T?r.velocitiesB:r.velocitiesA,E=T?r.velocitiesA:r.velocitiesB,ue=i.createBindGroup({layout:k,entries:[{binding:0,resource:{buffer:p}},{binding:1,resource:{buffer:Z}},{binding:3,resource:{buffer:s.cellCounts}},{binding:6,resource:{buffer:s.cellParticles}}]}),Q=L.beginComputePass();Q.setPipeline(z.resetCellCounts),Q.setBindGroup(0,ue),Q.dispatchWorkgroups(X),Q.end();const J=L.beginComputePass();J.setPipeline(z.buildHash),J.setBindGroup(0,ue),J.dispatchWorkgroups(W),J.end();const de=fe(i,C,[{binding:0,resource:{buffer:r.params}},{binding:1,resource:{buffer:Z}},{binding:2,resource:{buffer:re}},{binding:3,resource:{buffer:O}},{binding:4,resource:{buffer:E}},{binding:5,resource:{buffer:r.forces}}]),we=fe(i,G,[{binding:0,resource:{buffer:p}},{binding:1,resource:{buffer:s.cellCounts}},{binding:2,resource:{buffer:s.cellParticles}}]),V=L.beginComputePass();V.setPipeline(_),V.setBindGroup(0,de),V.setBindGroup(1,we),V.dispatchWorkgroups(W),V.end();const ee=L.beginComputePass();ee.setPipeline(b),ee.setBindGroup(0,de),ee.dispatchWorkgroups(W),ee.end(),T=!T,v.current+=j}h.current++,t.current.pingPong=T;const K=T?r.positionsB:r.positionsA,$=T?r.velocitiesB:r.velocitiesA,N=!d.current;if(N&&(L.copyBufferToBuffer(K,0,r.stagingPositions,0,B.particleCount*16),L.copyBufferToBuffer($,0,r.stagingVelocities,0,B.particleCount*16)),i.queue.submit([L.finish()]),a(I=>({...I,frame:h.current,time:v.current})),N){d.current=!0;const I=f.current;Promise.all([r.stagingPositions.mapAsync(GPUMapMode.READ),r.stagingVelocities.mapAsync(GPUMapMode.READ)]).then(()=>{if(!m.current||f.current!==I){try{r.stagingPositions.unmap(),r.stagingVelocities.unmap()}catch{}return}const Z=new Float32Array(r.stagingPositions.getMappedRange().slice(0)),O=new Float32Array(r.stagingVelocities.getMappedRange().slice(0));r.stagingPositions.unmap(),r.stagingVelocities.unmap(),y(Z),x(O),d.current=!1}).catch(()=>{d.current=!1})}});const P=o.useCallback(()=>{l.current=!0,a(i=>({...i,running:!0}))},[]),w=o.useCallback(()=>{l.current=!1,a(i=>({...i,running:!1}))},[]),D=o.useCallback(()=>{l.current=!l.current,a(i=>({...i,running:l.current}))},[]),Y=o.useCallback(()=>{const{device:i,buffers:r,config:s}=t.current;if(!i||!r)return;f.current+=1;const _=(ae[s.preset]||ae.default).generator(s.particleCount,s);he(i,r,_.positions,_.velocities),t.current.pingPong=!1,t.current.frameCounter=0,h.current=0,v.current=0,d.current=!1,y(new Float32Array(_.positions)),x(new Float32Array(_.velocities)),a(b=>({...b,frame:0,time:0}))},[]),R=o.useCallback(i=>{const{device:r,buffers:s,config:p}=t.current;t.current.config={...p,...i};const _=t.current.config;if(r&&s){const b=M(_,t.current.frameCounter);r.queue.writeBuffer(s.params,0,b)}},[M]);return[n,{start:P,pause:w,toggle:D,reset:Y,updateConfig:R},u,c,t.current.config]}const Ke=({radiusTop:e,radiusWaist:t,yMin:n,yMax:a,showTopCap:l=!0})=>{const u=o.useMemo(()=>new oe({color:8956620,transparent:!0,opacity:.2,roughness:.1,metalness:0,side:le,depthWrite:!1}),[]),y=o.useMemo(()=>{const x=a-n,h=n+x*.5,d=x*.5,v=64,f=[];for(let m=0;m<=v;m++){const M=n+m/v*x,S=(M-h)/d,P=t+(e-t)*S*S;f.push(new Fe(P,M))}return new Te(f,64)},[e,t,n,a]),c=o.useMemo(()=>new Ye(e,64),[e]);return A("group",{children:[g("mesh",{geometry:y,material:u}),g("mesh",{geometry:c,material:u,position:[0,n,0],rotation:[-Math.PI/2,0,0]}),l&&g("mesh",{geometry:c,material:u,position:[0,a,0],rotation:[Math.PI/2,0,0]})]})},$e=`
varying vec3 vWorldPosition;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`,Qe=`
precision highp float;

uniform float stadiumMajorRadius;
uniform float stadiumStraightLength;
uniform float stadiumTubeRadius;
uniform float helixRadius;
uniform float helixShaftRadius;
uniform float helixPitch;
uniform float helixThickness;

varying vec3 vWorldPosition;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;
const int MAX_STEPS = 64;
const float MAX_DIST = 20.0;
const float SURF_DIST = 0.002;

// Helix SDF with height limits
float sdHelix(vec3 p, float R, float pitch, float shaftR, float thickness) {
  float heightLimit = stadiumStraightLength - 0.05;
  float clampedY = clamp(p.y, -heightLimit, heightLimit);
  vec3 clampedP = vec3(p.x, clampedY, p.z);

  if (abs(p.y) > heightLimit + 0.1) {
    return length(p.xz) - shaftR + abs(p.y) - heightLimit;
  }

  float shaftDist = length(clampedP.xz) - shaftR;
  float k = pitch / TAU;
  float angle = atan(clampedP.z, clampedP.x);
  float expectedY = k * angle;
  float r = length(clampedP.xz);

  if (r > shaftR * 0.9 && r < R) {
    float dy = mod(clampedP.y - expectedY + pitch * 0.5, pitch) - pitch * 0.5;
    float bladeDist = abs(dy) - thickness;
    float bladeWeight = smoothstep(shaftR * 0.9, shaftR * 1.1, r);
    return mix(shaftDist, min(shaftDist, bladeDist), bladeWeight);
  }

  return shaftDist;
}

float sceneSDF(vec3 p) {
  vec3 helixP = vec3(p.x, p.y, p.z - stadiumMajorRadius);
  return sdHelix(helixP, helixRadius, helixPitch, helixShaftRadius, helixThickness);
}

vec3 getNormal(vec3 p) {
  float eps = 0.002;
  return normalize(vec3(
    sceneSDF(p + vec3(eps, 0.0, 0.0)) - sceneSDF(p - vec3(eps, 0.0, 0.0)),
    sceneSDF(p + vec3(0.0, eps, 0.0)) - sceneSDF(p - vec3(0.0, eps, 0.0)),
    sceneSDF(p + vec3(0.0, 0.0, eps)) - sceneSDF(p - vec3(0.0, 0.0, eps))
  ));
}

float raymarch(vec3 ro, vec3 rd) {
  float d = 0.0;
  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 p = ro + rd * d;
    float dist = sceneSDF(p);
    d += dist * 0.8;
    if (abs(dist) < SURF_DIST || d > MAX_DIST) break;
  }
  return d;
}

void main() {
  vec3 ro = cameraPosition;
  vec3 rd = normalize(vWorldPosition - cameraPosition);

  float d = raymarch(ro, rd);

  if (d >= MAX_DIST - 0.1) {
    discard;
  }

  vec3 p = ro + rd * d;
  vec3 n = getNormal(p);

  vec3 lightDir = normalize(vec3(1.0, 2.0, 1.0));
  float diff = max(dot(n, lightDir), 0.0);
  float amb = 0.35;

  vec3 color = vec3(0.75, 0.85, 0.95);
  vec3 finalColor = color * (amb + diff * 0.65);

  gl_FragColor = vec4(finalColor, 1.0);
}
`,Je=({majorRadius:e,straightLength:t,tubeRadius:n,helixRadius:a,helixShaftRadius:l,helixPitch:u,helixThickness:y})=>{const c=o.useMemo(()=>({stadiumMajorRadius:{value:e},stadiumStraightLength:{value:t},stadiumTubeRadius:{value:n},helixRadius:{value:a},helixShaftRadius:{value:l},helixPitch:{value:u},helixThickness:{value:y}}),[e,t,n,a,l,u,y]),x=(e+n)*2+.5,h=t*2+n*2+.5,d=o.useMemo(()=>{const f=Math.PI,m=2*Math.PI,M=[],S=[],P=24,w=80,D=R=>{R=(R%1+1)%1;const F=f*e,i=2*F+2*t*2,r=R*i;if(r<t*2)return new H(-t+r,0,-e);if(r<t*2+F){const s=-f/2+(r-t*2)/e;return new H(t+e*Math.cos(s),0,e*Math.sin(s))}else if(r<t*4+F){const s=r-t*2-F;return new H(t-s,0,e)}else{const s=f/2+(r-t*4-F)/e;return new H(-t+e*Math.cos(s),0,e*Math.sin(s))}};for(let R=0;R<=w;R++){const F=R/w,i=D(F),r=D((F+.001)%1),s=new H().subVectors(r,i).normalize(),p=new H(0,1,0),_=new H().crossVectors(s,p).normalize(),b=new H().crossVectors(_,s).normalize();for(let z=0;z<=P;z++){const C=z/P*m,G=Math.cos(C),k=Math.sin(C);M.push(i.x+n*(G*_.x+k*b.x),i.y+n*(G*_.y+k*b.y),i.z+n*(G*_.z+k*b.z))}}for(let R=0;R<w;R++)for(let F=0;F<P;F++){const i=R*(P+1)+F,r=i+1,s=i+(P+1),p=s+1;S.push(i,s,r,r,s,p)}const Y=new ye;return Y.setAttribute("position",new ve(new Float32Array(M),3)),Y.setIndex(S),Y.computeVertexNormals(),Y},[e,t,n]),v=o.useMemo(()=>new oe({color:4491434,transparent:!0,opacity:.25,side:le,depthWrite:!1}),[]);return A("group",{rotation:[0,0,Math.PI/2],children:[g("mesh",{geometry:d,material:v}),A("mesh",{children:[g("boxGeometry",{args:[x,h,x]}),g("shaderMaterial",{vertexShader:$e,fragmentShader:Qe,uniforms:c,side:Ce,transparent:!1,depthWrite:!0})]})]})},et=({yMin:e,yMax:t,showTopCap:n=!0})=>{const a=o.useMemo(()=>new oe({color:8956620,transparent:!0,opacity:.15,roughness:.1,metalness:0,side:le,depthWrite:!1}),[]),u=(t-e)/3,y=e+u,c=t-u,x=(y+c)/2,h=.4,d=4*Math.PI/u,v=o.useMemo(()=>{const{positions:f}=Xe(u,d,h,40),m=new ye;return m.setAttribute("position",new ve(f,3)),m.computeVertexNormals(),m},[u,d,h]);return A("group",{children:[g("mesh",{position:[0,e+u/2,0],material:a,children:g("boxGeometry",{args:[u,u,u]})}),A("lineSegments",{position:[0,x,0],children:[g("edgesGeometry",{args:[new ke(u,u,u)]}),g("lineBasicMaterial",{color:8956620,transparent:!0,opacity:.3})]}),g("mesh",{position:[0,x,0],geometry:v,material:a}),n&&g("mesh",{position:[0,t-u/2,0],material:a,children:g("boxGeometry",{args:[u,u,u]})})]})},tt=10,at=2,it=({config:e,showHourglass:t=!0,resetTrigger:n=0})=>{const[a,l,u,y,c]=qe({...e,autoStart:!0}),[x,h]=o.useState(e.geometryType??0);o.useEffect(()=>{e.geometryType!==void 0&&e.geometryType!==x&&(h(e.geometryType),l.updateConfig({geometryType:e.geometryType}))},[e.geometryType,x,l]);const d=o.useRef(null),v=o.useRef(0),f=o.useRef(0),m=o.useRef(!1),M=o.useRef(0),S=o.useRef(!1),[P,w]=o.useState(!1),D=o.useRef(n),Y=o.useRef(l);Y.current=l,o.useEffect(()=>{n!==D.current&&a.initialized&&(D.current=n,Y.current.updateConfig({geometryType:e.geometryType,spawnXMin:e.spawnXMin,spawnXMax:e.spawnXMax,spawnYMin:e.spawnYMin,spawnYMax:e.spawnYMax,spawnZMin:e.spawnZMin,spawnZMax:e.spawnZMax,gravity:-9.81,topCapEnabled:!1}),Y.current.reset(),v.current=0,f.current=0,m.current=!1,M.current=0,S.current=!1,w(!1),d.current&&(d.current.rotation.z=0))},[n,a.initialized,e]);const R=(c.hourglassYMin+c.hourglassYMax)/2;return xe((F,i)=>{if(v.current+=i,!m.current&&v.current>=tt&&(S.current||(S.current=!0,w(!0),l.updateConfig({topCapEnabled:!0})),m.current=!0,M.current=f.current+Math.PI,v.current=0),m.current&&d.current){const r=v.current,s=Math.min(r/at,1),p=s<.5?2*s*s:1-Math.pow(-2*s+2,2)/2,b=M.current-Math.PI+p*Math.PI;if(d.current.rotation.z=b,s>=.5&&f.current!==M.current){f.current=M.current;const C=Math.round(f.current/Math.PI)%2===1?9.81:-9.81;l.updateConfig({gravity:C})}s>=1&&(m.current=!1,d.current.rotation.z=M.current)}}),a.error?A("mesh",{children:[g("boxGeometry",{args:[1,1,1]}),g("meshBasicMaterial",{color:"red"})]}):A(ze,{children:[g("group",{ref:d,position:[0,R,0],children:A("group",{position:[0,-R,0],children:[t&&x===0&&g(Ke,{radiusTop:c.hourglassRadiusTop,radiusWaist:c.hourglassRadiusWaist,yMin:c.hourglassYMin,yMax:c.hourglassYMax,showTopCap:P}),t&&x===1&&g(et,{yMin:c.hourglassYMin,yMax:c.hourglassYMax,showTopCap:P}),t&&x===2&&g(Je,{majorRadius:c.stadiumMajorRadius??.8,straightLength:c.stadiumStraightLength??1.25,tubeRadius:c.stadiumTubeRadius??.5,helixRadius:(c.stadiumTubeRadius??.5)*.8,helixShaftRadius:c.helixShaftRadius??.08,helixPitch:c.helixPitch??.35,helixThickness:c.helixThickness??.05}),u&&y&&g(De,{positions:u,velocities:y,particleCount:c.particleCount,config:x===1?{pointSize:1,colorMode:1,fieldType:5,colormap:3,colormapReversed:!1,fieldMin:0,fieldMax:1,blendMode:2,brightness:1.2,gaussianSigma:.4,gyroidScale:c.gyroidScale,gyroidYMin:c.hourglassYMin+(c.hourglassYMax-c.hourglassYMin)/3,gyroidYMax:c.hourglassYMax-(c.hourglassYMax-c.hourglassYMin)/3}:{pointSize:1,colorMode:1,fieldType:0,colormap:4,colormapReversed:!0,fieldMin:0,fieldMax:5,blendMode:2,brightness:1.2,gaussianSigma:.4}})]})}),g("ambientLight",{intensity:.5}),g("directionalLight",{position:[5,10,5],intensity:1})]})},ft=({className:e="",particleCount:t=1e4,showHourglass:n=!0,geometryType:a=0})=>{const[l,u]=o.useState(null),y=o.useRef(null),[c,x]=o.useState(0),h=o.useRef(a);if(o.useEffect(()=>{(async()=>{if(typeof navigator>"u"||!("gpu"in navigator)){u(!1);return}try{const D=await navigator.gpu.requestAdapter();u(D!==null)}catch{u(!1)}})()},[]),o.useEffect(()=>{a!==h.current&&(h.current=a,x(w=>w+1))},[a]),l===null)return g("div",{ref:y,className:`${e} flex items-center justify-center bg-primary`,children:g("div",{className:"text-tertiary/50 text-sm",children:"Checking WebGPU..."})});if(!l)return g("div",{ref:y,className:`${e} flex items-center justify-center bg-primary`,children:g("div",{className:"text-tertiary/50 text-sm text-center px-4",children:"WebGPU not supported in this browser"})});const d=2,v=.8,f=1.25,m=.5,S=(()=>{if(a===0)return{spawnXMin:-1,spawnXMax:1,spawnYMin:6.5,spawnYMax:8.5,spawnZMin:-1,spawnZMax:1};if(a===1)return{spawnXMin:-d/2*.8,spawnXMax:d/2*.8,spawnYMin:4.5,spawnYMax:5.8,spawnZMin:-d/2*.8,spawnZMax:d/2*.8};{const w=m*.7;return{spawnXMin:-w,spawnXMax:w,spawnYMin:f*.5,spawnYMax:f*.95,spawnZMin:v-w,spawnZMax:v+w}}})(),P={particleCount:t,radius:a===2?.03:.06,radiusMin:a===2?.02:.04,radiusMax:a===2?.04:.08,stiffness:15e3,friction:.3,restitution:.4,gravity:a===2?-4:-9.81,hourglassRadiusTop:1.25,hourglassRadiusWaist:.25,hourglassYMin:0,hourglassYMax:6,...S,respawnYThreshold:-10,topCapEnabled:!1,geometryType:a,gyroidScale:4*Math.PI/d,gyroidThreshold:.4,stadiumMajorRadius:v,stadiumStraightLength:f,stadiumTubeRadius:m,helixPitch:.35,helixRadius:m*.8,helixShaftRadius:.08,helixThickness:.05};return g("div",{ref:y,className:`${e} bg-primary`,children:A(Se,{dpr:[1,1.5],gl:{antialias:!0,alpha:!0},style:{background:"transparent"},children:[g(Pe,{makeDefault:!0,position:[8,5,8],fov:45}),g(Re,{target:[0,3,0],enableZoom:!1,enablePan:!1,autoRotate:!0,autoRotateSpeed:.5,minPolarAngle:Math.PI/6,maxPolarAngle:Math.PI/2}),g(it,{config:P,showHourglass:n,resetTrigger:c})]})})};export{ft as default};
