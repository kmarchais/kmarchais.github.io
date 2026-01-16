import { useMemo, useState, useCallback } from 'react';
import type { GameState, Square, Move, RankIndex, Color } from './game/types';
import { FILE_LETTERS } from './game/types';
import { squaresEqual, wrapFile } from './game/board';
import ChessPieceSVG from './ChessPieceSVG';

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
    const isSelected = selectedSquare && squaresEqual(square, selectedSquare);
    const isLegalTarget = legalTargets.has(`${wrappedFile},${rank}`);
    const isDragTarget = dragLegalTargets.has(`${wrappedFile},${rank}`);
    const isDragOver = dragOverSquare && squaresEqual(square, dragOverSquare);
    const isBeingDragged = draggedSquare && squaresEqual(square, draggedSquare);
    const isLastMove = isLastMoveSquare(square);
    const isInCheck = isKingInCheck(square);
    const canDrag = piece && piece.color === turn;

    return (
      <div
        onClick={() => onSquareClick(square)}
        onDragOver={(e) => handleDragOver(e, square)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, square)}
        className={`
          w-full h-full flex items-center justify-center relative
          transition-all duration-150 cursor-pointer
          ${isLight ? 'bg-[#ebecd0]' : 'bg-[#779ab6]'}
          hover:brightness-105
          ${isSelected ? 'ring-4 ring-inset ring-yellow-400' : ''}
          ${isDragOver ? 'ring-4 ring-inset ring-green-400 brightness-110' : ''}
        `}
      >
        {/* Check highlight - red radial glow */}
        {isInCheck && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(255,0,0,0.8) 0%, rgba(200,0,0,0.6) 40%, rgba(150,0,0,0.3) 70%, transparent 100%)',
            }}
          />
        )}

        {/* Last move highlight */}
        {isLastMove && !isSelected && !isInCheck && (
          <div
            className={`absolute inset-0 ${
              isLight ? 'bg-[#cdd26a]/50' : 'bg-[#aaa23a]/50'
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
          <div
            draggable={!!canDrag}
            onDragStart={(e) => handleDragStart(e, square)}
            onDragEnd={handleDragEnd}
            className={`w-[85%] h-[85%] select-none relative z-10
              ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}
              ${isBeingDragged ? 'opacity-50' : ''}
            `}
          >
            <ChessPieceSVG type={piece.type} color={piece.color} className="w-full h-full" />
          </div>
        )}
      </div>
    );
  };

  // Render a single 8x8 board with square cells
  const renderBoard = (fileOffset: number, isGhost: boolean) => {
    return (
      <div>
        <div className="grid grid-cols-8 aspect-square h-full">
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
        <div className="grid grid-cols-8">
          {Array.from({ length: 8 }, (_, i) => {
            const file = perspective === 'white' ? i + fileOffset : 7 - i + fileOffset;
            const wrappedFile = wrapFile(file);
            return (
              <span
                key={i}
                className="text-center text-[10px] text-[#9a9a9a] py-0.5 font-medium"
              >
                {FILE_LETTERS[wrappedFile]}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  // Calculate board height based on available space
  // 3 boards must fit in width (minus panel width ~10rem, gap ~1rem, padding ~1rem)
  // Also constrained by viewport height
  const boardStyle = {
    height: 'min(calc((100vw - 12rem) / 3), calc(100vh - 16rem))',
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Three boards side by side with rank labels on far left */}
      <div className="flex items-stretch" style={boardStyle}>
        {/* Rank labels on the very left */}
        <div className="flex flex-col justify-around pr-1 h-full">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex-1 flex items-center justify-center">
              <span className="text-[10px] text-[#9a9a9a] font-medium">
                {perspective === 'white' ? 8 - i : i + 1}
              </span>
            </div>
          ))}
        </div>

        {/* Left ghost board */}
        {renderBoard(-8, true)}

        {/* Left separator */}
        <div className="w-0.5 self-stretch my-1 border-l-2 border-dashed border-white/40" />

        {/* Main board */}
        {renderBoard(0, false)}

        {/* Right separator */}
        <div className="w-0.5 self-stretch my-1 border-l-2 border-dashed border-white/40" />

        {/* Right ghost board */}
        {renderBoard(8, true)}
      </div>

      {/* Cylinder wrap indicator */}
      <div className="py-2 text-[#7a7a7a] text-sm flex items-center justify-center gap-2">
        <span className="text-lg">↺</span>
        <span>Periodic: columns wrap around (a ↔ h)</span>
        <span className="text-lg">↻</span>
      </div>
    </div>
  );
}
