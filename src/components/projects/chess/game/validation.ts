import type { GameState, Move, Color, Square, FileIndex, RankIndex } from './types';
import { findKing, applyMove, cloneGameState, getPositionHash } from './board';
import {
  generatePseudoLegalMoves,
  generateAllPseudoLegalMoves,
  isSquareAttacked,
} from './moves';

// Check if a color's king is in check
export function isInCheck(state: GameState, color: Color): boolean {
  const kingSquare = findKing(state.board, color);
  if (!kingSquare) return false; // Should never happen in a valid game

  const opponentColor = color === 'white' ? 'black' : 'white';
  return isSquareAttacked(state, kingSquare, opponentColor);
}

// Check if a move is legal (doesn't leave own king in check)
export function isMoveLegal(state: GameState, move: Move): boolean {
  // Apply the move to a cloned state
  const newState = applyMove(state, move);

  // Check if own king is in check after the move
  const ownColor = move.piece.color;
  if (isInCheck(newState, ownColor)) {
    return false;
  }

  // For castling, also check that king doesn't pass through check
  if (move.isCastling) {
    const rank = ownColor === 'white' ? 0 : 7;
    const opponentColor = ownColor === 'white' ? 'black' : 'white';

    // King starting square (already checked by isCheck flag)
    const kingStart: Square = { file: 4 as FileIndex, rank: rank as RankIndex };
    if (isSquareAttacked(state, kingStart, opponentColor)) {
      return false;
    }

    if (move.isCastling === 'kingside') {
      // Check f-file (king passes through)
      const fSquare: Square = { file: 5 as FileIndex, rank: rank as RankIndex };
      if (isSquareAttacked(state, fSquare, opponentColor)) {
        return false;
      }
    } else {
      // Queenside: check d-file (king passes through)
      const dSquare: Square = { file: 3 as FileIndex, rank: rank as RankIndex };
      if (isSquareAttacked(state, dSquare, opponentColor)) {
        return false;
      }
    }
  }

  return true;
}

// Get all legal moves for a piece at a square
export function getLegalMoves(state: GameState, square: Square): Move[] {
  const pseudoLegalMoves = generatePseudoLegalMoves(state, square);
  return pseudoLegalMoves.filter((move) => isMoveLegal(state, move));
}

// Get all legal moves for a color
export function getAllLegalMoves(state: GameState, color: Color): Move[] {
  const pseudoLegalMoves = generateAllPseudoLegalMoves(state, color);
  return pseudoLegalMoves.filter((move) => isMoveLegal(state, move));
}

// Check game end conditions and update state
export function updateGameStatus(state: GameState): GameState {
  const newState = cloneGameState(state);
  const currentColor = newState.turn;

  // Add current position to history
  const positionHash = getPositionHash(newState);
  newState.positionHistory.push(positionHash);

  // Check if current player's king is in check
  newState.isCheck = isInCheck(newState, currentColor);

  // Get all legal moves for current player
  const legalMoves = getAllLegalMoves(newState, currentColor);

  if (legalMoves.length === 0) {
    if (newState.isCheck) {
      // Checkmate - the previous player (opponent) wins
      newState.isCheckmate = true;
    } else {
      // Stalemate
      newState.isStalemate = true;
      newState.isDraw = true;
      newState.drawReason = 'stalemate';
    }
  }

  // Check for insufficient material
  if (!newState.isDraw && isInsufficientMaterial(newState.board)) {
    newState.isDraw = true;
    newState.drawReason = 'insufficient';
  }

  // 50-move rule
  if (!newState.isDraw && newState.halfMoveClock >= 100) {
    newState.isDraw = true;
    newState.drawReason = 'fifty-move';
  }

  // Threefold repetition
  if (!newState.isDraw) {
    const positionCount = newState.positionHistory.filter(
      (h) => h === positionHash
    ).length;
    if (positionCount >= 3) {
      newState.isDraw = true;
      newState.drawReason = 'threefold';
    }
  }

  return newState;
}

// Check for insufficient material.
// Covers: K vs K, K+(B|N) vs K, KB vs KB with same-colored bishops,
// KBB vs K with same-colored bishops, KNN vs K. KBN vs K is NOT a draw.
function isInsufficientMaterial(board: (import('./types').Piece | null)[][]): boolean {
  type PieceEntry = { type: import('./types').PieceType; squareColor: 0 | 1 };
  const white: PieceEntry[] = [];
  const black: PieceEntry[] = [];

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (!piece) continue;
      const squareColor = ((file + rank) % 2) as 0 | 1;
      (piece.color === 'white' ? white : black).push({ type: piece.type, squareColor });
    }
  }

  const nonKings = (side: PieceEntry[]) => side.filter((p) => p.type !== 'king');
  const whiteRest = nonKings(white);
  const blackRest = nonKings(black);

  // Any heavy piece or pawn means mate is still possible.
  const hasMatingMaterial = (side: PieceEntry[]) =>
    side.some((p) => p.type === 'queen' || p.type === 'rook' || p.type === 'pawn');
  if (hasMatingMaterial(whiteRest) || hasMatingMaterial(blackRest)) return false;

  // K vs K
  if (whiteRest.length === 0 && blackRest.length === 0) return true;

  // K + minor vs K
  if (whiteRest.length === 1 && blackRest.length === 0) return true;
  if (blackRest.length === 1 && whiteRest.length === 0) return true;

  // K + N + N vs K  (cannot be forced)
  if (whiteRest.length === 2 && blackRest.length === 0 &&
      whiteRest.every((p) => p.type === 'knight')) return true;
  if (blackRest.length === 2 && whiteRest.length === 0 &&
      blackRest.every((p) => p.type === 'knight')) return true;

  // K + B + ... + B vs K with all bishops on one color
  const allBishopsSameColor = (side: PieceEntry[]) =>
    side.length > 0 &&
    side.every((p) => p.type === 'bishop') &&
    side.every((p) => p.squareColor === side[0].squareColor);
  if (blackRest.length === 0 && allBishopsSameColor(whiteRest)) return true;
  if (whiteRest.length === 0 && allBishopsSameColor(blackRest)) return true;

  // KB vs KB with bishops on the same square color
  if (whiteRest.length === 1 && blackRest.length === 1 &&
      whiteRest[0].type === 'bishop' && blackRest[0].type === 'bishop' &&
      whiteRest[0].squareColor === blackRest[0].squareColor) return true;

  return false;
}

// Make a move and return the new game state
export function makeMove(state: GameState, move: Move): GameState | null {
  // Validate the move is legal
  if (!isMoveLegal(state, move)) {
    return null;
  }

  // Apply the move
  let newState = applyMove(state, move);

  // Update game status (check, checkmate, stalemate)
  newState = updateGameStatus(newState);

  return newState;
}

// Find a move given from and to squares
export function findMove(
  state: GameState,
  from: Square,
  to: Square,
  promotion?: import('./types').PieceType
): Move | null {
  const legalMoves = getLegalMoves(state, from);

  for (const move of legalMoves) {
    if (move.to.file === to.file && move.to.rank === to.rank) {
      // If it's a promotion, match the promotion type
      if (move.promotion) {
        if (promotion && move.promotion === promotion) {
          return move;
        }
        // Default to queen if no promotion specified
        if (!promotion && move.promotion === 'queen') {
          return move;
        }
      } else {
        return move;
      }
    }
  }

  return null;
}
