import type {
  Piece,
  GameState,
  Square,
  Move,
  FileIndex,
  RankIndex,
  Color,
  PieceType,
} from './types';
import {
  wrapFile,
  isValidRank,
  getPieceAt,
  squaresEqual,
} from './board';

// Direction vectors for sliding pieces
// In cylinder chess, horizontal movement wraps around
const ROOK_DIRECTIONS = [
  [0, 1],   // up
  [0, -1],  // down
  [1, 0],   // right (wraps)
  [-1, 0],  // left (wraps)
];

const BISHOP_DIRECTIONS = [
  [1, 1],   // up-right (wraps horizontally)
  [1, -1],  // down-right (wraps horizontally)
  [-1, 1],  // up-left (wraps horizontally)
  [-1, -1], // down-left (wraps horizontally)
];

const QUEEN_DIRECTIONS = [...ROOK_DIRECTIONS, ...BISHOP_DIRECTIONS];

const KNIGHT_MOVES = [
  [2, 1],
  [2, -1],
  [-2, 1],
  [-2, -1],
  [1, 2],
  [1, -2],
  [-1, 2],
  [-1, -2],
];

const KING_MOVES = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

// Generate all pseudo-legal moves for a piece (doesn't check for leaving king in check)
export function generatePseudoLegalMoves(
  state: GameState,
  square: Square
): Move[] {
  const piece = getPieceAt(state.board, square);
  if (!piece) return [];

  switch (piece.type) {
    case 'pawn':
      return generatePawnMoves(state, square, piece);
    case 'knight':
      return generateKnightMoves(state, square, piece);
    case 'bishop':
      return generateSlidingMoves(state, square, piece, BISHOP_DIRECTIONS);
    case 'rook':
      return generateSlidingMoves(state, square, piece, ROOK_DIRECTIONS);
    case 'queen':
      return generateSlidingMoves(state, square, piece, QUEEN_DIRECTIONS);
    case 'king':
      return generateKingMoves(state, square, piece);
    default:
      return [];
  }
}

// Generate pawn moves (no horizontal wrapping for pawns)
function generatePawnMoves(
  state: GameState,
  from: Square,
  piece: Piece
): Move[] {
  const moves: Move[] = [];
  const direction = piece.color === 'white' ? 1 : -1;
  const startRank = piece.color === 'white' ? 1 : 6;
  const promotionRank = piece.color === 'white' ? 7 : 0;

  // Single push
  const singlePushRank = from.rank + direction;
  if (isValidRank(singlePushRank)) {
    const targetSquare: Square = { file: from.file, rank: singlePushRank };
    if (!getPieceAt(state.board, targetSquare)) {
      if (singlePushRank === promotionRank) {
        // Promotion
        for (const promoType of ['queen', 'rook', 'bishop', 'knight'] as PieceType[]) {
          moves.push({
            from,
            to: targetSquare,
            piece,
            promotion: promoType,
          });
        }
      } else {
        moves.push({ from, to: targetSquare, piece });
      }

      // Double push from starting position
      if (from.rank === startRank) {
        const doublePushRank = from.rank + direction * 2;
        if (isValidRank(doublePushRank)) {
          const doublePushSquare: Square = {
            file: from.file,
            rank: doublePushRank,
          };
          if (!getPieceAt(state.board, doublePushSquare)) {
            moves.push({ from, to: doublePushSquare, piece });
          }
        }
      }
    }
  }

  // Captures (diagonal) - these DO wrap in cylinder chess!
  for (const fileOffset of [-1, 1]) {
    const captureFile = wrapFile(from.file + fileOffset);
    const captureRank = from.rank + direction;
    if (isValidRank(captureRank)) {
      const captureSquare: Square = {
        file: captureFile,
        rank: captureRank,
      };
      const targetPiece = getPieceAt(state.board, captureSquare);

      // Regular capture
      if (targetPiece && targetPiece.color !== piece.color) {
        if (captureRank === promotionRank) {
          for (const promoType of ['queen', 'rook', 'bishop', 'knight'] as PieceType[]) {
            moves.push({
              from,
              to: captureSquare,
              piece,
              capture: targetPiece,
              promotion: promoType,
            });
          }
        } else {
          moves.push({
            from,
            to: captureSquare,
            piece,
            capture: targetPiece,
          });
        }
      }

      // En passant
      if (
        state.enPassantSquare &&
        squaresEqual(captureSquare, state.enPassantSquare)
      ) {
        const capturedPawnSquare: Square = {
          file: captureFile,
          rank: from.rank,
        };
        const capturedPawn = getPieceAt(state.board, capturedPawnSquare);
        if (capturedPawn) {
          moves.push({
            from,
            to: captureSquare,
            piece,
            capture: capturedPawn,
            isEnPassant: true,
          });
        }
      }
    }
  }

  return moves;
}

