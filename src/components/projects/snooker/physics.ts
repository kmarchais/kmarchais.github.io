/**
 * Snooker ball physics.
 *
 * Coordinates: SI units. World is in meters; +x is along the length of the
 * table (baulk to top cushion), +y across the width, +z up. Balls move in
 * the xy plane.
 *
 * Each ball has:
 *   pos:  position in the table plane (x, y), meters
 *   vel:  linear velocity (vx, vy), m/s
 *   spin: angular velocity (wx, wy, wz), rad/s.
 *         wz is rotation about the vertical axis (side English).
 *         (wx, wy) is rotation about horizontal axes (top/back spin).
 *
 * Slip velocity at the contact point on the cloth (point directly below
 * ball center, offset by -R in z) is:
 *   s = v + omega x r,  where r = (0, 0, -R)
 *     = (vx - R*wy,  vy + R*wx,  0)
 * So the horizontal slip components are:
 *   s_x = vx - R*wy
 *   s_y = vy + R*wx
 *
 * Friction model:
 *   - If |s| > eps: sliding. Friction force = -mu_s * m * g * (s / |s|).
 *     Friction also produces a torque about horizontal axes that drives
 *     ball toward rolling.
 *   - If |s| < eps: rolling. Use a much smaller mu_r decelerating the
 *     linear velocity along its direction.
 *   - wz (side spin) decays under a small spin-axis friction independently.
 *
 * Collisions:
 *   - Ball-ball: elastic-ish (coefficient of restitution e_bb), normal
 *     impulse along center-line, tangential impulse zero (skips spin
 *     transfer in v1).
 *   - Ball-cushion: reflect normal velocity with restitution e_c; small
 *     tangential damping; loses some spin.
 *
 * Pockets: when a ball center enters a pocket disk, ball is removed.
 */

export const BALL_RADIUS = 0.02625;          // 26.25 mm
export const BALL_MASS = 0.142;              // 142 g
const I_BALL = (2 / 5) * BALL_MASS * BALL_RADIUS * BALL_RADIUS;
const INV_I_BALL = 1 / I_BALL;
const GRAVITY = 9.81;

// Material constants (snooker-cloth-on-phenolic estimates from literature).
const MU_SLIDING = 0.21;       // ball sliding on cloth
const MU_ROLLING = 0.012;      // ball rolling on cloth
const MU_VERTICAL_SPIN = 0.045; // decay of side English
const E_BALL_BALL = 0.94;      // restitution
const E_CUSHION = 0.6;         // restitution against cushion
const MU_CUSHION = 0.2;        // cushion tangential damping
const SLIP_EPSILON = 1e-3;     // m/s — below this, treat as rolling
const VELOCITY_REST_EPSILON = 0.005; // m/s — below this, ball is at rest

export const BALL_DIAMETER = 2 * BALL_RADIUS;
export const BALL_DIAMETER_SQ = BALL_DIAMETER * BALL_DIAMETER;

// ---------------------------------------------------------------------------

export type BallColor =
  | 'cue'
  | 'red'
  | 'yellow'
  | 'green'
  | 'brown'
  | 'blue'
  | 'pink'
  | 'black';

export interface Ball {
  id: number;
  color: BallColor;
  pos: [number, number];
  vel: [number, number];
  /** Angular velocity: (wx, wy, wz). */
  spin: [number, number, number];
  /** Original spot position so colors can be re-spotted. */
  spot?: [number, number];
  onTable: boolean;
}

// ---------------------------------------------------------------------------
// Cue impact
// ---------------------------------------------------------------------------

/** Cue ball point-of-impact in normalized local coordinates.
 *  yOffset, zOffset in [-1, 1] (clamped to a disk |.|<=1).
 *  yOffset > 0 = hit on the LEFT side of the ball (looking down the cue).
 *  zOffset > 0 = hit ABOVE center → top spin.
 */
export interface CueImpact {
  /** Initial speed imparted to the ball center along cue direction, m/s. */
  speed: number;
  /** Cue direction unit vector (where the ball is going to head). */
  dir: [number, number];
  /** Vertical offset of impact, normalized to ball radius. >0 = above center. */
  zOffset: number;
  /** Horizontal offset of impact, normalized to ball radius. >0 = left side. */
  yOffset: number;
}

