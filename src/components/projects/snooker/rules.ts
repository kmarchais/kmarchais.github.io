/**
 * Snooker rules state machine.
 *
 * Phase 1 (reds remaining):
 *   - "ball on" is RED (one red must be the first ball struck and the
 *     only ball type that should be potted to score).
 *   - After potting a red, "ball on" becomes a COLOR (any colour). The
 *     player nominates by hitting one.
 *   - After potting a color while reds remain: color is re-spotted; "ball
 *     on" goes back to RED.
 *
 * Phase 2 (all reds potted):
 *   - "Ball on" cycles in ascending order: yellow, green, brown, blue, pink, black.
 *   - When a color is potted in order, it stays in the pocket and the
 *     next color becomes the ball on.
 *
 * Fouls (4 points minimum, or value of the ball involved if higher):
 *   - Cue ball potted ("in off").
 *   - First ball struck wasn't the ball on.
 *   - No ball struck.
 *   - Ball off the table (not implemented in v1).
 *   - Pot of a non-ball-on (when reds are still on the table) is itself
 *     not a foul under v1 simplification.
 *
 * After a foul, the opponent's turn starts. Free-ball rule not implemented.
 */

import type { BallColor } from './physics';

export const COLOR_VALUE: Record<BallColor, number> = {
  cue: 0,
  red: 1,
  yellow: 2,
  green: 3,
  brown: 4,
  blue: 5,
  pink: 6,
  black: 7,
};

export type Phase = 'reds' | 'colors-sequence' | 'frame-over';

export interface GameState {
  scores: [number, number];
  currentPlayer: 0 | 1;
  /** Color that the player must hit first. In 'colors-sequence' phase this
      is also the only color that scores. In 'reds' phase, after a red is
      potted this becomes a generic 'any-color' marker we handle separately. */
  ballOn: BallColor | 'any-color';
  phase: Phase;
  redsRemaining: number;
  /** Last shot's foul reason for the UI; null when shot was legal. */
  lastFoul: string | null;
  /** Last shot's pocketed balls (for "you potted..." feedback). */
  lastPotted: BallColor[];
  /** Colors that must be re-spotted (after each shot, before next). */
  pendingRespot: BallColor[];
}

export const NEW_GAME_STATE: GameState = {
  scores: [0, 0],
  currentPlayer: 0,
  ballOn: 'red',
  phase: 'reds',
  redsRemaining: 15,
  lastFoul: null,
  lastPotted: [],
  pendingRespot: [],
};

const COLOR_SEQUENCE: BallColor[] = ['yellow', 'green', 'brown', 'blue', 'pink', 'black'];

interface ShotOutcome {
  firstHit: BallColor | null;
  pocketed: BallColor[];
}

/**
 * Apply the outcome of a shot to the game state. Mutates and returns it.
 */
