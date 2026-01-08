import type {
  Piece,
  GameState,
  CastlingRights,
  Color,
  FileIndex,
  RankIndex,
  Square,
  Move,
} from './types';

// Wrap file index for cylinder board (a-h wrap around)
export function wrapFile(file: number): FileIndex {
  return (((file % 8) + 8) % 8) as FileIndex;
}

// Check if a rank is valid (ranks don't wrap)
export function isValidRank(rank: number): rank is RankIndex {
  return rank >= 0 && rank <= 7;
}

// Create initial board setup
export function createInitialBoard(): (Piece | null)[][] {
  const board: (Piece | null)[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  // Place pawns
  for (let file = 0; file < 8; file++) {
    board[1][file] = { type: 'pawn', color: 'white' };
    board[6][file] = { type: 'pawn', color: 'black' };
  }

  // Place pieces for both colors
  const backRankPieces: Piece['type'][] = [
    'rook',
    'knight',
    'bishop',
    'queen',
    'king',
    'bishop',
    'knight',
    'rook',
  ];

  for (let file = 0; file < 8; file++) {
    board[0][file] = { type: backRankPieces[file], color: 'white' };
    board[7][file] = { type: backRankPieces[file], color: 'black' };
  }

  return board;
}

// Generate a hash string for the current position (for threefold repetition)
export function getPositionHash(state: GameState): string {
  const parts: string[] = [];

  // Board position
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = state.board[rank][file];
      if (piece) {
        parts.push(`${rank}${file}${piece.color[0]}${piece.type[0]}`);
      }
    }
  }

  // Turn
  parts.push(state.turn);

  // Castling rights
  parts.push(
    (state.castlingRights.whiteKingside ? 'K' : '') +
    (state.castlingRights.whiteQueenside ? 'Q' : '') +
    (state.castlingRights.blackKingside ? 'k' : '') +
    (state.castlingRights.blackQueenside ? 'q' : '')
  );

  // En passant square
  if (state.enPassantSquare) {
    parts.push(`ep${state.enPassantSquare.file}${state.enPassantSquare.rank}`);
  }

  return parts.join('|');
}

// Create initial game state
export function createInitialGameState(): GameState {
  const initialState: GameState = {
    board: createInitialBoard(),
    turn: 'white',
    castlingRights: {
      whiteKingside: true,
      whiteQueenside: true,
      blackKingside: true,
      blackQueenside: true,
    },
    enPassantSquare: null,
    halfMoveClock: 0,
    fullMoveNumber: 1,
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    isDraw: false,
    isResigned: false,
    lastMove: null,
    positionHistory: [],
  };

  // Add initial position to history
  initialState.positionHistory = [getPositionHash(initialState)];

  return initialState;
}

// Get piece at square
export function getPieceAt(
  board: (Piece | null)[][],
  square: Square
): Piece | null {
  return board[square.rank][square.file];
}

// Set piece at square (returns new board)
export function setPieceAt(
  board: (Piece | null)[][],
  square: Square,
  piece: Piece | null
): (Piece | null)[][] {
  const newBoard = board.map((rank) => [...rank]);
  newBoard[square.rank][square.file] = piece;
  return newBoard;
}

// Deep clone game state
export function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    board: state.board.map((rank) => [...rank]),
    castlingRights: { ...state.castlingRights },
    enPassantSquare: state.enPassantSquare
      ? { ...state.enPassantSquare }
      : null,
    lastMove: state.lastMove
      ? {
          ...state.lastMove,
          from: { ...state.lastMove.from },
          to: { ...state.lastMove.to },
        }
      : null,
    positionHistory: [...state.positionHistory],
  };
}

