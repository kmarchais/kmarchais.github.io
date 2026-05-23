/**
 * Standard 12-foot snooker table dimensions and initial ball layout.
 * All values in meters.
 *
 * Pocket geometry:
 *   The cushion is L-shaped at every pocket. The straight cushion stops at
 *   `JAW_OFFSET` from the pocket center, and an angled "jaw" segment turns
 *   INTO the playing surface. The two jaws around each pocket form a
 *   concave notch; the gap between their tips is the throat the ball
 *   passes through. The cushion material covers the wedge between the
 *   straight cushion ends and the corner of the playing surface, with the
 *   pocket hole sitting inside that wedge.
 *
 * Cushion line normals point AWAY from the playing surface (toward the
 * rail / pocket material).
 */

import { BALL_RADIUS, type Ball, type CushionSegment, type Pocket } from './physics';

// ---- Surface dimensions ---------------------------------------------------

export const TABLE_LENGTH = 3.569;
export const TABLE_WIDTH  = 1.778;

export const BAULK_LINE_FROM_BAULK_CUSHION = 0.737;
export const D_RADIUS = 0.292;

// ---- Spots ----------------------------------------------------------------

export const SPOT_BAULK_X = BAULK_LINE_FROM_BAULK_CUSHION;
export const SPOT_YELLOW: [number, number] = [SPOT_BAULK_X,  D_RADIUS];
export const SPOT_GREEN:  [number, number] = [SPOT_BAULK_X, -D_RADIUS];
export const SPOT_BROWN:  [number, number] = [SPOT_BAULK_X,  0];
export const SPOT_BLUE:   [number, number] = [TABLE_LENGTH * 0.5, 0];
export const SPOT_PINK:   [number, number] = [TABLE_LENGTH * 0.75, 0];
const BLACK_FROM_TOP = 0.3243;
export const SPOT_BLACK:  [number, number] = [TABLE_LENGTH - BLACK_FROM_TOP, 0];

// ---- Pocket geometry constants --------------------------------------------

const JAW_OFFSET_CORNER = 0.105;
const JAW_LENGTH_CORNER = 0.050;
const JAW_OFFSET_MIDDLE = 0.090;
const JAW_LENGTH_MIDDLE = 0.040;
const JAW_ANGLE_CORNER  = Math.PI / 4;          // 45° (jaw bends 45° INWARD off cushion direction)
const JAW_ANGLE_MIDDLE  = Math.PI / 3;          // 60° (steeper for middle pocket)

const COS_C = Math.cos(JAW_ANGLE_CORNER);
const SIN_C = Math.sin(JAW_ANGLE_CORNER);
const COS_M = Math.cos(JAW_ANGLE_MIDDLE);
const SIN_M = Math.sin(JAW_ANGLE_MIDDLE);

// Ball-capture pocket disks. Centered at the corner of the playing surface
// (or on the cushion line for middles); radius chosen so balls that pass
// through the throat reach the disk, but balls still on the playing surface
// side of the jaws do not.
const POCKET_R_CORNER = 0.072;
const POCKET_R_MIDDLE = 0.070;

const HALF_W = TABLE_WIDTH / 2;
const MID_X = TABLE_LENGTH / 2;

export const POCKETS: Pocket[] = [
  { pos: [0,            -HALF_W], radius: POCKET_R_CORNER },
  { pos: [0,             HALF_W], radius: POCKET_R_CORNER },
  { pos: [TABLE_LENGTH, -HALF_W], radius: POCKET_R_CORNER },
  { pos: [TABLE_LENGTH,  HALF_W], radius: POCKET_R_CORNER },
  { pos: [MID_X,        -HALF_W], radius: POCKET_R_MIDDLE },
  { pos: [MID_X,         HALF_W], radius: POCKET_R_MIDDLE },
];

// ---- Cushion + jaw segments ----------------------------------------------
//
// Helpful sketch for the top-right CORNER pocket (corner at (L, HALF_W)):
//
//   - - - - - - - - * (L - jc, HALF_W)                   ← long-side cushion ends here
//                    \
//                     \ jaw 1 (45° INTO the playing surface)
//                      \
//                       * jaw 1 end at (L - jc + jl·cos, HALF_W − jl·sin)
//                       :
//                       :  throat opening (gap)
//                       :
//                       * jaw 2 end at (L − jl·sin, HALF_W − jc + jl·cos)
//                      /
//                     / jaw 2 (45° INTO the playing surface)
//                    /
//                   * (L, HALF_W − jc)                     ← end cushion ends here
//                   |
//
// The wedge between the long-side cushion end, the corner (L, HALF_W) and
// the end-cushion end is filled with cushion material; the pocket hole sits
// inside that wedge.

