import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import Navbar from '../../Navbar';
import Breadcrumb from '../../ui/Breadcrumb';
import ChessBoard2D from './ChessBoard2D';
import ChessBoard3D from './ChessBoard3D';
import { createInitialGameState, getPieceAt } from './game/board';
import { getLegalMoves, getAllLegalMoves, makeMove, findMove } from './game/validation';
import { findBestMove, getDepthForDifficulty, type AIDifficulty } from './game/ai';
import type { GameState, Square, Color, PieceType, Move } from './game/types';
import { moveToAlgebraic } from './game/types';
import ChessPieceSVG from './ChessPieceSVG';

type ViewMode = '2d' | '3d';
type GameMode = 'pvp' | 'ai';

interface HistoryEntry {
  state: GameState;
  move: Move | null;
  notation: string;
}

export default function Chess() {
  // Game history - array of states with moves
  const [history, setHistory] = useState<HistoryEntry[]>(() => [{
    state: createInitialGameState(),
    move: null,
    notation: '',
  }]);
  const [viewingIndex, setViewingIndex] = useState(0);

  // Current game state (latest in history)
  const currentState = history[history.length - 1].state;
  // State being viewed (may be historical)
  const viewedState = history[viewingIndex].state;
  const isViewingHistory = viewingIndex < history.length - 1;

  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [promotionPending, setPromotionPending] = useState<{
    from: Square;
    to: Square;
  } | null>(null);

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('2d');
  const [perspective, setPerspective] = useState<Color>('white');
  const [gameMode, setGameMode] = useState<GameMode>('ai');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('medium');
  const [playerColor, setPlayerColor] = useState<Color>('white');
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Ref for auto-scrolling move list
  const moveListRef = useRef<HTMLDivElement>(null);

  // Get legal moves for selected square (only when viewing current position)
  const legalMoves = useMemo(() => {
    if (!selectedSquare || isViewingHistory) return [];
    return getLegalMoves(currentState, selectedSquare);
  }, [currentState, selectedSquare, isViewingHistory]);

  // Get all legal moves for current position (for drag validation)
  const allLegalMoves = useMemo(() => {
    if (isViewingHistory) return [];
    return getAllLegalMoves(currentState, currentState.turn);
  }, [currentState, isViewingHistory]);

  // Add a move to history
  const addMoveToHistory = useCallback((_state: GameState, move: Move, newState: GameState) => {
    const notation = moveToAlgebraic(move, newState.isCheck, newState.isCheckmate);
    setHistory(prev => [...prev, { state: newState, move, notation }]);
    setViewingIndex(prev => prev + 1);
  }, []);

  // Handle AI move
  const makeAiMove = useCallback(async () => {
    if (currentState.isCheckmate || currentState.isStalemate) return;

    setIsAiThinking(true);

    // Use setTimeout to allow UI to update
    await new Promise((resolve) => setTimeout(resolve, 100));

    const depth = getDepthForDifficulty(aiDifficulty);
    const aiMove = findBestMove(currentState, depth);

    if (aiMove) {
      const newState = makeMove(currentState, aiMove);
      if (newState) {
        addMoveToHistory(currentState, aiMove, newState);
      }
    }

    setIsAiThinking(false);
  }, [currentState, aiDifficulty, addMoveToHistory]);

  // Trigger AI move when it's AI's turn
  useEffect(() => {
    const gameOver = currentState.isCheckmate || currentState.isDraw || currentState.isResigned;
    if (
      gameMode === 'ai' &&
      currentState.turn !== playerColor &&
      !gameOver &&
      !isAiThinking &&
      !isViewingHistory
    ) {
      const timer = setTimeout(makeAiMove, 500);
      return () => clearTimeout(timer);
    }
  }, [currentState, gameMode, playerColor, isAiThinking, makeAiMove, isViewingHistory]);

  // Auto-scroll move list when new moves are added
  useEffect(() => {
    if (moveListRef.current) {
      moveListRef.current.scrollTop = moveListRef.current.scrollHeight;
    }
  }, [history.length]);

  // Handle move from drag-and-drop
  const handleMove = useCallback(
    (from: Square, to: Square) => {
      const gameOver = currentState.isCheckmate || currentState.isDraw || currentState.isResigned;
      if (isAiThinking || gameOver || isViewingHistory) return;
      if (gameMode === 'ai' && currentState.turn !== playerColor) return;

      const move = findMove(currentState, from, to);

      if (move) {
        if (move.promotion) {
          setPromotionPending({ from, to });
        } else {
          const newState = makeMove(currentState, move);
          if (newState) {
            addMoveToHistory(currentState, move, newState);
            setSelectedSquare(null);
          }
        }
      }
    },
    [currentState, isAiThinking, gameMode, playerColor, isViewingHistory, addMoveToHistory]
  );

  // Handle square click
  const handleSquareClick = useCallback(
    (square: Square) => {
      const gameOver = currentState.isCheckmate || currentState.isDraw || currentState.isResigned;
      // Don't allow moves during AI thinking, when game is over, or when viewing history
      if (isAiThinking || gameOver || isViewingHistory) {
        return;
      }

      // In AI mode, only allow player's color to move
      if (gameMode === 'ai' && currentState.turn !== playerColor) {
        return;
      }

      const clickedPiece = getPieceAt(currentState.board, square);

      // If no square is selected
      if (!selectedSquare) {
        // Select if it's the current player's piece
        if (clickedPiece?.color === currentState.turn) {
          setSelectedSquare(square);
        }
        return;
      }

      // If clicking the same square, deselect
      if (
        selectedSquare.file === square.file &&
        selectedSquare.rank === square.rank
      ) {
        setSelectedSquare(null);
        return;
      }

      // If clicking another piece of same color, select it instead
      if (clickedPiece?.color === currentState.turn) {
        setSelectedSquare(square);
        return;
      }

      // Try to make a move
      const move = findMove(currentState, selectedSquare, square);

      if (move) {
        // Check if it's a promotion
        if (move.promotion) {
          setPromotionPending({ from: selectedSquare, to: square });
        } else {
          const newState = makeMove(currentState, move);
          if (newState) {
            addMoveToHistory(currentState, move, newState);
            setSelectedSquare(null);
          }
        }
      } else {
        // Invalid move, deselect
        setSelectedSquare(null);
      }
    },
    [currentState, selectedSquare, isAiThinking, gameMode, playerColor, isViewingHistory, addMoveToHistory]
  );

  // Handle promotion choice
  const handlePromotion = useCallback(
    (pieceType: PieceType) => {
      if (!promotionPending) return;

      const move = findMove(
        currentState,
        promotionPending.from,
        promotionPending.to,
        pieceType
      );

      if (move) {
        const newState = makeMove(currentState, move);
        if (newState) {
          addMoveToHistory(currentState, move, newState);
        }
      }

      setPromotionPending(null);
      setSelectedSquare(null);
    },
    [currentState, promotionPending, addMoveToHistory]
  );

  // Start new game
  const startNewGame = useCallback(() => {
    const initialState = createInitialGameState();
    setHistory([{ state: initialState, move: null, notation: '' }]);
    setViewingIndex(0);
    setSelectedSquare(null);
    setPromotionPending(null);
    setIsAiThinking(false);
  }, []);

  // Flip board
  const flipBoard = useCallback(() => {
    setPerspective((p) => (p === 'white' ? 'black' : 'white'));
  }, []);

  // Toggle player color (for AI mode)
  const togglePlayerColor = useCallback(() => {
    setPlayerColor((c) => (c === 'white' ? 'black' : 'white'));
    startNewGame();
  }, [startNewGame]);

  // Resign function
  const handleResign = useCallback(() => {
    const resignedState: GameState = {
      ...currentState,
      isResigned: true,
      resignedColor: gameMode === 'ai' ? playerColor : currentState.turn,
    };
    setHistory(prev => {
      const newHistory = [...prev];
      newHistory[newHistory.length - 1] = {
        ...newHistory[newHistory.length - 1],
        state: resignedState,
      };
      return newHistory;
    });
  }, [gameMode, playerColor, currentState]);

  // History navigation
  const goToStart = useCallback(() => setViewingIndex(0), []);
  const goToEnd = useCallback(() => setViewingIndex(history.length - 1), [history.length]);
  const goBack = useCallback(() => setViewingIndex(i => Math.max(0, i - 1)), []);
  const goForward = useCallback(() => setViewingIndex(i => Math.min(history.length - 1, i + 1)), [history.length]);
  const goToMove = useCallback((index: number) => setViewingIndex(index), []);

  // Check if game is over
  const isGameOver = currentState.isCheckmate || currentState.isDraw || currentState.isResigned;

  // Game status text
  const statusText = useMemo(() => {
    if (isViewingHistory) {
      return `Viewing move ${viewingIndex} of ${history.length - 1}`;
    }
    if (currentState.isResigned) {
      const winner = currentState.resignedColor === 'white' ? 'Black' : 'White';
      return `${currentState.resignedColor === 'white' ? 'White' : 'Black'} resigned. ${winner} wins!`;
    }
    if (currentState.isCheckmate) {
      const winner = currentState.turn === 'white' ? 'Black' : 'White';
      return `Checkmate! ${winner} wins!`;
    }
    if (currentState.isDraw) {
      const reasons: Record<string, string> = {
        'stalemate': 'Stalemate',
        'fifty-move': '50-move rule',
        'threefold': 'Threefold repetition',
        'insufficient': 'Insufficient material',
      };
      return `Draw: ${reasons[currentState.drawReason || 'stalemate']}`;
    }
    if (isAiThinking) {
      return 'AI is thinking...';
    }
    if (currentState.isCheck) {
      return `${currentState.turn === 'white' ? 'White' : 'Black'} is in check!`;
    }
    return `${currentState.turn === 'white' ? 'White' : 'Black'} to move`;
  }, [currentState, isAiThinking, isViewingHistory, viewingIndex, history.length]);

  // Generate move list pairs (white move, black move)
  const movePairs = useMemo(() => {
    const pairs: { moveNum: number; white: { notation: string; index: number } | null; black: { notation: string; index: number } | null }[] = [];
    for (let i = 1; i < history.length; i++) {
      const moveNum = Math.ceil(i / 2);
      if (i % 2 === 1) {
        // White's move
        pairs.push({
          moveNum,
          white: { notation: history[i].notation, index: i },
          black: null,
        });
      } else {
        // Black's move
        pairs[pairs.length - 1].black = { notation: history[i].notation, index: i };
      }
    }
    return pairs;
  }, [history]);

  return (
    <div className="bg-primary min-h-screen">
      <Navbar />
      <div className="pt-16">
        <Breadcrumb items={[
          { label: 'Home', path: '/' },
          { label: 'Chess' },
        ]} />
      </div>

      {/* Main content */}
      <section className="pt-4 px-2 pb-4 h-[calc(100vh-7rem)] flex flex-col">
        <div className="w-full flex-1 flex flex-col">
          {/* Title and controls */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                Periodic Chess
              </h1>
              <p className="text-tertiary/70 text-sm mt-1">
                Cylinder variant - files a and h are adjacent
              </p>
            </div>

            {/* View toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('2d')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === '2d'
                    ? 'bg-secondary text-white'
                    : 'text-tertiary hover:text-white hover:bg-secondary/30'
                }`}
              >
                2D View
              </button>
              <button
                onClick={() => setViewMode('3d')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === '3d'
                    ? 'bg-secondary text-white'
                    : 'text-tertiary hover:text-white hover:bg-secondary/30'
                }`}
              >
                3D View
              </button>
            </div>
          </div>

          {/* Top controls bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            {/* Status */}
            <div
              className={`px-4 py-2 rounded-lg ${
                currentState.isCheckmate || currentState.isResigned
                  ? 'bg-green-900/50'
                  : currentState.isDraw
                  ? 'bg-yellow-900/50'
                  : currentState.isCheck || isViewingHistory
                  ? 'bg-red-900/50'
                  : 'bg-secondary/20'
              }`}
            >
              <p className="text-white font-medium">{statusText}</p>
            </div>

            {/* Game mode & AI settings */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Mode toggle */}
              <div className="flex gap-1 bg-secondary/20 rounded-lg p-1">
                <button
                  onClick={() => setGameMode('pvp')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    gameMode === 'pvp'
                      ? 'bg-secondary text-white'
                      : 'text-tertiary hover:text-white'
                  }`}
                >
                  2 Players
                </button>
                <button
                  onClick={() => setGameMode('ai')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    gameMode === 'ai'
                      ? 'bg-secondary text-white'
                      : 'text-tertiary hover:text-white'
                  }`}
                >
                  vs AI
                </button>
              </div>

              {/* AI settings */}
              {gameMode === 'ai' && (
                <>
                  <select
                    value={aiDifficulty}
                    onChange={(e) => setAiDifficulty(e.target.value as AIDifficulty)}
                    className="px-3 py-1.5 bg-secondary/30 text-white text-sm rounded border border-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-primary"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>

                  <div className="flex gap-1 bg-secondary/20 rounded-lg p-1">
                    <button
                      onClick={() => { if (playerColor !== 'white') togglePlayerColor(); }}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        playerColor === 'white' ? 'bg-white text-black' : 'text-tertiary hover:text-white'
                      }`}
                    >
                      White
                    </button>
                    <button
                      onClick={() => { if (playerColor !== 'black') togglePlayerColor(); }}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        playerColor === 'black' ? 'bg-gray-700 text-white' : 'text-tertiary hover:text-white'
                      }`}
                    >
                      Black
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={startNewGame}
                className="px-4 py-1.5 bg-secondary hover:bg-secondary/80 text-white text-sm rounded-lg transition-colors"
              >
                New Game
              </button>
              <button
                onClick={flipBoard}
                className="px-4 py-1.5 bg-secondary/50 hover:bg-secondary/70 text-white text-sm rounded-lg transition-colors"
              >
                Flip Board
              </button>
              {!isGameOver && (
                <button
                  onClick={handleResign}
                  className="px-4 py-1.5 bg-red-700 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                >
                  Resign
                </button>
              )}
            </div>
          </div>

          {/* Board and move list container */}
          <div className="w-full flex-1 min-h-0 flex gap-4">
            {/* Board */}
            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={viewMode}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className={`h-full ${viewMode === '3d' ? '' : ''}`}
                >
                  {viewMode === '2d' ? (
                    <ChessBoard2D
                      gameState={viewedState}
                      selectedSquare={isViewingHistory ? null : selectedSquare}
                      onSquareClick={handleSquareClick}
                      onMove={handleMove}
                      perspective={perspective}
                      legalMoves={legalMoves}
                      allLegalMoves={allLegalMoves}
                    />
                  ) : (
                    <ChessBoard3D
                      gameState={viewedState}
                      selectedSquare={isViewingHistory ? null : selectedSquare}
                      onSquareClick={handleSquareClick}
                      legalMoves={legalMoves}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Move list panel */}
            <div className="w-36 shrink-0 flex flex-col bg-secondary/20 rounded-lg">
              {/* Navigation controls */}
              <div className="flex justify-center gap-0.5 p-1.5 border-b border-secondary/30">
                <button
                  onClick={goToStart}
                  disabled={viewingIndex === 0}
                  className="px-1.5 py-0.5 text-white hover:bg-secondary/50 rounded disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                  title="Go to start"
                >
                  ⏮
                </button>
                <button
                  onClick={goBack}
                  disabled={viewingIndex === 0}
                  className="px-1.5 py-0.5 text-white hover:bg-secondary/50 rounded disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                  title="Previous move"
                >
                  ◀
                </button>
                <button
                  onClick={goForward}
                  disabled={viewingIndex >= history.length - 1}
                  className="px-1.5 py-0.5 text-white hover:bg-secondary/50 rounded disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                  title="Next move"
                >
                  ▶
                </button>
                <button
                  onClick={goToEnd}
                  disabled={viewingIndex >= history.length - 1}
                  className="px-1.5 py-0.5 text-white hover:bg-secondary/50 rounded disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                  title="Go to latest"
                >
                  ⏭
                </button>
              </div>

              {/* Move list */}
              <div
                ref={moveListRef}
                className="flex-1 overflow-y-auto p-1.5 text-xs font-mono"
              >
                {movePairs.length === 0 ? (
                  <p className="text-tertiary/50 text-center py-4 text-[10px]">No moves</p>
                ) : (
                  movePairs.map((pair) => (
                    <div key={pair.moveNum} className="flex items-center mb-0.5">
                      <span className="text-tertiary/50 w-4 text-right shrink-0 text-[10px]">{pair.moveNum}.</span>
                      {pair.white ? (
                        <button
                          onClick={() => goToMove(pair.white!.index)}
                          className={`flex-1 text-left px-0.5 mx-0.5 rounded hover:bg-secondary/50 truncate text-[11px] ${
                            viewingIndex === pair.white.index ? 'bg-secondary text-white' : 'text-white'
                          }`}
                        >
                          {pair.white.notation}
                        </button>
                      ) : (
                        <span className="flex-1 mx-0.5" />
                      )}
                      {pair.black ? (
                        <button
                          onClick={() => goToMove(pair.black!.index)}
                          className={`flex-1 text-left px-0.5 rounded hover:bg-secondary/50 truncate text-[11px] ${
                            viewingIndex === pair.black.index ? 'bg-secondary text-white' : 'text-white'
                          }`}
                        >
                          {pair.black.notation}
                        </button>
                      ) : (
                        <span className="flex-1" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Promotion dialog */}
      <AnimatePresence>
        {promotionPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={() => setPromotionPending(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-primary border border-secondary rounded-lg p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-white text-lg font-semibold mb-4 text-center">
                Promote pawn to:
              </h3>
              <div className="flex gap-4">
                {(['queen', 'rook', 'bishop', 'knight'] as PieceType[]).map(
                  (type) => (
                    <button
                      key={type}
                      onClick={() => handlePromotion(type)}
                      className="w-16 h-16 bg-secondary/30 hover:bg-secondary rounded-lg flex items-center justify-center p-2 transition-colors"
                    >
                      <ChessPieceSVG type={type} color={currentState.turn} className="w-full h-full" />
                    </button>
                  )
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