/**
 * Apply a cue strike to a ball at rest. Sets vel and spin from the cue
 * impact parameters. The impulse J = m * speed (along cue direction).
 * Torque about ball center = r_contact × J.
 *
 * In a frame where the cue points in +x:
 *   r_contact = (-R, y_offset*R, z_offset*R)
 *   J         = m*speed * (1, 0, 0)
 *   tau       = J * (0, z_offset*R, -y_offset*R)
 *   omega     = tau / I  ⇒  (0, speed*z_offset / ((2/5)*R), -speed*y_offset / ((2/5)*R))
 *
 * Then rotate (wy, wz) into world frame using the cue direction.
 */
export function applyCueImpact(ball: Ball, impact: CueImpact): void {
  const { speed, dir, yOffset, zOffset } = impact;
  // Linear velocity along cue direction.
  ball.vel[0] = speed * dir[0];
  ball.vel[1] = speed * dir[1];

  // Angular velocity in cue-local frame: wy (top/back), wz (side).
  // In the local frame, +x is cue direction, +y is left, +z is up.
  // wy_local =  speed * zOffset / ((2/5) * R)
  // wz_local = -speed * yOffset / ((2/5) * R)
  const k = speed / ((2 / 5) * BALL_RADIUS);
  const wyLocal = k * zOffset;
  const wzLocal = -k * yOffset;

  // World transform: wy_local is about an axis perpendicular to dir, in the
  // table plane, pointing to the LEFT of dir. That world axis is (-dir[1], dir[0]).
  // wz_local is about world +z.
  ball.spin[0] = wyLocal * -dir[1];
  ball.spin[1] = wyLocal *  dir[0];
  ball.spin[2] = wzLocal;
}

// ---------------------------------------------------------------------------
// Physics step
// ---------------------------------------------------------------------------

/** Integrate friction forces (cloth on ball) over dt for a single ball. */
function integrateFriction(ball: Ball, dt: number): void {
  const [vx, vy] = ball.vel;
  const [wx, wy, wz] = ball.spin;

  // Slip velocity at contact (horizontal components).
  const sx = vx - BALL_RADIUS * wy;
  const sy = vy + BALL_RADIUS * wx;
  const sMag = Math.hypot(sx, sy);

  if (sMag > SLIP_EPSILON) {
    // Sliding friction: opposes slip direction at the contact point.
    const muG = MU_SLIDING * GRAVITY;
    const fx = -muG * (sx / sMag);
    const fy = -muG * (sy / sMag);
    // Update linear velocity (a = F/m, and -muG already has units of accel).
    ball.vel[0] = vx + fx * dt;
    ball.vel[1] = vy + fy * dt;
    // Torque from friction force F at contact point r = (0, 0, -R):
    //   tau = r × F  with r_z = -R, F_z = 0
    //   tau_x = r_y * F_z - r_z * F_y =  R * fy
    //   tau_y = r_z * F_x - r_x * F_z = -R * fx
    // alpha = tau / I, so:
    const alphaX =  BALL_RADIUS * fy * INV_I_BALL;
    const alphaY = -BALL_RADIUS * fx * INV_I_BALL;
    ball.spin[0] = wx + alphaX * dt;
    ball.spin[1] = wy + alphaY * dt;

    // Sanity guard: friction should not flip slip direction within a substep.
    // Compute new slip; if it has reversed sign, clamp to zero (snap to rolling).
    const sx2 = ball.vel[0] - BALL_RADIUS * ball.spin[1];
    const sy2 = ball.vel[1] + BALL_RADIUS * ball.spin[0];
    if (sx * sx2 + sy * sy2 < 0) {
      // Slip reversed, snap to pure rolling: enforce s = 0.
      ball.spin[0] = -ball.vel[1] / BALL_RADIUS;
      ball.spin[1] =  ball.vel[0] / BALL_RADIUS;
    }
  } else {
    // Rolling: linear deceleration along velocity direction.
    const vMag = Math.hypot(vx, vy);
    if (vMag > VELOCITY_REST_EPSILON) {
      const dec = MU_ROLLING * GRAVITY;
      const dv = dec * dt;
      const factor = Math.max(0, (vMag - dv) / vMag);
      ball.vel[0] = vx * factor;
      ball.vel[1] = vy * factor;
      // Maintain rolling constraint.
      ball.spin[0] = -ball.vel[1] / BALL_RADIUS;
      ball.spin[1] =  ball.vel[0] / BALL_RADIUS;
    } else {
      ball.vel[0] = 0;
      ball.vel[1] = 0;
      ball.spin[0] = 0;
      ball.spin[1] = 0;
    }
  }

  // Side English decays under a small vertical-axis friction.
  const wzAbs = Math.abs(wz);
  if (wzAbs > 0) {
    const dwz = MU_VERTICAL_SPIN * GRAVITY * dt / BALL_RADIUS;
    if (wzAbs < dwz) ball.spin[2] = 0;
    else ball.spin[2] = wz - Math.sign(wz) * dwz;
  }
}

