import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import Navbar from '../../Navbar';
import ChessBoard2D from './ChessBoard2D';
import ChessBoard3D from './ChessBoard3D';
import { createInitialGameState, getPieceAt } from './game/board';
import { getLegalMoves, getAllLegalMoves, makeMove, findMove } from './game/validation';
import { findBestMove, getDepthForDifficulty, type AIDifficulty } from './game/ai';
import type { GameState, Square, Color, PieceType } from './game/types';
import { PIECE_SYMBOLS } from './game/types';

type ViewMode = '2d' | '3d';
type GameMode = 'pvp' | 'ai';

export default function Chess() {
  // Game state
  const [gameState, setGameState] = useState<GameState>(createInitialGameState);
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

  // Get legal moves for selected square
  const legalMoves = useMemo(() => {
    if (!selectedSquare) return [];
    return getLegalMoves(gameState, selectedSquare);
  }, [gameState, selectedSquare]);

  // Get all legal moves for current position (for drag validation)
  const allLegalMoves = useMemo(() => {
    return getAllLegalMoves(gameState, gameState.turn);
  }, [gameState]);

  // Handle AI move
  const makeAiMove = useCallback(async () => {
    if (gameState.isCheckmate || gameState.isStalemate) return;

    setIsAiThinking(true);

    // Use setTimeout to allow UI to update
    await new Promise((resolve) => setTimeout(resolve, 100));

    const depth = getDepthForDifficulty(aiDifficulty);
    const aiMove = findBestMove(gameState, depth);

    if (aiMove) {
      const newState = makeMove(gameState, aiMove);
      if (newState) {
        setGameState(newState);
      }
    }

    setIsAiThinking(false);
  }, [gameState, aiDifficulty]);

  // Trigger AI move when it's AI's turn
  useEffect(() => {
    const gameOver = gameState.isCheckmate || gameState.isDraw || gameState.isResigned;
    if (
      gameMode === 'ai' &&
      gameState.turn !== playerColor &&
      !gameOver &&
      !isAiThinking
    ) {
      const timer = setTimeout(makeAiMove, 500);
      return () => clearTimeout(timer);
    }
  }, [gameState, gameMode, playerColor, isAiThinking, makeAiMove]);

  // Handle move from drag-and-drop
  const handleMove = useCallback(
    (from: Square, to: Square) => {
      const gameOver = gameState.isCheckmate || gameState.isDraw || gameState.isResigned;
      if (isAiThinking || gameOver) return;
      if (gameMode === 'ai' && gameState.turn !== playerColor) return;

      const move = findMove(gameState, from, to);

      if (move) {
        if (move.promotion) {
          setPromotionPending({ from, to });
        } else {
          const newState = makeMove(gameState, move);
          if (newState) {
            setGameState(newState);
            setSelectedSquare(null);
          }
        }
      }
    },
    [gameState, isAiThinking, gameMode, playerColor]
  );

  // Handle square click
  const handleSquareClick = useCallback(
    (square: Square) => {
      const gameOver = gameState.isCheckmate || gameState.isDraw || gameState.isResigned;
      // Don't allow moves during AI thinking or when game is over
      if (isAiThinking || gameOver) {
        return;
      }

      // In AI mode, only allow player's color to move
      if (gameMode === 'ai' && gameState.turn !== playerColor) {
        return;
      }

      const clickedPiece = getPieceAt(gameState.board, square);

      // If no square is selected
      if (!selectedSquare) {
        // Select if it's the current player's piece
        if (clickedPiece?.color === gameState.turn) {
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
      if (clickedPiece?.color === gameState.turn) {
        setSelectedSquare(square);
        return;
      }

      // Try to make a move
      const move = findMove(gameState, selectedSquare, square);

      if (move) {
        // Check if it's a promotion
        if (move.promotion) {
          setPromotionPending({ from: selectedSquare, to: square });
        } else {
          const newState = makeMove(gameState, move);
          if (newState) {
            setGameState(newState);
            setSelectedSquare(null);
          }
        }
      } else {
        // Invalid move, deselect
        setSelectedSquare(null);
      }
    },
    [gameState, selectedSquare, isAiThinking, gameMode, playerColor]
  );

  // Handle promotion choice
  const handlePromotion = useCallback(
    (pieceType: PieceType) => {
      if (!promotionPending) return;

      const move = findMove(
        gameState,
        promotionPending.from,
        promotionPending.to,
        pieceType
      );

      if (move) {
        const newState = makeMove(gameState, move);
        if (newState) {
          setGameState(newState);
        }
      }

      setPromotionPending(null);
      setSelectedSquare(null);
    },
    [gameState, promotionPending]
  );

  // Start new game
  const startNewGame = useCallback(() => {
    setGameState(createInitialGameState());
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
    setGameState((prev) => ({
      ...prev,
      isResigned: true,
      resignedColor: gameMode === 'ai' ? playerColor : prev.turn,
    }));
  }, [gameMode, playerColor]);

  // Check if game is over
  const isGameOver = gameState.isCheckmate || gameState.isDraw || gameState.isResigned;

  // Game status text
  const statusText = useMemo(() => {
    if (gameState.isResigned) {
      const winner = gameState.resignedColor === 'white' ? 'Black' : 'White';
      return `${gameState.resignedColor === 'white' ? 'White' : 'Black'} resigned. ${winner} wins!`;
    }
    if (gameState.isCheckmate) {
      const winner = gameState.turn === 'white' ? 'Black' : 'White';
      return `Checkmate! ${winner} wins!`;
    }
    if (gameState.isDraw) {
      const reasons: Record<string, string> = {
        'stalemate': 'Stalemate',
        'fifty-move': '50-move rule',
        'threefold': 'Threefold repetition',
        'insufficient': 'Insufficient material',
      };
      return `Draw: ${reasons[gameState.drawReason || 'stalemate']}`;
    }
    if (isAiThinking) {
      return 'AI is thinking...';
    }
    if (gameState.isCheck) {
      return `${gameState.turn === 'white' ? 'White' : 'Black'} is in check!`;
    }
    return `${gameState.turn === 'white' ? 'White' : 'Black'} to move`;
  }, [gameState, isAiThinking]);

  return (
    <div className="bg-primary min-h-screen">
      <Navbar />

      {/* Main content */}
      <section className="pt-24 px-4 pb-8">
        <div className="max-w-6xl mx-auto">
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

          {/* Game area */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Board */}
            <div className="flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={viewMode}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={viewMode === '3d' ? 'h-[500px] md:h-[600px]' : ''}
                >
                  {viewMode === '2d' ? (
                    <div className="flex justify-center">
                      <ChessBoard2D
                        gameState={gameState}
                        selectedSquare={selectedSquare}
                        onSquareClick={handleSquareClick}
                        onMove={handleMove}
                        perspective={perspective}
                        legalMoves={legalMoves}
                        allLegalMoves={allLegalMoves}
                      />
                    </div>
                  ) : (
                    <ChessBoard3D
                      gameState={gameState}
                      selectedSquare={selectedSquare}
                      onSquareClick={handleSquareClick}
                      legalMoves={legalMoves}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Controls panel */}
            <div className="w-full lg:w-72 space-y-4">
              {/* Status */}
              <div
                className={`p-4 rounded-lg ${
                  gameState.isCheckmate || gameState.isResigned
                    ? 'bg-green-900/50'
                    : gameState.isDraw
                    ? 'bg-yellow-900/50'
                    : gameState.isCheck
                    ? 'bg-red-900/50'
                    : 'bg-secondary/20'
                }`}
              >
                <p className="text-white font-medium text-center">
                  {statusText}
                </p>
              </div>

              {/* Game controls */}
              <div className="bg-secondary/20 rounded-lg p-4 space-y-4">
                <h3 className="text-white font-semibold">Game Controls</h3>

                <button
                  onClick={startNewGame}
                  className="w-full px-4 py-2 bg-secondary hover:bg-secondary/80 text-white rounded-lg transition-colors"
                >
                  New Game
                </button>

                <button
                  onClick={flipBoard}
                  className="w-full px-4 py-2 bg-secondary/50 hover:bg-secondary/70 text-white rounded-lg transition-colors"
                >
                  Flip Board
                </button>

                {!isGameOver && (
                  <button
                    onClick={handleResign}
                    className="w-full px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors"
                  >
                    Resign
                  </button>
                )}

                {/* Game mode */}
                <div>
                  <label className="text-tertiary text-sm block mb-2">
                    Game Mode
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setGameMode('pvp')}
                      className={`flex-1 px-3 py-1.5 rounded text-sm transition-colors ${
                        gameMode === 'pvp'
                          ? 'bg-secondary text-white'
                          : 'bg-secondary/30 text-tertiary hover:text-white'
                      }`}
                    >
                      2 Players
                    </button>
                    <button
                      onClick={() => setGameMode('ai')}
                      className={`flex-1 px-3 py-1.5 rounded text-sm transition-colors ${
                        gameMode === 'ai'
                          ? 'bg-secondary text-white'
                          : 'bg-secondary/30 text-tertiary hover:text-white'
                      }`}
                    >
                      vs AI
                    </button>
                  </div>
                </div>

                {/* AI settings */}
                {gameMode === 'ai' && (
                  <>
                    <div>
                      <label className="text-tertiary text-sm block mb-2">
                        AI Difficulty
                      </label>
                      <select
                        value={aiDifficulty}
                        onChange={(e) =>
                          setAiDifficulty(e.target.value as AIDifficulty)
                        }
                        className="w-full px-3 py-2 bg-secondary/30 text-white rounded border border-secondary/50 focus:outline-none focus:border-secondary"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-tertiary text-sm block mb-2">
                        Play as
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (playerColor !== 'white') togglePlayerColor();
                          }}
                          className={`flex-1 px-3 py-1.5 rounded text-sm transition-colors ${
                            playerColor === 'white'
                              ? 'bg-white text-black'
                              : 'bg-secondary/30 text-tertiary hover:text-white'
                          }`}
                        >
                          White
                        </button>
                        <button
                          onClick={() => {
                            if (playerColor !== 'black') togglePlayerColor();
                          }}
                          className={`flex-1 px-3 py-1.5 rounded text-sm transition-colors ${
                            playerColor === 'black'
                              ? 'bg-gray-800 text-white'
                              : 'bg-secondary/30 text-tertiary hover:text-white'
                          }`}
                        >
                          Black
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Rules info */}
              <div className="bg-secondary/20 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">Cylinder Rules</h3>
                <ul className="text-tertiary text-sm space-y-1">
                  <li>• Files a and h are adjacent</li>
                  <li>• Pieces can move through the edge</li>
                  <li>• Rook can go h1 → a1 directly</li>
                  <li>• Diagonal moves wrap too</li>
                  <li>• Ranks don't wrap (not a torus)</li>
                </ul>
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
                      className="w-16 h-16 bg-secondary/30 hover:bg-secondary rounded-lg flex items-center justify-center text-4xl transition-colors"
                    >
                      {PIECE_SYMBOLS[gameState.turn][type]}
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