// Generate knight moves (wraps horizontally)
function generateKnightMoves(
  state: GameState,
  from: Square,
  piece: Piece
): Move[] {
  const moves: Move[] = [];

  for (const [fileOffset, rankOffset] of KNIGHT_MOVES) {
    const toFile = wrapFile(from.file + fileOffset);
    const toRank = from.rank + rankOffset;

    if (isValidRank(toRank)) {
      const toSquare: Square = { file: toFile, rank: toRank as RankIndex };
      const targetPiece = getPieceAt(state.board, toSquare);

      if (!targetPiece || targetPiece.color !== piece.color) {
        moves.push({
          from,
          to: toSquare,
          piece,
          capture: targetPiece || undefined,
        });
      }
    }
  }

  return moves;
}

// Generate sliding piece moves (bishop, rook, queen)
// Files wrap around for cylinder chess
function generateSlidingMoves(
  state: GameState,
  from: Square,
  piece: Piece,
  directions: number[][]
): Move[] {
  const moves: Move[] = [];

  for (const [fileDir, rankDir] of directions) {
    let file = from.file;
    let rank = from.rank;
    let distance = 0;

    // Limit distance to prevent infinite loops on horizontal moves
    const maxDistance = 8;

    while (distance < maxDistance) {
      file = wrapFile(file + fileDir);
      rank = rank + rankDir;
      distance++;

      // Check if we've wrapped back to the starting square (horizontal)
      if (file === from.file && rank === from.rank) break;

      if (!isValidRank(rank)) break;

      const toSquare: Square = { file, rank: rank as RankIndex };
      const targetPiece = getPieceAt(state.board, toSquare);

      if (!targetPiece) {
        moves.push({ from, to: toSquare, piece });
      } else if (targetPiece.color !== piece.color) {
        moves.push({ from, to: toSquare, piece, capture: targetPiece });
        break; // Can't move past captured piece
      } else {
        break; // Blocked by own piece
      }
    }
  }

  return moves;
}

// Generate king moves including castling
function generateKingMoves(
  state: GameState,
  from: Square,
  piece: Piece
): Move[] {
  const moves: Move[] = [];

  // Normal moves (wrap horizontally)
  for (const [fileOffset, rankOffset] of KING_MOVES) {
    const toFile = wrapFile(from.file + fileOffset);
    const toRank = from.rank + rankOffset;

    if (isValidRank(toRank)) {
      const toSquare: Square = { file: toFile, rank: toRank as RankIndex };
      const targetPiece = getPieceAt(state.board, toSquare);

      if (!targetPiece || targetPiece.color !== piece.color) {
        moves.push({
          from,
          to: toSquare,
          piece,
          capture: targetPiece || undefined,
        });
      }
    }
  }

  // Castling (standard rules - no wrapping)
  // Note: In cylinder chess, castling typically follows standard rules
  // (king starts on e-file, castles with rooks on a and h files)
  if (!state.isCheck) {
    const rank = piece.color === 'white' ? 0 : 7;
    const rights = state.castlingRights;

    // Kingside castling
    const canKingside =
      piece.color === 'white' ? rights.whiteKingside : rights.blackKingside;
    if (canKingside && from.file === 4 && from.rank === rank) {
      // Check squares between king and rook are empty
      const f = getPieceAt(state.board, { file: 5, rank: rank as RankIndex });
      const g = getPieceAt(state.board, { file: 6, rank: rank as RankIndex });
      if (!f && !g) {
        moves.push({
          from,
          to: { file: 6 as FileIndex, rank: rank as RankIndex },
          piece,
          isCastling: 'kingside',
        });
      }
    }

    // Queenside castling
    const canQueenside =
      piece.color === 'white' ? rights.whiteQueenside : rights.blackQueenside;
    if (canQueenside && from.file === 4 && from.rank === rank) {
      const b = getPieceAt(state.board, { file: 1, rank: rank as RankIndex });
      const c = getPieceAt(state.board, { file: 2, rank: rank as RankIndex });
      const d = getPieceAt(state.board, { file: 3, rank: rank as RankIndex });
      if (!b && !c && !d) {
        moves.push({
          from,
          to: { file: 2 as FileIndex, rank: rank as RankIndex },
          piece,
          isCastling: 'queenside',
        });
      }
    }
  }

  return moves;
}