/** Step ball positions from velocities. */
function advancePositions(balls: Ball[], dt: number): void {
  for (const b of balls) {
    if (!b.onTable) continue;
    b.pos[0] += b.vel[0] * dt;
    b.pos[1] += b.vel[1] * dt;
  }
}

// ---------------------------------------------------------------------------
// Ball-ball collisions
// ---------------------------------------------------------------------------

/** Resolve a single pair of balls overlapping. Returns true if a collision
 *  was processed (and updates `firstHit` log if provided). */
function resolveBallPair(a: Ball, b: Ball): boolean {
  const dx = b.pos[0] - a.pos[0];
  const dy = b.pos[1] - a.pos[1];
  const distSq = dx * dx + dy * dy;
  if (distSq >= BALL_DIAMETER_SQ || distSq === 0) return false;
  const dist = Math.sqrt(distSq);
  const nx = dx / dist;
  const ny = dy / dist;

  // Push apart so they no longer overlap.
  const overlap = BALL_DIAMETER - dist;
  a.pos[0] -= nx * overlap * 0.5;
  a.pos[1] -= ny * overlap * 0.5;
  b.pos[0] += nx * overlap * 0.5;
  b.pos[1] += ny * overlap * 0.5;

  // Relative velocity along normal.
  const rvx = b.vel[0] - a.vel[0];
  const rvy = b.vel[1] - a.vel[1];
  const vn = rvx * nx + rvy * ny;
  if (vn >= 0) return true; // already separating

  // Equal masses → swap normal components, scaled by restitution.
  const j = -(1 + E_BALL_BALL) * vn * 0.5;
  a.vel[0] -= j * nx;
  a.vel[1] -= j * ny;
  b.vel[0] += j * nx;
  b.vel[1] += j * ny;
  return true;
}

/** Resolve all ball-ball collisions in this substep. Returns the colors of
 *  the FIRST ball other than the cue ball that the cue ball touches (if any),
 *  in the order they were touched. */