export function applyShot(state: GameState, outcome: ShotOutcome): GameState {
  state.lastPotted = [...outcome.pocketed];
  state.pendingRespot = [];

  const cuePotted = outcome.pocketed.includes('cue');
  const nonCuePotted = outcome.pocketed.filter((c) => c !== 'cue');
  const ballOn = state.ballOn;
  let foul: string | null = null;
  let foulValue = 4;

  // --- Foul checks ---
  if (cuePotted) {
    foul = 'Cue ball potted';
    foulValue = Math.max(foulValue, 4);
  }

  if (outcome.firstHit === null) {
    foul = foul ?? 'No ball was struck';
  } else {
    // Was the first ball hit legal for the current ball-on?
    if (ballOn === 'red' && outcome.firstHit !== 'red') {
      foul = foul ?? `Hit ${outcome.firstHit} first, expected red`;
      foulValue = Math.max(foulValue, COLOR_VALUE[outcome.firstHit]);
    } else if (ballOn === 'any-color') {
      // Any color is fine; hitting a red is the foul.
      if (outcome.firstHit === 'red') {
        foul = foul ?? 'Hit red, expected a colour';
      }
    } else if (ballOn !== 'red') {
      // ballOn is a specific colour (we're in colors-sequence phase).
      if (outcome.firstHit !== ballOn) {
        foul = foul ?? `Hit ${outcome.firstHit} first, expected ${ballOn}`;
        foulValue = Math.max(foulValue, COLOR_VALUE[outcome.firstHit]);
      }
    }
  }

  // Foul value also bumps to value of any ball wrongly potted.
  if (foul) {
    for (const c of nonCuePotted) {
      if (state.phase === 'reds') {
        // In reds phase, anything that's not red or the nominated color is a foul-value bump.
        if (c !== 'red') foulValue = Math.max(foulValue, COLOR_VALUE[c]);
        else foulValue = Math.max(foulValue, COLOR_VALUE.red);
      } else {
        if (c !== ballOn) foulValue = Math.max(foulValue, COLOR_VALUE[c]);
      }
    }
  }

  // --- Apply scoring (only if no foul) ---
  if (!foul) {
    if (state.phase === 'reds') {
      // Legal first-hit, now resolve potted balls.
      if (ballOn === 'red') {
        const redsPotted = nonCuePotted.filter((c) => c === 'red').length;
        const colorsPotted = nonCuePotted.filter((c) => c !== 'red');
        if (redsPotted === 0 && colorsPotted.length > 0) {
          // Potted a color while ball-on red: foul.
          foul = 'Potted a colour while ball on red';
          for (const c of colorsPotted) foulValue = Math.max(foulValue, COLOR_VALUE[c]);
        } else {
          // Score reds; potted colors get re-spotted; ball-on becomes any-color
          // if at least one red was potted.
          state.scores[state.currentPlayer] += redsPotted * COLOR_VALUE.red;
          state.redsRemaining -= redsPotted;
          if (redsPotted > 0) {
            state.ballOn = 'any-color';
          }
          // Re-spot all colors that got knocked in.
          for (const c of colorsPotted) state.pendingRespot.push(c);
        }
      } else if (ballOn === 'any-color') {
        // Should pot exactly one color, no reds.
        const colorsPotted = nonCuePotted.filter((c) => c !== 'red');
        const redsPotted = nonCuePotted.filter((c) => c === 'red').length;
        if (redsPotted > 0) {
          // Hit a color first but red went in too: still legal? Strict rule says foul.
          foul = 'Red potted on a colour shot';
        } else if (colorsPotted.length > 1) {
          foul = 'More than one colour potted';
          for (const c of colorsPotted) foulValue = Math.max(foulValue, COLOR_VALUE[c]);
        } else if (colorsPotted.length === 1) {
          const c = colorsPotted[0];
          state.scores[state.currentPlayer] += COLOR_VALUE[c];
          state.pendingRespot.push(c);
        }
        // Ball-on flips back to red after the color shot resolved.
        if (!foul) {
          if (state.redsRemaining > 0) state.ballOn = 'red';
          else {
            state.phase = 'colors-sequence';
            state.ballOn = 'yellow';
          }
        }
      }
    } else if (state.phase === 'colors-sequence') {
      // Must pot only the ball-on colour.
      const expected = ballOn as BallColor;
      const correctPotted = nonCuePotted.filter((c) => c === expected).length;
      const wrongPotted = nonCuePotted.filter((c) => c !== expected);
      if (wrongPotted.length > 0) {
        foul = `Potted ${wrongPotted.join(', ')} during ${expected}`;
        for (const c of wrongPotted) foulValue = Math.max(foulValue, COLOR_VALUE[c]);
      } else if (correctPotted > 0) {
        state.scores[state.currentPlayer] += COLOR_VALUE[expected];
        // Advance to next color in the sequence.
        const idx = COLOR_SEQUENCE.indexOf(expected);
        if (idx === COLOR_SEQUENCE.length - 1) {
          state.phase = 'frame-over';
          state.ballOn = 'red';
        } else {
          state.ballOn = COLOR_SEQUENCE[idx + 1];
        }
      }
    }
  }

  if (foul) {
    const opponent = (1 - state.currentPlayer) as 0 | 1;
    state.scores[opponent] += foulValue;
    state.lastFoul = `${foul} (${foulValue} to opponent)`;
    // All potted colors go back onto their spots after a foul.
    for (const c of nonCuePotted) {
      if (c !== 'red') state.pendingRespot.push(c);
    }
    // Cue ball returns to in-hand.
    state.currentPlayer = opponent;
  } else {
    state.lastFoul = null;
    // Turn changes when no ball was potted legally.
    const scoredThisShot = nonCuePotted.length > 0;
    if (!scoredThisShot) {
      state.currentPlayer = (1 - state.currentPlayer) as 0 | 1;
      // After a missed red shot, ball-on returns to red.
      if (state.phase === 'reds') state.ballOn = 'red';
    }
  }

  return state;
}
