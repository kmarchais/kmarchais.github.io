import { useMemo, useState, useCallback } from 'react';
import type { GameState, Square, Move, RankIndex, Color } from './game/types';
import { PIECE_SYMBOLS, FILE_LETTERS } from './game/types';
import { squaresEqual, wrapFile } from './game/board';

interface ChessBoard2DProps {
  gameState: GameState;
  selectedSquare: Square | null;
  onSquareClick: (square: Square) => void;
  onMove?: (from: Square, to: Square) => void;
  perspective: Color;
  legalMoves: Move[];
  allLegalMoves: Move[];
}

export default function ChessBoard2D({
  gameState,
  selectedSquare,
  onSquareClick,
  onMove,
  perspective,
  legalMoves,
  allLegalMoves,
}: ChessBoard2DProps) {
  const { board, lastMove, isCheck, turn } = gameState;

  // Drag state
  const [draggedSquare, setDraggedSquare] = useState<Square | null>(null);
  const [dragOverSquare, setDragOverSquare] = useState<Square | null>(null);

  // Get legal moves for a specific square (for drag validation)
  const getLegalMovesForSquare = useCallback((square: Square): Move[] => {
    return allLegalMoves.filter(m => squaresEqual(m.from, square));
  }, [allLegalMoves]);

  // Check if a move from one square to another is legal
  const isMoveLegal = useCallback((from: Square, to: Square): boolean => {
    const moves = getLegalMovesForSquare(from);
    return moves.some(m => squaresEqual(m.to, to));
  }, [getLegalMovesForSquare]);

  // Get target squares from legal moves for highlighting
  const legalTargets = useMemo(() => {
    return new Set(legalMoves.map((m) => `${m.to.file},${m.to.rank}`));
  }, [legalMoves]);

  // Check if a square is the king in check
  const isKingInCheck = (square: Square): boolean => {
    const piece = board[square.rank][square.file];
    return isCheck && piece?.type === 'king' && piece.color === turn;
  };

  // Check if a square is part of the last move
  const isLastMoveSquare = (square: Square): boolean => {
    if (!lastMove) return false;
    return squaresEqual(square, lastMove.from) || squaresEqual(square, lastMove.to);
  };

  // Get legal targets for dragged piece
  const dragLegalTargets = useMemo(() => {
    if (!draggedSquare) return new Set<string>();
    const moves = getLegalMovesForSquare(draggedSquare);
    return new Set(moves.map((m) => `${m.to.file},${m.to.rank}`));
  }, [draggedSquare, getLegalMovesForSquare]);

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, square: Square) => {
    const piece = board[square.rank][square.file];
    if (!piece || piece.color !== turn) {
      e.preventDefault();
      return;
    }
    setDraggedSquare(square);
    // Set drag data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${square.file},${square.rank}`);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedSquare(null);
    setDragOverSquare(null);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, square: Square) => {
    e.preventDefault();
    if (draggedSquare && isMoveLegal(draggedSquare, square)) {
      e.dataTransfer.dropEffect = 'move';
      setDragOverSquare(square);
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setDragOverSquare(null);
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, toSquare: Square) => {
    e.preventDefault();
    if (draggedSquare && isMoveLegal(draggedSquare, toSquare) && onMove) {
      onMove(draggedSquare, toSquare);
    }
    setDraggedSquare(null);
    setDragOverSquare(null);
  };

  // Render a single square
  const renderSquare = (
    file: number,
    rank: number,
    isGhost: boolean
  ) => {
    const wrappedFile = wrapFile(file);
    const square: Square = {
      file: wrappedFile,
      rank: rank as RankIndex,
    };
    const piece = board[rank][wrappedFile];
    const isLight = (wrappedFile + rank) % 2 === 1;
    const isSelected = !isGhost && selectedSquare && squaresEqual(square, selectedSquare);
    const isLegalTarget = !isGhost && legalTargets.has(`${wrappedFile},${rank}`);
    const isDragTarget = !isGhost && dragLegalTargets.has(`${wrappedFile},${rank}`);
    const isDragOver = !isGhost && dragOverSquare && squaresEqual(square, dragOverSquare);
    const isBeingDragged = !isGhost && draggedSquare && squaresEqual(square, draggedSquare);
    const isLastMove = !isGhost && isLastMoveSquare(square);
    const isInCheck = !isGhost && isKingInCheck(square);
    const canDrag = !isGhost && piece && piece.color === turn;

    return (
      <div
        onClick={() => !isGhost && onSquareClick(square)}
        onDragOver={(e) => !isGhost && handleDragOver(e, square)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => !isGhost && handleDrop(e, square)}
        className={`
          w-full h-full flex items-center justify-center relative
          transition-all duration-150
          ${isLight ? 'bg-amber-100' : 'bg-amber-700'}
          ${isGhost ? 'opacity-40 cursor-default' : 'cursor-pointer hover:brightness-110'}
          ${isSelected ? 'ring-4 ring-inset ring-yellow-400' : ''}
          ${isDragOver ? 'ring-4 ring-inset ring-green-400 brightness-110' : ''}
          ${isInCheck ? 'bg-red-500' : ''}
        `}
      >
        {/* Last move highlight */}
        {isLastMove && !isSelected && !isInCheck && (
          <div
            className={`absolute inset-0 ${
              isLight ? 'bg-yellow-300/40' : 'bg-yellow-500/40'
            }`}
          />
        )}

        {/* Legal move indicator (for click-to-move) */}
        {isLegalTarget && !draggedSquare && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {piece ? (
              <div className="absolute inset-1 rounded-full border-4 border-black/30" />
            ) : (
              <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-black/30" />
            )}
          </div>
        )}

        {/* Drag target indicator */}
        {isDragTarget && draggedSquare && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {piece ? (
              <div className="absolute inset-1 rounded-full border-4 border-green-500/50" />
            ) : (
              <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-green-500/50" />
            )}
          </div>
        )}

        {/* Piece */}
        {piece && (
          <span
            draggable={!!canDrag}
            onDragStart={(e) => handleDragStart(e, square)}
            onDragEnd={handleDragEnd}
            className={`text-2xl sm:text-3xl md:text-4xl select-none relative z-10
              ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}
              ${isBeingDragged ? 'opacity-50' : ''}
              ${piece.color === 'white'
                ? 'text-white [text-shadow:_-1px_-1px_0_#000,_1px_-1px_0_#000,_-1px_1px_0_#000,_1px_1px_0_#000,_0_2px_4px_rgba(0,0,0,0.8)]'
                : 'text-black [text-shadow:_-1px_-1px_0_#666,_1px_-1px_0_#666,_-1px_1px_0_#666,_1px_1px_0_#666]'
            }`}
          >
            {PIECE_SYMBOLS[piece.color][piece.type]}
          </span>
        )}
      </div>
    );
  };

  // Render a single 8x8 board
  const renderBoard = (fileOffset: number, isGhost: boolean, showBorder: boolean) => {
    return (
      <div className={`${showBorder ? 'border-2 border-tertiary/60' : ''}`}>
        <div className="grid grid-cols-8 aspect-square" style={{ width: 'calc(8 * clamp(2.5rem, 4vw, 3.5rem))' }}>
          {Array.from({ length: 64 }, (_, idx) => {
            const displayRank = Math.floor(idx / 8);
            const displayFile = idx % 8;
            const rank = perspective === 'white' ? 7 - displayRank : displayRank;
            const file = perspective === 'white'
              ? displayFile + fileOffset
              : 7 - displayFile + fileOffset;
            return (
              <div key={`${fileOffset}-${idx}`} className="aspect-square">
                {renderSquare(file, rank, isGhost)}
              </div>
            );
          })}
        </div>
        {/* File labels */}
        <div className="grid grid-cols-8" style={{ width: 'calc(8 * clamp(2.5rem, 4vw, 3.5rem))' }}>
          {Array.from({ length: 8 }, (_, i) => {
            const file = perspective === 'white' ? i + fileOffset : 7 - i + fileOffset;
            const wrappedFile = wrapFile(file);
            return (
              <span
                key={i}
                className={`text-center text-xs text-tertiary py-0.5 ${isGhost ? 'opacity-40' : ''}`}
              >
                {FILE_LETTERS[wrappedFile]}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  // Rank labels component
  const renderRankLabels = () => (
    <div className="flex flex-col justify-around pr-2" style={{ height: 'calc(8 * clamp(2.5rem, 4vw, 3.5rem))' }}>
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} className="text-xs text-tertiary flex items-center justify-center">
          {perspective === 'white' ? 8 - i : i + 1}
        </span>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col items-center">
      {/* Three boards side by side with rank labels on far left */}
      <div className="flex items-start">
        {/* Rank labels on the very left */}
        {renderRankLabels()}

        {/* Left ghost board */}
        {renderBoard(-8, true, false)}

        {/* Main board */}
        {renderBoard(0, false, true)}

        {/* Right ghost board */}
        {renderBoard(8, true, false)}
      </div>

      {/* Cylinder wrap indicator */}
      <div className="mt-4 text-tertiary/60 text-sm flex items-center gap-2">
        <span className="text-lg">↺</span>
        <span>Periodic: columns wrap around (a ↔ h)</span>
        <span className="text-lg">↻</span>
      </div>
    </div>
  );
}
