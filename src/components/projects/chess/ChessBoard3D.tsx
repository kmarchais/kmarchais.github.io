import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import type { Group, Mesh } from 'three';
import * as THREE from 'three';

import type { GameState, Square, Move, FileIndex, RankIndex } from './game/types';
import { FILE_LETTERS } from './game/types';
import { squaresEqual } from './game/board';
import ChessPiece3D from './ChessPiece3D';

interface ChessBoard3DProps {
  gameState: GameState;
  selectedSquare: Square | null;
  onSquareClick: (square: Square) => void;
  legalMoves: Move[];
}

// Board parameters - calculated for square cells
// For squares: arc_length = height, so (2π/8)*R = H/8, meaning R = H/(2π)
// Or equivalently: H = 2πR
const CYLINDER_RADIUS = 1.2;
const CYLINDER_HEIGHT = 2 * Math.PI * CYLINDER_RADIUS; // Makes cells square
const SQUARE_HEIGHT = CYLINDER_HEIGHT / 8;

// Convert file/rank to 3D position on cylinder
function squareToPosition(
  file: number,
  rank: number
): [number, number, number] {
  // Angle for file (0-7 maps to 0-2PI)
  const angle = (file / 8) * Math.PI * 2;

  // Height for rank (0-7 maps to bottom to top)
  const y = (rank - 3.5) * SQUARE_HEIGHT;

  // Position on cylinder surface (with small offset for pieces)
  const x = Math.sin(angle) * CYLINDER_RADIUS;
  const z = Math.cos(angle) * CYLINDER_RADIUS;

  return [x, y, z];
}