function buildCushions(): CushionSegment[] {
  const L = TABLE_LENGTH;
  const halfW = HALF_W;
  const jc = JAW_OFFSET_CORNER;
  const jl = JAW_LENGTH_CORNER;
  const jm = JAW_OFFSET_MIDDLE;
  const jlm = JAW_LENGTH_MIDDLE;

  const cushions: CushionSegment[] = [];
  const seg = (p1: [number, number], p2: [number, number], normal: [number, number]) => {
    cushions.push({ p1, p2, normal });
  };

  // === BAULK CUSHION (x = 0). Outward normal (-1, 0). ===
  seg([0, -halfW + jc], [0, halfW - jc], [-1, 0]);

  // Baulk-bottom corner (0, -halfW): end-cushion jaw goes +x, -y into playing surface.
  // Cushion-end direction: -y. Jaw turns 45° INWARD → direction (+sin, -cos) = (+SIN_C, -COS_C).
  seg(
    [0, -halfW + jc],
    [SIN_C * jl, -halfW + jc - COS_C * jl],
    [-COS_C, -SIN_C],
  );
  // Baulk-top corner (0, halfW): end-cushion jaw goes +x, +y into playing surface.
  seg(
    [0, halfW - jc],
    [SIN_C * jl, halfW - jc + COS_C * jl],
    [-COS_C, SIN_C],
  );

  // === TOP CUSHION (x = L). Outward normal (+1, 0). ===
  seg([L, -halfW + jc], [L, halfW - jc], [1, 0]);
  // Top-bottom corner (L, -halfW):
  seg(
    [L, -halfW + jc],
    [L - SIN_C * jl, -halfW + jc - COS_C * jl],
    [COS_C, -SIN_C],
  );
  // Top-top corner (L, halfW):
  seg(
    [L, halfW - jc],
    [L - SIN_C * jl, halfW - jc + COS_C * jl],
    [COS_C, SIN_C],
  );

  // === BOTTOM LONG-SIDE (y = -halfW). Outward normal (0, -1). ===
  seg([jc, -halfW], [MID_X - jm, -halfW], [0, -1]);
  seg([MID_X + jm, -halfW], [L - jc, -halfW], [0, -1]);

  // Baulk-bottom corner long-side jaw: from (jc, -halfW) into table (-x, -y? no, +x, -y).
  // Cushion-end direction: -x. Jaw turns 45° INWARD → direction (-cos, +sin) ... wait
  // we want the jaw to go INTO the playing surface, which here means UPWARD (toward +y).
  // From cushion end (jc, -halfW), the playing surface is at y > -halfW. So jaw direction
  // is (something_along_x, +something_along_y).
  // The jaw enters the table at 45° toward the corner: direction (-COS_C, +SIN_C).
  seg(
    [jc, -halfW],
    [jc - COS_C * jl, -halfW + SIN_C * jl],
    [-SIN_C, -COS_C],
  );
  // Top-bottom corner long-side jaw: from (L - jc, -halfW), direction (+COS_C, +SIN_C).
  seg(
    [L - jc, -halfW],
    [L - jc + COS_C * jl, -halfW + SIN_C * jl],
    [SIN_C, -COS_C],
  );

  // Bottom middle pocket jaws: from each cushion end, the jaw turns 60° INWARD into the
  // playing surface (so it points mostly into the table, very slightly sideways).
  // Left side: cushion ends at (MID_X - jm, -halfW). Jaw direction (+cos_m * something, +sin_m).
  // Actually for a steep 60° jaw going almost straight into the table:
  // jaw direction = (COS_M, SIN_M)? No, COS_M = 0.5, SIN_M = 0.866. So mostly +y, slightly +x.
  seg(
    [MID_X - jm, -halfW],
    [MID_X - jm + COS_M * jlm, -halfW + SIN_M * jlm],
    [-SIN_M, -COS_M],
  );
  seg(
    [MID_X + jm, -halfW],
    [MID_X + jm - COS_M * jlm, -halfW + SIN_M * jlm],
    [SIN_M, -COS_M],
  );

  // === TOP LONG-SIDE (y = +halfW). Outward normal (0, +1). ===
  seg([jc, halfW], [MID_X - jm, halfW], [0, 1]);
  seg([MID_X + jm, halfW], [L - jc, halfW], [0, 1]);

  // Baulk-top corner long-side jaw:
  seg(
    [jc, halfW],
    [jc - COS_C * jl, halfW - SIN_C * jl],
    [-SIN_C, COS_C],
  );
  // Top-top corner long-side jaw:
  seg(
    [L - jc, halfW],
    [L - jc + COS_C * jl, halfW - SIN_C * jl],
    [SIN_C, COS_C],
  );

  // Top middle pocket jaws (mirrored across y = 0):
  seg(
    [MID_X - jm, halfW],
    [MID_X - jm + COS_M * jlm, halfW - SIN_M * jlm],
    [-SIN_M, COS_M],
  );
  seg(
    [MID_X + jm, halfW],
    [MID_X + jm - COS_M * jlm, halfW - SIN_M * jlm],
    [SIN_M, COS_M],
  );

  return cushions;
}

export const CUSHIONS: CushionSegment[] = buildCushions();

// ---- Pocket / cushion-notch visual descriptors ----------------------------
// Each pocket has:
//   - notch:   a polygon of cushion material that the cloth doesn't reach
//              (drawn in cushion color, sits on top of the cloth visually)
//   - hole:    a small dark circle showing where the ball drops
//
// All coordinates are in world (table-plane) meters.

