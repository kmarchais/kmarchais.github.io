// Chess piece types
export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
export type Color = 'white' | 'black';

// Board coordinates (0-7 for both file and rank)
export type FileIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type RankIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Piece {
  type: PieceType;
  color: Color;
}

export interface Square {
  file: FileIndex;
  rank: RankIndex;
}

export interface Move {
  from: Square;
  to: Square;
  piece: Piece;
  capture?: Piece;
  promotion?: PieceType;
  isCastling?: 'kingside' | 'queenside';
  isEnPassant?: boolean;
}

export interface CastlingRights {
  whiteKingside: boolean;
  whiteQueenside: boolean;
  blackKingside: boolean;
  blackQueenside: boolean;
}

export interface GameState {
  board: (Piece | null)[][];  // board[rank][file], 8x8 grid
  turn: Color;
  castlingRights: CastlingRights;
  enPassantSquare: Square | null;
  halfMoveClock: number;
  fullMoveNumber: number;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  drawReason?: 'stalemate' | 'fifty-move' | 'threefold' | 'insufficient';
  isResigned: boolean;
  resignedColor?: Color;
  lastMove: Move | null;
  positionHistory: string[];  // For threefold repetition detection
}

// Piece values for AI evaluation
export const PIECE_VALUES: Record<PieceType, number> = {
  pawn: 100,
  knight: 320,
  bishop: 330,
  rook: 500,
  queen: 900,
  king: 20000,
};

// Unicode chess symbols - using filled symbols for both colors (styled via CSS)
export const PIECE_SYMBOLS: Record<Color, Record<PieceType, string>> = {
  white: {
    king: '\u265A',   // ♚ (filled, styled white)
    queen: '\u265B',  // ♛
    rook: '\u265C',   // ♜
    bishop: '\u265D', // ♝
    knight: '\u265E', // ♞
    pawn: '\u265F',   // ♟
  },
  black: {
    king: '\u265A',   // ♚
    queen: '\u265B',  // ♛
    rook: '\u265C',   // ♜
    bishop: '\u265D', // ♝
    knight: '\u265E', // ♞
    pawn: '\u265F',   // ♟
  },
};

// File letters for display
export const FILE_LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

// Helper to convert between algebraic notation and indices
export function squareToAlgebraic(square: Square): string {
  return `${FILE_LETTERS[square.file]}${square.rank + 1}`;
}

export function algebraicToSquare(notation: string): Square | null {
  if (notation.length !== 2) return null;
  const file = FILE_LETTERS.indexOf(notation[0] as typeof FILE_LETTERS[number]);
  const rank = parseInt(notation[1]) - 1;
  if (file === -1 || rank < 0 || rank > 7) return null;
  return { file: file as FileIndex, rank: rank as RankIndex };
}