function resolveBallCollisions(
  balls: Ball[],
  cueFirstHit: { color: BallColor | null }
): void {
  for (let i = 0; i < balls.length; i++) {
    const a = balls[i];
    if (!a.onTable) continue;
    for (let j = i + 1; j < balls.length; j++) {
      const b = balls[j];
      if (!b.onTable) continue;
      const hit = resolveBallPair(a, b);
      if (hit && cueFirstHit.color === null) {
        if (a.color === 'cue' && b.color !== 'cue') cueFirstHit.color = b.color;
        else if (b.color === 'cue' && a.color !== 'cue') cueFirstHit.color = a.color;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Cushion collisions
// ---------------------------------------------------------------------------

/**
 * An arbitrary line segment cushion. The outward normal points AWAY from the
 * playing surface (toward the cushion / rail / wall). Collision is detected
 * via closest-point-on-segment plus a side check so balls that have already
 * passed the cushion (into a pocket bay) are not pushed back into play.
 */
export interface CushionSegment {
  p1: [number, number];
  p2: [number, number];
  /** Unit outward normal (away from playing surface). */
  normal: [number, number];
}

function resolveCushion(ball: Ball, c: CushionSegment): boolean {
  const sx = c.p2[0] - c.p1[0];
  const sy = c.p2[1] - c.p1[1];
  const segLen2 = sx * sx + sy * sy;
  if (segLen2 < 1e-12) return false;

  // Project ball onto the segment line.
  const rx = ball.pos[0] - c.p1[0];
  const ry = ball.pos[1] - c.p1[1];
  const t = (rx * sx + ry * sy) / segLen2;
  const tClamped = t < 0 ? 0 : t > 1 ? 1 : t;
  const closestX = c.p1[0] + tClamped * sx;
  const closestY = c.p1[1] + tClamped * sy;

  const cdx = ball.pos[0] - closestX;
  const cdy = ball.pos[1] - closestY;
  const dist2 = cdx * cdx + cdy * cdy;
  if (dist2 > BALL_RADIUS * BALL_RADIUS) return false;

  // Side check: skip if the ball is on the OUTSIDE of the cushion (i.e.,
  // in the pocket bay). The pocket disks will catch those.
  // Outside means (ball - closest) is in the +normal direction.
  if (cdx * c.normal[0] + cdy * c.normal[1] > BALL_RADIUS * 0.25) return false;

  const dist = Math.sqrt(Math.max(dist2, 1e-12));
  // Push direction: away from the closest point. For a ball on the playing
  // side, this is roughly -normal.
  const nx = cdx / dist;
  const ny = cdy / dist;
  const overlap = BALL_RADIUS - dist;
  ball.pos[0] += nx * overlap;
  ball.pos[1] += ny * overlap;

  // Reflect velocity if the ball is moving into the cushion (vn < 0).
  const vn = ball.vel[0] * nx + ball.vel[1] * ny;
  if (vn < 0) {
    const j = -(1 + E_CUSHION) * vn;
    ball.vel[0] += j * nx;
    ball.vel[1] += j * ny;
    // Tangential damping along the cushion line direction.
    const tx = -ny;
    const ty =  nx;
    const vt = ball.vel[0] * tx + ball.vel[1] * ty;
    const k = MU_CUSHION * 0.5;
    ball.vel[0] -= k * vt * tx;
    ball.vel[1] -= k * vt * ty;
    // Bleed off side-spin on the bump.
    ball.spin[2] *= 0.85;
    return true;
  }
  return false;
}

function resolveCushions(ball: Ball, cushions: CushionSegment[]): boolean {
  if (!ball.onTable) return false;
  let hit = false;
  for (const c of cushions) {
    if (resolveCushion(ball, c)) hit = true;
  }
  return hit;
}

// ---------------------------------------------------------------------------
// Pockets
// ---------------------------------------------------------------------------

export interface Pocket {
  pos: [number, number];
  /** Effective radius: ball is pocketed when its center is within this. */
  radius: number;
}

function checkPockets(balls: Ball[], pockets: Pocket[], pocketed: Ball[]): void {
  for (const b of balls) {
    if (!b.onTable) continue;
    for (const p of pockets) {
      const dx = b.pos[0] - p.pos[0];
      const dy = b.pos[1] - p.pos[1];
      if (dx * dx + dy * dy < p.radius * p.radius) {
        b.onTable = false;
        b.vel[0] = 0;
        b.vel[1] = 0;
        b.spin[0] = 0;
        b.spin[1] = 0;
        b.spin[2] = 0;
        pocketed.push(b);
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Public stepping API
// ---------------------------------------------------------------------------

export interface PhysicsWorld {
  balls: Ball[];
  cushions: CushionSegment[];
  pockets: Pocket[];
}

export interface ShotResult {
  /** Color of the first ball the cue ball touched (or null if none). */
  firstHit: BallColor | null;
  /** Balls that fell into pockets during this shot, in order. */
  pocketed: Ball[];
}

export function makeShotResult(): ShotResult {
  return { firstHit: null, pocketed: [] };
}

/** Returns true if any ball is moving. */
export function anyBallMoving(balls: Ball[]): boolean {
  for (const b of balls) {
    if (!b.onTable) continue;
    if (Math.hypot(b.vel[0], b.vel[1]) > VELOCITY_REST_EPSILON) return true;
  }
  return false;
}

/**
 * Step the physics world by `dt` seconds, subdividing into stable substeps.
 * Accumulates first-hit and pocketing info into the provided ShotResult.
 */
export function stepPhysics(
  world: PhysicsWorld,
  dt: number,
  result: ShotResult
): void {
  // Substep so fast balls don't tunnel through each other or cushions.
  // ~5 mm max travel per substep for the fastest plausible cue ball (~10 m/s).
  const maxStep = 0.001; // 1 ms
  const steps = Math.max(1, Math.ceil(dt / maxStep));
  const h = dt / steps;
  const cueHit = { color: result.firstHit };
  for (let s = 0; s < steps; s++) {
    advancePositions(world.balls, h);
    for (const b of world.balls) {
      if (!b.onTable) continue;
      integrateFriction(b, h);
    }
    resolveBallCollisions(world.balls, cueHit);
    for (const b of world.balls) {
      resolveCushions(b, world.cushions);
    }
    checkPockets(world.balls, world.pockets, result.pocketed);
  }
  result.firstHit = cueHit.color;
}
