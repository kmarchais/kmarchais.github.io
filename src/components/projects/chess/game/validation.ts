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

// Check for insufficient material (simplified version)
function isInsufficientMaterial(board: (import('./types').Piece | null)[][]): boolean {
  let whitePieces: import('./types').PieceType[] = [];
  let blackPieces: import('./types').PieceType[] = [];

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece) {
        if (piece.color === 'white') {
          whitePieces.push(piece.type);
        } else {
          blackPieces.push(piece.type);
        }
      }
    }
  }

  // King vs King
  if (whitePieces.length === 1 && blackPieces.length === 1) {
    return true;
  }

  // King + Bishop vs King or King + Knight vs King
  if (
    (whitePieces.length === 1 &&
      blackPieces.length === 2 &&
      (blackPieces.includes('bishop') || blackPieces.includes('knight'))) ||
    (blackPieces.length === 1 &&
      whitePieces.length === 2 &&
      (whitePieces.includes('bishop') || whitePieces.includes('knight')))
  ) {
    return true;
  }

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
