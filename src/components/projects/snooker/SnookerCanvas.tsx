import { useEffect, useRef } from 'react';

import {
  BALL_RADIUS,
  type Ball,
  type BallColor,
} from './physics';
import {
  TABLE_LENGTH,
  TABLE_WIDTH,
  CUSHIONS,
  POCKET_VISUALS,
  SPOT_BAULK_X,
  D_RADIUS,
  SPOT_BLUE,
  SPOT_PINK,
  SPOT_BLACK,
  SPOT_YELLOW,
  SPOT_GREEN,
  SPOT_BROWN,
} from './table';

// --- Visual constants ---
const COLOR_FILL: Record<BallColor, string> = {
  cue: '#f3eee4',
  red: '#c0392b',
  yellow: '#f1c40f',
  green: '#2e7d32',
  brown: '#6b4423',
  blue: '#1f6fb0',
  pink: '#e88aae',
  black: '#15151b',
};

// Cloth: a saturated billiard green that reads well on dark backgrounds.
const CLOTH = '#249a48';
const CLOTH_HIGHLIGHT = 'rgba(255,255,255,0.02)';
// Cushion felt: a slightly darker, more olive green, visibly different from
// the cloth so the notches read as cushion material.
const CUSHION = '#1f7d39';
const CUSHION_EDGE = 'rgba(0, 0, 0, 0.45)';
// Wooden rail.
const FRAME = '#5d3a1f';
const FRAME_HIGHLIGHT = '#8a5a32';
const FRAME_SHADOW = '#2a1607';
// Brass diamond sights on the rail.
const SIGHT = '#c9a35a';
// Pocket interior.
const POCKET_FILL = '#0a0809';
const POCKET_OUTLINE = 'rgba(0, 0, 0, 0.7)';
const SPOT_MARK = 'rgba(255, 255, 255, 0.22)';
const LINE_BAULK = 'rgba(255, 255, 255, 0.28)';

export interface SnookerCanvasProps {
  balls: Ball[];
  /** Optional cue preview state for aiming. */
  cue?: {
    /** Ball position the cue is aimed from (the cue ball, in world coords). */
    fromX: number;
    fromY: number;
    /** Aim direction unit vector. */
    dirX: number;
    dirY: number;
    /** Power 0..1. */
    power: number;
  } | null;
  width: number;
  height: number;
  /** Called when the user clicks or drags on the table to aim. Position is
   *  world coordinates (meters). */
  onPointerMove?: (worldX: number, worldY: number) => void;
  onPointerDown?: (worldX: number, worldY: number) => void;
  onPointerUp?: (worldX: number, worldY: number) => void;
  /** Monotonic frame counter — required to retrigger the draw effect when
   *  ball state has been mutated in place (the balls array reference does
   *  not change between frames). */
  frame: number;
}

/** Translate from world meters → canvas pixels. */
function worldToCanvas(width: number, height: number) {
  // We want the table rendered horizontally: length along x, width along y.
  // Plus a margin for the cushion + frame.
  const FRAME_MARGIN = 0.18; // meters of cushion + frame outside the playing surface
  const usableW = TABLE_LENGTH + FRAME_MARGIN * 2;
  const usableH = TABLE_WIDTH + FRAME_MARGIN * 2;
  const scale = Math.min(width / usableW, height / usableH);
  const tableScreenW = TABLE_LENGTH * scale;
  const tableScreenH = TABLE_WIDTH * scale;
  const originX = (width - tableScreenW) / 2;
  const originY = (height - tableScreenH) / 2;
  return {
    scale,
    originX,
    originY,
    toPx: (x: number, y: number) => [
      originX + x * scale,
      originY + (TABLE_WIDTH / 2 - y) * scale,
    ] as [number, number],
    toWorld: (px: number, py: number) => [
      (px - originX) / scale,
      TABLE_WIDTH / 2 - (py - originY) / scale,
    ] as [number, number],
  };
}

