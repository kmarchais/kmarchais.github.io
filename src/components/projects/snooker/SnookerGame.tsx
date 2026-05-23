import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import SnookerCanvas from './SnookerCanvas';
import {
  anyBallMoving,
  applyCueImpact,
  type Ball,
  type BallColor,
  makeShotResult,
  stepPhysics,
  type PhysicsWorld,
} from './physics';
import { buildInitialBalls, CUSHIONS, POCKETS, SPOT_BAULK_X } from './table';
import { applyShot, type GameState, NEW_GAME_STATE } from './rules';

interface SnookerGameProps {
  embedded?: boolean;
}

const MAX_POWER_SPEED = 7.5; // m/s — a hard break.

const BALL_DISPLAY_NAMES: Record<BallColor | 'any-color', string> = {
  cue: 'cue',
  red: 'red',
  yellow: 'yellow',
  green: 'green',
  brown: 'brown',
  blue: 'blue',
  pink: 'pink',
  black: 'black',
  'any-color': 'any colour',
};

function deepCloneState(s: GameState): GameState {
  return {
    scores: [s.scores[0], s.scores[1]],
    currentPlayer: s.currentPlayer,
    ballOn: s.ballOn,
    phase: s.phase,
    redsRemaining: s.redsRemaining,
    lastFoul: s.lastFoul,
    lastPotted: [...s.lastPotted],
    pendingRespot: [...s.pendingRespot],
  };
}