export interface PocketVisual {
  /** Polygon of cushion-fill area at the pocket (clockwise). */
  notch: [number, number][];
  /** Center of the pocket hole. */
  holeCenter: [number, number];
  /** Pocket hole radius (visual). */
  holeRadius: number;
  /** Direction the pocket opens (unit vector pointing into the table from
   *  the hole). Used for subtle inner-rim shading. */
  openDir: [number, number];
}

function buildPocketVisuals(): PocketVisual[] {
  const halfW = HALF_W;
  const jc = JAW_OFFSET_CORNER;
  const jl = JAW_LENGTH_CORNER;
  const jm = JAW_OFFSET_MIDDLE;
  const jlm = JAW_LENGTH_MIDDLE;
  const visuals: PocketVisual[] = [];

  // --- 4 corner pockets ---
  // For each corner, the notch is the polygon:
  //   long-cushion-end → corner → end-cushion-end → end-side-jaw-tip → long-side-jaw-tip
  // The hole sits inside this wedge at roughly the diagonal midpoint.

  const corner = (cx: number, cy: number, signX: 1 | -1, signY: 1 | -1): PocketVisual => {
    const lsEnd: [number, number]    = [cx - signX * jc, cy];
    const ecEnd: [number, number]    = [cx, cy - signY * jc];
    const lsJawTip: [number, number] = [cx - signX * (jc - COS_C * jl), cy - signY * SIN_C * jl];
    const ecJawTip: [number, number] = [cx - signX * SIN_C * jl,         cy - signY * (jc - COS_C * jl)];
    const hole: [number, number]     = [cx - signX * jc * 0.42, cy - signY * jc * 0.42];

    return {
      notch: [
        lsEnd,
        [cx, cy],
        ecEnd,
        ecJawTip,
        lsJawTip,
      ],
      holeCenter: hole,
      holeRadius: 0.042,
      openDir: [signX, signY],
    };
  };

  visuals.push(corner(0,            -halfW,  -1, -1));
  visuals.push(corner(0,             halfW,  -1,  1));
  visuals.push(corner(TABLE_LENGTH, -halfW,   1, -1));
  visuals.push(corner(TABLE_LENGTH,  halfW,   1,  1));

  // --- 2 middle pockets ---
  // Notch: trapezoid with the long edge along the cushion line and the short
  // edge inside the playing surface (the throat).

  const middle = (mx: number, my: number, signY: 1 | -1): PocketVisual => {
    return {
      notch: [
        [mx - jm, my],
        [mx + jm, my],
        [mx + jm - COS_M * jlm, my - signY * SIN_M * jlm],
        [mx - jm + COS_M * jlm, my - signY * SIN_M * jlm],
      ],
      holeCenter: [mx, my - signY * jm * 0.10],
      holeRadius: 0.038,
      openDir: [0, -signY],
    };
  };

  visuals.push(middle(MID_X, -halfW, -1));
  visuals.push(middle(MID_X,  halfW,  1));

  return visuals;
}

export const POCKET_VISUALS: PocketVisual[] = buildPocketVisuals();

// ---- Initial ball setup ---------------------------------------------------

export function buildInitialBalls(): Ball[] {
  const balls: Ball[] = [];
  let id = 0;
  const mk = (color: Ball['color'], pos: [number, number], spot?: [number, number]): Ball => ({
    id: id++,
    color,
    pos: [pos[0], pos[1]],
    vel: [0, 0],
    spin: [0, 0, 0],
    spot: spot ? [spot[0], spot[1]] : undefined,
    onTable: true,
  });

  balls.push(mk('cue', [SPOT_BAULK_X - D_RADIUS * 0.4, 0]));
  balls.push(mk('yellow', [...SPOT_YELLOW] as [number, number], SPOT_YELLOW));
  balls.push(mk('green',  [...SPOT_GREEN]  as [number, number], SPOT_GREEN));
  balls.push(mk('brown',  [...SPOT_BROWN]  as [number, number], SPOT_BROWN));
  balls.push(mk('blue',   [...SPOT_BLUE]   as [number, number], SPOT_BLUE));
  balls.push(mk('pink',   [...SPOT_PINK]   as [number, number], SPOT_PINK));
  balls.push(mk('black',  [...SPOT_BLACK]  as [number, number], SPOT_BLACK));

  const d = 2 * BALL_RADIUS;
  const gap = 0.0002;
  const dx = (d + gap) * Math.cos(Math.PI / 6);
  const dy = d + gap;
  const apexX = SPOT_PINK[0] + d + gap + 0.001;
  for (let row = 0; row < 5; row++) {
    const ballsInRow = row + 1;
    const rowX = apexX + row * dx;
    const yStart = -((ballsInRow - 1) * 0.5) * dy;
    for (let i = 0; i < ballsInRow; i++) {
      balls.push(mk('red', [rowX, yStart + i * dy]));
    }
  }

  return balls;
}