// Generate all pseudo-legal moves for a color
export function generateAllPseudoLegalMoves(
  state: GameState,
  color: Color
): Move[] {
  const moves: Move[] = [];

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = state.board[rank][file];
      if (piece?.color === color) {
        const square: Square = {
          file: file as FileIndex,
          rank: rank as RankIndex,
        };
        moves.push(...generatePseudoLegalMoves(state, square));
      }
    }
  }

  return moves;
}

// Check if a square is attacked by a color
export function isSquareAttacked(
  state: GameState,
  square: Square,
  byColor: Color
): boolean {
  const board = state.board;

  // Check for pawn attacks
  const pawnDirection = byColor === 'white' ? -1 : 1;
  for (const fileOffset of [-1, 1]) {
    const attackFile = wrapFile(square.file + fileOffset);
    const attackRank = square.rank + pawnDirection;
    if (isValidRank(attackRank)) {
      const piece = board[attackRank][attackFile];
      if (piece?.type === 'pawn' && piece.color === byColor) {
        return true;
      }
    }
  }

  // Check for knight attacks
  for (const [fileOffset, rankOffset] of KNIGHT_MOVES) {
    const attackFile = wrapFile(square.file + fileOffset);
    const attackRank = square.rank + rankOffset;
    if (isValidRank(attackRank)) {
      const piece = board[attackRank][attackFile];
      if (piece?.type === 'knight' && piece.color === byColor) {
        return true;
      }
    }
  }

  // Check for king attacks
  for (const [fileOffset, rankOffset] of KING_MOVES) {
    const attackFile = wrapFile(square.file + fileOffset);
    const attackRank = square.rank + rankOffset;
    if (isValidRank(attackRank)) {
      const piece = board[attackRank][attackFile];
      if (piece?.type === 'king' && piece.color === byColor) {
        return true;
      }
    }
  }

  // Check for rook/queen attacks (straight lines)
  for (const [fileDir, rankDir] of ROOK_DIRECTIONS) {
    let file = square.file;
    let rank = square.rank;
    let distance = 0;

    while (distance < 8) {
      file = wrapFile(file + fileDir);
      rank = rank + rankDir;
      distance++;

      if (file === square.file && rank === square.rank) break;
      if (!isValidRank(rank)) break;

      const piece = board[rank][file];
      if (piece) {
        if (
          piece.color === byColor &&
          (piece.type === 'rook' || piece.type === 'queen')
        ) {
          return true;
        }
        break;
      }
    }
  }

  // Check for bishop/queen attacks (diagonals)
  for (const [fileDir, rankDir] of BISHOP_DIRECTIONS) {
    let file = square.file;
    let rank = square.rank;
    let distance = 0;

    while (distance < 8) {
      file = wrapFile(file + fileDir);
      rank = rank + rankDir;
      distance++;

      if (file === square.file && rank === square.rank) break;
      if (!isValidRank(rank)) break;

      const piece = board[rank][file];
      if (piece) {
        if (
          piece.color === byColor &&
          (piece.type === 'bishop' || piece.type === 'queen')
        ) {
          return true;
        }
        break;
      }
    }
  }

  return false;
}