// Create a curved square mesh for the cylinder surface
function CylinderSquare({
  file,
  rank,
  isLight,
  isSelected,
  isLegalTarget,
  isLastMove,
  isCheck,
  onClick,
}: {
  file: number;
  rank: number;
  isLight: boolean;
  isSelected: boolean;
  isLegalTarget: boolean;
  isLastMove: boolean;
  isCheck: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<Mesh>(null);

  // Create curved geometry for this square
  const geometry = useMemo(() => {
    const startAngle = (file / 8) * Math.PI * 2;
    const endAngle = ((file + 1) / 8) * Math.PI * 2;
    const segments = 8;

    const geo = new THREE.CylinderGeometry(
      CYLINDER_RADIUS,
      CYLINDER_RADIUS,
      SQUARE_HEIGHT,
      segments,
      1,
      true,
      startAngle,
      endAngle - startAngle
    );

    return geo;
  }, [file]);

  // Determine color
  let color = isLight ? '#e8d4a8' : '#b58863';
  if (isCheck) {
    color = '#ff4444';
  } else if (isSelected) {
    color = '#ffff44';
  } else if (isLastMove) {
    color = isLight ? '#f0e68c' : '#daa520';
  }

  const y = (rank - 3.5) * SQUARE_HEIGHT;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={[0, y, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <meshStandardMaterial
        color={color}
        side={THREE.DoubleSide}
        transparent={isLegalTarget}
        opacity={isLegalTarget ? 0.8 : 1}
      />

      {/* Legal move indicator */}
      {isLegalTarget && (
        <mesh position={squareToPosition(file + 0.5, rank)}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial
            color="#00aa00"
            transparent
            opacity={0.7}
          />
        </mesh>
      )}
    </mesh>
  );
}

// The 3D scene content
function ChessScene({
  gameState,
  selectedSquare,
  onSquareClick,
  legalMoves,
}: ChessBoard3DProps) {
  const groupRef = useRef<Group>(null);
  const { board, lastMove, isCheck, turn } = gameState;

  // Slowly rotate the board
  useFrame((state) => {
    if (groupRef.current) {
      // Subtle idle rotation
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    }
  });

  // Get target squares from legal moves
  const legalTargets = useMemo(() => {
    return new Set(legalMoves.map((m) => `${m.to.file},${m.to.rank}`));
  }, [legalMoves]);

  // Check if square is part of last move
  const isLastMoveSquare = (square: Square): boolean => {
    if (!lastMove) return false;
    return squaresEqual(square, lastMove.from) || squaresEqual(square, lastMove.to);
  };

  // Check if square has king in check
  const isKingInCheck = (square: Square): boolean => {
    const piece = board[square.rank][square.file];
    return isCheck && piece?.type === 'king' && piece.color === turn;
  };

  return (
    <group ref={groupRef}>
      {/* Ambient light */}
      <ambientLight intensity={0.5} />

      {/* Main light */}
      <directionalLight
        position={[5, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Fill light */}
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />

      {/* Board squares */}
      {Array.from({ length: 8 }, (_, rank) =>
        Array.from({ length: 8 }, (_, file) => {
          const square: Square = {
            file: file as FileIndex,
            rank: rank as RankIndex,
          };
          const isLight = (file + rank) % 2 === 1;
          const isSelected =
            selectedSquare && squaresEqual(square, selectedSquare);
          const isLegalTarget = legalTargets.has(`${file},${rank}`);
          const isLastMove = isLastMoveSquare(square);
          const isInCheck = isKingInCheck(square);

          return (
            <CylinderSquare
              key={`${file}-${rank}`}
              file={file}
              rank={rank}
              isLight={isLight}
              isSelected={!!isSelected}
              isLegalTarget={isLegalTarget}
              isLastMove={isLastMove}
              isCheck={isInCheck}
              onClick={() => onSquareClick(square)}
            />
          );
        })
      )}

      {/* Pieces - 3D pieces standing radially outward (normal to cylinder surface) */}
      {Array.from({ length: 8 }, (_, rank) =>
        Array.from({ length: 8 }, (_, file) => {
          const piece = board[rank][file];
          if (!piece) return null;

          const square: Square = {
            file: file as FileIndex,
            rank: rank as RankIndex,
          };
          const isSelected =
            selectedSquare && squaresEqual(square, selectedSquare);

          // Position piece on the cylinder surface
          const angle = ((file + 0.5) / 8) * Math.PI * 2;
          const y = (rank - 3.5) * SQUARE_HEIGHT;
          const radius = CYLINDER_RADIUS + 0.02;
          const x = Math.sin(angle) * radius;
          const z = Math.cos(angle) * radius;

          return (
            <ChessPiece3D
              key={`piece-${file}-${rank}`}
              type={piece.type}
              color={piece.color}
              position={[x, y, z]}
              outwardAngle={angle}
              isSelected={!!isSelected}
              onClick={() => onSquareClick(square)}
            />
          );
        })
      )}

      {/* File labels around the cylinder */}
      {FILE_LETTERS.map((letter, i) => {
        const angle = ((i + 0.5) / 8) * Math.PI * 2;
        const radius = CYLINDER_RADIUS + 0.5;
        const x = Math.sin(angle) * radius;
        const z = Math.cos(angle) * radius;

        return (
          <Text
            key={`file-${letter}`}
            position={[x, -CYLINDER_HEIGHT / 2 - 0.3, z]}
            rotation={[0, -angle + Math.PI, 0]}
            fontSize={0.2}
            color="#888888"
            anchorX="center"
            anchorY="middle"
          >
            {letter}
          </Text>
        );
      })}

      {/* Rank labels */}
      {Array.from({ length: 8 }, (_, i) => (
        <Text
          key={`rank-${i}`}
          position={[CYLINDER_RADIUS + 0.5, (i - 3.5) * SQUARE_HEIGHT, 0]}
          fontSize={0.2}
          color="#888888"
          anchorX="center"
          anchorY="middle"
        >
          {i + 1}
        </Text>
      ))}
    </group>
  );
}

export default function ChessBoard3D(props: ChessBoard3DProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 50 }}
      shadows
      className="w-full h-full"
    >
      <color attach="background" args={['#1a1a2e']} />
      <fog attach="fog" args={['#1a1a2e', 12, 25]} />

      <ChessScene {...props} />

      <OrbitControls
        enablePan={false}
        minDistance={5}
        maxDistance={15}
        minPolarAngle={0}
        maxPolarAngle={Math.PI}
      />
    </Canvas>
  );
}