const SnookerCanvas = ({
  balls,
  cue,
  width,
  height,
  onPointerMove,
  onPointerDown,
  onPointerUp,
  frame,
}: SnookerCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Redraw on every change of frame / cue / size. `balls` is mutated in place
  // so it's the `frame` counter that actually retriggers the effect.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const t = worldToCanvas(width, height);
    const r = BALL_RADIUS * t.scale;

    // --- Outer wooden frame with rounded corners ---
    const frameInset = 0.105 * t.scale;
    const frameX = t.originX - frameInset;
    const frameY = t.originY - frameInset;
    const frameW = TABLE_LENGTH * t.scale + frameInset * 2;
    const frameH = TABLE_WIDTH * t.scale + frameInset * 2;
    const frameRadius = Math.min(frameInset * 0.9, 18);
    // Wood with subtle vertical gradient (top highlighted).
    const frameGrad = ctx.createLinearGradient(0, frameY, 0, frameY + frameH);
    frameGrad.addColorStop(0, FRAME_HIGHLIGHT);
    frameGrad.addColorStop(0.4, FRAME);
    frameGrad.addColorStop(1, FRAME_SHADOW);
    roundRectPath(ctx, frameX, frameY, frameW, frameH, frameRadius);
    ctx.fillStyle = frameGrad;
    ctx.fill();

    // Subtle wood grain (horizontal streaks).
    ctx.save();
    roundRectPath(ctx, frameX, frameY, frameW, frameH, frameRadius);
    ctx.clip();
    ctx.globalAlpha = 0.07;
    for (let i = 0; i < 18; i++) {
      const yy = frameY + Math.random() * frameH;
      ctx.strokeStyle = i % 2 ? FRAME_HIGHLIGHT : '#3a2210';
      ctx.lineWidth = 0.5 + Math.random() * 1.2;
      ctx.beginPath();
      ctx.moveTo(frameX, yy);
      ctx.lineTo(frameX + frameW, yy + (Math.random() - 0.5) * 4);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Brass diamond sights on the rail.
    drawSights(ctx, t, frameInset);

    // Inner bevel: darker line + warm highlight.
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(t.originX, t.originY, TABLE_LENGTH * t.scale, TABLE_WIDTH * t.scale);
    ctx.strokeStyle = 'rgba(255, 230, 200, 0.07)';
    ctx.lineWidth = 1;
    ctx.strokeRect(t.originX - 1, t.originY - 1, TABLE_LENGTH * t.scale + 2, TABLE_WIDTH * t.scale + 2);

    // --- Cloth (full playing-surface rectangle) ---
    ctx.fillStyle = CLOTH;
    ctx.fillRect(t.originX, t.originY, TABLE_LENGTH * t.scale, TABLE_WIDTH * t.scale);

    // Soft radial vignette so the cloth has dimension.
    const vGrad = ctx.createRadialGradient(
      t.originX + (TABLE_LENGTH * t.scale) / 2,
      t.originY + (TABLE_WIDTH  * t.scale) / 2,
      0,
      t.originX + (TABLE_LENGTH * t.scale) / 2,
      t.originY + (TABLE_WIDTH  * t.scale) / 2,
      TABLE_LENGTH * t.scale * 0.55,
    );
    vGrad.addColorStop(0, 'rgba(255,255,255,0.02)');
    vGrad.addColorStop(0.7, 'rgba(0,0,0,0)');
    vGrad.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = vGrad;
    ctx.fillRect(t.originX, t.originY, TABLE_LENGTH * t.scale, TABLE_WIDTH * t.scale);

    // Brushed cloth highlight (subtle horizontal sheen).
    const grad = ctx.createLinearGradient(t.originX, t.originY, t.originX + TABLE_LENGTH * t.scale, t.originY);
    grad.addColorStop(0, 'rgba(0,0,0,0.08)');
    grad.addColorStop(0.5, CLOTH_HIGHLIGHT);
    grad.addColorStop(1, 'rgba(0,0,0,0.08)');
    ctx.fillStyle = grad;
    ctx.fillRect(t.originX, t.originY, TABLE_LENGTH * t.scale, TABLE_WIDTH * t.scale);

    // --- Cushion notches around each pocket (cushion material cutting INTO the cloth) ---
    for (const pv of POCKET_VISUALS) {
      ctx.fillStyle = CUSHION;
      ctx.beginPath();
      for (let i = 0; i < pv.notch.length; i++) {
        const [x, y] = t.toPx(pv.notch[i][0], pv.notch[i][1]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      // Notch shading: subtle darker edge along the inside (toward playing surface).
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // --- Baulk line + D ---
    const [bx, by] = t.toPx(SPOT_BAULK_X, 0);
    ctx.strokeStyle = LINE_BAULK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx, t.originY);
    ctx.lineTo(bx, t.originY + TABLE_WIDTH * t.scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(bx, by, D_RADIUS * t.scale, Math.PI / 2, (3 * Math.PI) / 2, false);
    ctx.stroke();

    // --- Coloured spots ---
    const spotR = 2;
    ctx.fillStyle = SPOT_MARK;
    for (const sp of [SPOT_YELLOW, SPOT_GREEN, SPOT_BROWN, SPOT_BLUE, SPOT_PINK, SPOT_BLACK]) {
      const [sx, sy] = t.toPx(sp[0], sp[1]);
      ctx.beginPath();
      ctx.arc(sx, sy, spotR, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Cushion noses (the thin lip where rubber meets cloth) ---
    for (const c of CUSHIONS) {
      const [x1, y1] = t.toPx(c.p1[0], c.p1[1]);
      const [x2, y2] = t.toPx(c.p2[0], c.p2[1]);
      ctx.strokeStyle = CUSHION_EDGE;
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';

    // --- Pockets (small dark holes inside each cushion notch) ---
    for (const pv of POCKET_VISUALS) {
      const [px, py] = t.toPx(pv.holeCenter[0], pv.holeCenter[1]);
      const hr = pv.holeRadius * t.scale;
      // Soft shadow ring just outside the hole.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.arc(px, py, hr + 2, 0, Math.PI * 2);
      ctx.fill();
      // Pocket hole.
      const holeGrad = ctx.createRadialGradient(
        px - hr * 0.25 * pv.openDir[0],
        py + hr * 0.25 * pv.openDir[1],
        hr * 0.1,
        px,
        py,
        hr,
      );
      holeGrad.addColorStop(0, '#1a1216');
      holeGrad.addColorStop(0.85, POCKET_FILL);
      holeGrad.addColorStop(1, '#000');
      ctx.fillStyle = holeGrad;
      ctx.beginPath();
      ctx.arc(px, py, hr, 0, Math.PI * 2);
      ctx.fill();
      // Crisp dark outline.
      ctx.strokeStyle = POCKET_OUTLINE;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // --- Balls ---
    for (const b of balls) {
      if (!b.onTable) continue;
      const [bxp, byp] = t.toPx(b.pos[0], b.pos[1]);
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.arc(bxp + 1.5, byp + 2, r * 0.95, 0, Math.PI * 2);
      ctx.fill();
      // Ball fill
      const fill = COLOR_FILL[b.color];
      const ballGrad = ctx.createRadialGradient(bxp - r * 0.35, byp - r * 0.35, r * 0.1, bxp, byp, r);
      ballGrad.addColorStop(0, lighten(fill, 0.4));
      ballGrad.addColorStop(0.5, fill);
      ballGrad.addColorStop(1, darken(fill, 0.35));
      ctx.fillStyle = ballGrad;
      ctx.beginPath();
      ctx.arc(bxp, byp, r, 0, Math.PI * 2);
      ctx.fill();
      // Specular highlight
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.arc(bxp - r * 0.35, byp - r * 0.45, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Cue / aim line ---
    if (cue) {
      const [cx, cy] = t.toPx(cue.fromX, cue.fromY);
      // Aim line forward from ball
      const lineLength = (0.18 + cue.power * 0.45) * t.scale;
      const dx = cue.dirX;
      const dy = -cue.dirY; // canvas y is flipped
      ctx.strokeStyle = 'rgba(241, 243, 248, 0.6)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(cx + dx * r, cy + dy * r);
      ctx.lineTo(cx + dx * lineLength, cy + dy * lineLength);
      ctx.stroke();
      ctx.setLineDash([]);

      // Cue stick (behind the ball)
      const cueBackOffset = (0.10 + cue.power * 0.28) * t.scale;
      const cueLen = 0.9 * t.scale;
      const cueWidthTip = 4;
      const cueWidthBack = 8;
      const bx2 = cx - dx * (r + cueBackOffset);
      const by2 = cy - dy * (r + cueBackOffset);
      const bxEnd = bx2 - dx * cueLen;
      const byEnd = by2 - dy * cueLen;
      // Cue
      const cueGrad = ctx.createLinearGradient(bx2, by2, bxEnd, byEnd);
      cueGrad.addColorStop(0, '#e0b485');
      cueGrad.addColorStop(0.3, '#a76f3e');
      cueGrad.addColorStop(1, '#3a2716');
      ctx.strokeStyle = cueGrad;
      ctx.lineWidth = (cueWidthTip + cueWidthBack) / 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx2, by2);
      ctx.lineTo(bxEnd, byEnd);
      ctx.stroke();
      // White tip dot
      ctx.fillStyle = '#f3eee4';
      ctx.beginPath();
      ctx.arc(bx2, by2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [frame, balls, cue, width, height]);

  // --- Pointer handlers ---
  const fireWorld = (cb: ((wx: number, wy: number) => void) | undefined, ev: React.PointerEvent<HTMLCanvasElement>) => {
    if (!cb) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = ev.clientX - rect.left;
    const py = ev.clientY - rect.top;
    const t = worldToCanvas(rect.width, rect.height);
    const [wx, wy] = t.toWorld(px, py);
    cb(wx, wy);
  };

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: 'block', cursor: 'crosshair' }}
      onPointerMove={(e) => fireWorld(onPointerMove, e)}
      onPointerDown={(e) => fireWorld(onPointerDown, e)}
      onPointerUp={(e) => fireWorld(onPointerUp, e)}
    />
  );
};

/** Path for a rounded rectangle. */
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

interface CanvasTransform {
  scale: number;
  originX: number;
  originY: number;
  toPx: (x: number, y: number) => [number, number];
  toWorld: (px: number, py: number) => [number, number];
}

/** Brass diamond sights along the wooden rail. Snooker rails carry 18
 *  diamonds total (one at each quarter point along the long sides plus the
 *  corner and middle pocket markers). We render simplified equivalents. */
function drawSights(
  ctx: CanvasRenderingContext2D,
  t: CanvasTransform,
  frameInset: number,
): void {
  const railMidOffset = frameInset * 0.5;
  // Top / bottom rails: 7 sights along each (excludes the corners — those
  // sit at the pocket centers anyway).
  for (let i = 1; i <= 7; i++) {
    const xWorld = (TABLE_LENGTH * i) / 8;
    const [cx] = t.toPx(xWorld, 0);
    diamond(ctx, cx, t.originY - railMidOffset, 3.2);
    diamond(ctx, cx, t.originY + TABLE_WIDTH * t.scale + railMidOffset, 3.2);
  }
  // Left / right rails: 3 sights each.
  for (let i = 1; i <= 3; i++) {
    const yWorld = TABLE_WIDTH * (i / 4 - 0.5);
    const [, cy] = t.toPx(0, yWorld);
    diamond(ctx, t.originX - railMidOffset, cy, 3.2);
    diamond(ctx, t.originX + TABLE_LENGTH * t.scale + railMidOffset, cy, 3.2);
  }
}

function diamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = SIGHT;
  ctx.fillRect(-size, -size, size * 2, size * 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(-size, -size, size * 2, size * 2);
  ctx.restore();
}

function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.round(r + (255 - r) * amount)}, ${Math.round(g + (255 - g) * amount)}, ${Math.round(b + (255 - b) * amount)})`;
}
function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.round(r * (1 - amount))}, ${Math.round(g * (1 - amount))}, ${Math.round(b * (1 - amount))})`;
}
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

export default SnookerCanvas;