// Apply a move to the game state (returns new state)
export function applyMove(state: GameState, move: Move): GameState {
  const newState = cloneGameState(state);
  const { board } = newState;
  const piece = move.piece;

  // Remove piece from origin
  board[move.from.rank][move.from.file] = null;

  // Handle promotion
  const placedPiece = move.promotion
    ? { type: move.promotion, color: piece.color }
    : piece;

  // Place piece at destination
  board[move.to.rank][move.to.file] = placedPiece;

  // Handle castling
  if (move.isCastling) {
    const rank = piece.color === 'white' ? 0 : 7;
    if (move.isCastling === 'kingside') {
      // Move rook from h to f
      board[rank][5] = board[rank][7];
      board[rank][7] = null;
    } else {
      // Move rook from a to d
      board[rank][3] = board[rank][0];
      board[rank][0] = null;
    }
  }

  // Handle en passant capture
  if (move.isEnPassant) {
    const capturedPawnRank = piece.color === 'white' ? 4 : 3;
    board[capturedPawnRank][move.to.file] = null;
  }

  // Update castling rights
  updateCastlingRights(newState.castlingRights, move);

  // Update en passant square
  if (
    piece.type === 'pawn' &&
    Math.abs(move.to.rank - move.from.rank) === 2
  ) {
    const enPassantRank = piece.color === 'white' ? 2 : 5;
    newState.enPassantSquare = {
      file: move.to.file,
      rank: enPassantRank as RankIndex,
    };
  } else {
    newState.enPassantSquare = null;
  }

  // Update clocks
  if (piece.type === 'pawn' || move.capture) {
    newState.halfMoveClock = 0;
  } else {
    newState.halfMoveClock++;
  }

  if (piece.color === 'black') {
    newState.fullMoveNumber++;
  }

  // Switch turn
  newState.turn = piece.color === 'white' ? 'black' : 'white';
  newState.lastMove = move;

  return newState;
}

// Update castling rights based on move
function updateCastlingRights(rights: CastlingRights, move: Move): void {
  const piece = move.piece;

  // King moves remove all castling rights for that color
  if (piece.type === 'king') {
    if (piece.color === 'white') {
      rights.whiteKingside = false;
      rights.whiteQueenside = false;
    } else {
      rights.blackKingside = false;
      rights.blackQueenside = false;
    }
  }

  // Rook moves remove castling on that side
  if (piece.type === 'rook') {
    if (piece.color === 'white') {
      if (move.from.file === 0 && move.from.rank === 0) {
        rights.whiteQueenside = false;
      }
      if (move.from.file === 7 && move.from.rank === 0) {
        rights.whiteKingside = false;
      }
    } else {
      if (move.from.file === 0 && move.from.rank === 7) {
        rights.blackQueenside = false;
      }
      if (move.from.file === 7 && move.from.rank === 7) {
        rights.blackKingside = false;
      }
    }
  }

  // Rook captures also remove castling rights
  if (move.capture?.type === 'rook') {
    if (move.to.file === 0 && move.to.rank === 0) {
      rights.whiteQueenside = false;
    }
    if (move.to.file === 7 && move.to.rank === 0) {
      rights.whiteKingside = false;
    }
    if (move.to.file === 0 && move.to.rank === 7) {
      rights.blackQueenside = false;
    }
    if (move.to.file === 7 && move.to.rank === 7) {
      rights.blackKingside = false;
    }
  }
}

// Find king position
export function findKing(board: (Piece | null)[][], color: Color): Square | null {
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece?.type === 'king' && piece.color === color) {
        return { file: file as FileIndex, rank: rank as RankIndex };
      }
    }
  }
  return null;
}

// Get all pieces of a color
export function getPieces(
  board: (Piece | null)[][],
  color: Color
): { piece: Piece; square: Square }[] {
  const pieces: { piece: Piece; square: Square }[] = [];
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece?.color === color) {
        pieces.push({
          piece,
          square: { file: file as FileIndex, rank: rank as RankIndex },
        });
      }
    }
  }
  return pieces;
}

// Check if two squares are equal
export function squaresEqual(a: Square, b: Square): boolean {
  return a.file === b.file && a.rank === b.rank;
}