const SnookerGame = ({ embedded = false }: SnookerGameProps) => {
  // --- React state for UI ---
  const [game, setGame] = useState<GameState>(() => deepCloneState(NEW_GAME_STATE));
  const [aimAngle, setAimAngle] = useState<number>(0); // radians, atan2(dy, dx)
  const [power, setPower] = useState<number>(0.55);
  const [impact, setImpact] = useState<{ y: number; z: number }>({ y: 0, z: 0 }); // normalized [-1,1]^2 inside unit disk
  const [shotInProgress, setShotInProgress] = useState(false);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 800, h: 410 });
  const [tick, setTick] = useState(0); // forces re-render after physics steps

  // --- Persistent world reference (do NOT put this in React state — we mutate it during the shot). ---
  const worldRef = useRef<PhysicsWorld>({
    balls: buildInitialBalls(),
    cushions: CUSHIONS,
    pockets: POCKETS,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const tableColRef = useRef<HTMLDivElement>(null);
  const lastTimeRef = useRef<number | null>(null);
  const animRef = useRef<number | null>(null);
  const cueBall = worldRef.current.balls.find((b) => b.color === 'cue');

  // --- Responsive canvas sizing.
  // Observe the table column (not the whole grid) so the canvas doesn't
  // bleed into the side panel area.
  useEffect(() => {
    if (!tableColRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = e.contentRect.width;
        // Table aspect ratio ~ 2.01:1 with frame
        const h = Math.min(w * 0.55, 520);
        setSize({ w: Math.max(380, w), h: Math.max(200, h) });
      }
    });
    ro.observe(tableColRef.current);
    return () => ro.disconnect();
  }, []);

  // --- Animation loop while balls move ---
  const tickPhysics = useCallback((t: number) => {
    if (lastTimeRef.current === null) lastTimeRef.current = t;
    const dt = Math.min(0.04, (t - lastTimeRef.current) / 1000);
    lastTimeRef.current = t;

    const result = makeShotResult();
    stepPhysics(worldRef.current, dt, result);

    // Carry-over: accumulate first-hit and pocketed across the entire shot.
    if (result.firstHit && !shotResultRef.current.firstHit) {
      shotResultRef.current.firstHit = result.firstHit;
    }
    for (const p of result.pocketed) shotResultRef.current.pocketed.push(p);

    setTick((x) => x + 1);

    if (anyBallMoving(worldRef.current.balls)) {
      animRef.current = requestAnimationFrame(tickPhysics);
    } else {
      // Shot ended → apply rules.
      const outcome = {
        firstHit: shotResultRef.current.firstHit,
        pocketed: shotResultRef.current.pocketed.map((b) => b.color),
      };
      const next = deepCloneState(gameRef.current);
      applyShot(next, outcome);
      // Re-spot colours that need re-spotting + cue ball if pocketed.
      respotBalls(worldRef.current.balls, next.pendingRespot, outcome.pocketed.includes('cue'));
      next.pendingRespot = [];
      gameRef.current = next;
      setGame(next);
      setShotInProgress(false);
      shotResultRef.current = { firstHit: null, pocketed: [] };
      lastTimeRef.current = null;
    }
  }, []);

  const gameRef = useRef<GameState>(game);
  useEffect(() => { gameRef.current = game; }, [game]);
  const shotResultRef = useRef<{ firstHit: BallColor | null; pocketed: Ball[] }>({ firstHit: null, pocketed: [] });

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

  // --- Shoot! ---
  const shoot = () => {
    if (shotInProgress || !cueBall) return;
    const speed = power * MAX_POWER_SPEED;
    const dir: [number, number] = [Math.cos(aimAngle), Math.sin(aimAngle)];
    applyCueImpact(cueBall, {
      speed,
      dir,
      yOffset: impact.y,
      zOffset: impact.z,
    });
    setShotInProgress(true);
    shotResultRef.current = { firstHit: null, pocketed: [] };
    lastTimeRef.current = null;
    animRef.current = requestAnimationFrame(tickPhysics);
  };

  // --- Resetting frame ---
  const resetFrame = () => {
    worldRef.current.balls = buildInitialBalls();
    const fresh = deepCloneState(NEW_GAME_STATE);
    gameRef.current = fresh;
    setGame(fresh);
    setAimAngle(0);
    setPower(0.55);
    setImpact({ y: 0, z: 0 });
  };

  // --- Pointer aim handler over the canvas ---
  const handlePointerMove = (wx: number, wy: number) => {
    if (shotInProgress || !cueBall) return;
    const dx = wx - cueBall.pos[0];
    const dy = wy - cueBall.pos[1];
    if (dx * dx + dy * dy < 1e-6) return;
    setAimAngle(Math.atan2(dy, dx));
  };

  // --- Render ---
  const ballOnLabel = BALL_DISPLAY_NAMES[game.ballOn];
  const cuePreview = useMemo(() => {
    if (!cueBall) return null;
    return {
      fromX: cueBall.pos[0],
      fromY: cueBall.pos[1],
      dirX: Math.cos(aimAngle),
      dirY: Math.sin(aimAngle),
      power,
    };
  }, [cueBall, aimAngle, power]);

  return (
    <div
      ref={containerRef}
      className={
        embedded
          ? 'relative w-full bg-ink-800 border border-ink-600/60 overflow-hidden'
          : 'relative w-full min-h-screen bg-ink-900'
      }
    >
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
        {/* Table area */}
        <div ref={tableColRef} className="min-w-0">
          <SnookerCanvas
            balls={worldRef.current.balls}
            cue={shotInProgress ? null : cuePreview}
            width={size.w}
            height={size.h}
            frame={tick}
            onPointerMove={handlePointerMove}
          />
          <div className="mt-2 font-mono text-[10.5px] uppercase tracking-wider2 text-bone-600">
            Drag the cursor around the table to aim. Click <b className="text-bone-200">Shoot</b> to play.
          </div>
        </div>

        {/* Side panel */}
        <aside className="flex flex-col gap-5">
          {/* Score + turn */}
          <ScorePanel game={game} ballOnLabel={ballOnLabel} />

          {/* Power */}
          <ControlBlock label="Power">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={power}
              disabled={shotInProgress}
              onChange={(e) => setPower(parseFloat(e.target.value))}
              className="w-full accent-ember-400"
            />
            <div className="font-mono text-[11px] text-bone-400 mt-1">
              {(power * 100).toFixed(0)}% &middot; {(power * MAX_POWER_SPEED).toFixed(1)} m/s
            </div>
          </ControlBlock>

          {/* Impact selector */}
          <ControlBlock label="Point of impact on the cue ball">
            <ImpactSelector value={impact} onChange={setImpact} disabled={shotInProgress} />
            <div className="font-mono text-[10.5px] text-bone-600 mt-1.5">
              vertical: {impact.z > 0 ? 'top' : impact.z < 0 ? 'back' : 'centre'} &middot;{' '}
              side: {impact.y > 0 ? 'left' : impact.y < 0 ? 'right' : 'centre'}
            </div>
          </ControlBlock>

          {/* Shoot + reset */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={shoot}
              disabled={shotInProgress}
              className="flex-1 px-4 py-2.5 font-mono text-[11px] tracking-wider2 uppercase border border-ember-500/60 text-ember-300 bg-ember-500/10 hover:bg-ember-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Shoot
            </button>
            <button
              type="button"
              onClick={resetFrame}
              disabled={shotInProgress}
              className="px-3 py-2.5 font-mono text-[11px] tracking-wider2 uppercase border border-ink-600 text-bone-400 hover:text-bone-50 hover:border-ink-600/80 transition-colors disabled:opacity-40"
            >
              New frame
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ScorePanel({ game, ballOnLabel }: { game: GameState; ballOnLabel: string }) {
  return (
    <div className="border border-ink-600/60 bg-ink-800/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <PlayerBlock label="Player 1" score={game.scores[0]} active={game.currentPlayer === 0} />
        <PlayerBlock label="Player 2" score={game.scores[1]} active={game.currentPlayer === 1} />
      </div>
      <div className="mt-3 rule" />
      <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[10.5px] uppercase tracking-wider2">
        <div>
          <div className="text-bone-600">Ball on</div>
          <div className="text-bone-50">{ballOnLabel}</div>
        </div>
        <div>
          <div className="text-bone-600">Phase</div>
          <div className="text-bone-50">
            {game.phase === 'reds' && `${game.redsRemaining} reds left`}
            {game.phase === 'colors-sequence' && 'colours'}
            {game.phase === 'frame-over' && 'frame over'}
          </div>
        </div>
      </div>
      {(game.lastFoul || game.lastPotted.length > 0) && (
        <div className="mt-3 rule" />
      )}
      {game.lastFoul && (
        <div className="mt-3 text-[12px] text-ember-400 font-mono">
          Foul: {game.lastFoul}
        </div>
      )}
      {!game.lastFoul && game.lastPotted.filter((c) => c !== 'cue').length > 0 && (
        <div className="mt-3 text-[12px] text-bone-200 font-mono">
          Potted: {game.lastPotted.filter((c) => c !== 'cue').join(', ')}
        </div>
      )}
    </div>
  );
}

function PlayerBlock({ label, score, active }: { label: string; score: number; active: boolean }) {
  return (
    <div className={'flex-1 ' + (active ? '' : 'opacity-50')}>
      <div className="font-mono text-[10px] uppercase tracking-wider2 text-bone-600">{label}</div>
      <div className={'font-display text-[1.8rem] leading-none mt-0.5 tracking-[-0.02em] ' + (active ? 'text-ember-300' : 'text-bone-50')}>{score}</div>
    </div>
  );
}

function ControlBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider2 text-bone-400 mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function ImpactSelector({
  value,
  onChange,
  disabled,
}: {
  value: { y: number; z: number };
  onChange: (v: { y: number; z: number }) => void;
  disabled: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const set = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = (clientX - r.left) / r.width;
    const cy = (clientY - r.top) / r.height;
    // Normalize to [-1,1] then clamp inside unit disk.
    let y = (0.5 - cx) * 2; // +y on the LEFT half (consistent with cue impact convention)
    let z = (0.5 - cy) * 2; // +z on top half
    const m = Math.hypot(y, z);
    if (m > 0.95) {
      y *= 0.95 / m;
      z *= 0.95 / m;
    }
    onChange({ y, z });
  };

  const onDown = (e: React.PointerEvent) => {
    if (disabled) return;
    dragging.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    set(e.clientX, e.clientY);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    set(e.clientX, e.clientY);
  };
  const onUp = () => { dragging.current = false; };

  // Visual: a circle (back view of the cue ball), with a target dot.
  const SIZE = 96;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const dotX = cx - value.y * (SIZE / 2 - 6);
  const dotY = cy - value.z * (SIZE / 2 - 6);

  return (
    <div
      ref={ref}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      style={{ width: SIZE, height: SIZE }}
      className={'relative select-none ' + (disabled ? 'opacity-50' : 'cursor-crosshair')}
    >
      <svg width={SIZE} height={SIZE}>
        <defs>
          <radialGradient id="cue-ball-bg" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#fefcf6" />
            <stop offset="100%" stopColor="#9c958a" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={SIZE / 2 - 2} fill="url(#cue-ball-bg)" stroke="rgba(255,255,255,0.18)" />
        {/* Crosshairs */}
        <line x1={cx} y1={4} x2={cx} y2={SIZE - 4} stroke="rgba(0,0,0,0.18)" strokeWidth={0.5} />
        <line x1={4} y1={cy} x2={SIZE - 4} y2={cy} stroke="rgba(0,0,0,0.18)" strokeWidth={0.5} />
        {/* Selected impact point */}
        <circle cx={dotX} cy={dotY} r={5} fill="#d99a4e" stroke="#0a1220" strokeWidth={1.5} />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Respot helper (kept here because it touches both balls and rules state)
// ---------------------------------------------------------------------------

function respotBalls(balls: Ball[], colorsToRespot: BallColor[], respotCue: boolean) {
  // Re-spot colour balls: place each back at its original spot. If that spot
  // is occupied, walk along +x looking for free room.
  const occupiedByOthers = (x: number, y: number, ignoreId: number): boolean => {
    for (const b of balls) {
      if (!b.onTable) continue;
      if (b.id === ignoreId) continue;
      const dx = b.pos[0] - x;
      const dy = b.pos[1] - y;
      if (dx * dx + dy * dy < (2 * 0.02625) * (2 * 0.02625)) return true;
    }
    return false;
  };
  for (const color of colorsToRespot) {
    const ball = balls.find((b) => b.color === color && !b.onTable);
    if (!ball || !ball.spot) continue;
    let [sx, sy] = ball.spot;
    while (occupiedByOthers(sx, sy, ball.id)) sx += 2 * 0.02625;
    ball.pos[0] = sx;
    ball.pos[1] = sy;
    ball.vel[0] = 0; ball.vel[1] = 0;
    ball.spin[0] = 0; ball.spin[1] = 0; ball.spin[2] = 0;
    ball.onTable = true;
  }
  if (respotCue) {
    const cue = balls.find((b) => b.color === 'cue');
    if (cue) {
      cue.pos[0] = SPOT_BAULK_X - 0.16;
      cue.pos[1] = 0;
      cue.vel[0] = 0; cue.vel[1] = 0;
      cue.spin[0] = 0; cue.spin[1] = 0; cue.spin[2] = 0;
      cue.onTable = true;
    }
  }
}

export default SnookerGame;
