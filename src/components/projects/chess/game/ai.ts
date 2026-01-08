import type { GameState, Move, Color, PieceType } from './types';
import { PIECE_VALUES } from './types';
import { applyMove } from './board';
import { getAllLegalMoves, updateGameStatus } from './validation';

// Piece-square tables for positional evaluation
// Values from White's perspective (higher = better for white pieces)
const PAWN_TABLE = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_TABLE = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const BISHOP_TABLE = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

const ROOK_TABLE = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 0, 5, 5, 0, 0, 0],
];

const QUEEN_TABLE = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

const KING_MIDDLEGAME_TABLE = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

const PIECE_TABLES: Record<PieceType, number[][]> = {
  pawn: PAWN_TABLE,
  knight: KNIGHT_TABLE,
  bishop: BISHOP_TABLE,
  rook: ROOK_TABLE,
  queen: QUEEN_TABLE,
  king: KING_MIDDLEGAME_TABLE,
};

// Evaluate the board position (positive = white advantage, negative = black advantage)
export function evaluatePosition(state: GameState): number {
  if (state.isCheckmate) {
    // The player whose turn it is has been checkmated
    return state.turn === 'white' ? -100000 : 100000;
  }

  if (state.isStalemate) {
    return 0;
  }

  let score = 0;

  // Material and position evaluation
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = state.board[rank][file];
      if (!piece) continue;

      const materialValue = PIECE_VALUES[piece.type];
      const table = PIECE_TABLES[piece.type];

      // For white pieces, use table as-is; for black, flip the rank
      const tableRank = piece.color === 'white' ? 7 - rank : rank;
      const positionalValue = table[tableRank][file];

      const totalValue = materialValue + positionalValue;

      if (piece.color === 'white') {
        score += totalValue;
      } else {
        score -= totalValue;
      }
    }
  }

  // Bonus for having the right to castle
  if (state.castlingRights.whiteKingside) score += 10;
  if (state.castlingRights.whiteQueenside) score += 10;
  if (state.castlingRights.blackKingside) score -= 10;
  if (state.castlingRights.blackQueenside) score -= 10;

  return score;
}

// Minimax with alpha-beta pruning
function minimax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  maximizingPlayer: boolean
): number {
  if (depth === 0 || state.isCheckmate || state.isStalemate) {
    return evaluatePosition(state);
  }

  const color: Color = maximizingPlayer ? 'white' : 'black';
  const moves = getAllLegalMoves(state, color);

  if (moves.length === 0) {
    // No legal moves - checkmate or stalemate
    if (state.isCheck) {
      return maximizingPlayer ? -100000 + (10 - depth) : 100000 - (10 - depth);
    }
    return 0; // Stalemate
  }

  // Move ordering: captures first, then checks
  moves.sort((a, b) => {
    const aScore = (a.capture ? PIECE_VALUES[a.capture.type] : 0);
    const bScore = (b.capture ? PIECE_VALUES[b.capture.type] : 0);
    return bScore - aScore;
  });

  if (maximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of moves) {
      let newState = applyMove(state, move);
      newState = updateGameStatus(newState);
      const evaluation = minimax(newState, depth - 1, alpha, beta, false);
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break; // Beta cutoff
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      let newState = applyMove(state, move);
      newState = updateGameStatus(newState);
      const evaluation = minimax(newState, depth - 1, alpha, beta, true);
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break; // Alpha cutoff
    }
    return minEval;
  }
}

// Find the best move for the AI
export function findBestMove(
  state: GameState,
  depth: number = 3
): Move | null {
  const color = state.turn;
  const moves = getAllLegalMoves(state, color);

  if (moves.length === 0) return null;

  // Randomize move order to add variety when moves have equal value
  for (let i = moves.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [moves[i], moves[j]] = [moves[j], moves[i]];
  }

  let bestMove: Move | null = null;
  let bestScore = color === 'white' ? -Infinity : Infinity;
  const isMaximizing = color === 'white';

  for (const move of moves) {
    let newState = applyMove(state, move);
    newState = updateGameStatus(newState);

    const score = minimax(
      newState,
      depth - 1,
      -Infinity,
      Infinity,
      !isMaximizing
    );

    if (isMaximizing) {
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    } else {
      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
  }

  return bestMove;
}

// AI difficulty levels
export type AIDifficulty = 'easy' | 'medium' | 'hard';

export function getDepthForDifficulty(difficulty: AIDifficulty): number {
  switch (difficulty) {
    case 'easy':
      return 2;
    case 'medium':
      return 3;
    case 'hard':
      return 4;
    default:
      return 3;
  }
}
