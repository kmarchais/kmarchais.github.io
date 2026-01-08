import { useRef, useMemo, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import * as THREE from 'three';
import type { PieceType, Color } from './game/types';

interface ChessPiece3DProps {
  type: PieceType;
  color: Color;
  position: [number, number, number];
  outwardAngle?: number; // Angle around cylinder (radians)
  isSelected?: boolean;
  onClick?: () => void;
}

// Simplified 3D chess pieces using basic geometries
export default function ChessPiece3D({
  type,
  color,
  position,
  outwardAngle = 0,
  isSelected = false,
  onClick,
}: ChessPiece3DProps) {
  const groupRef = useRef<Group>(null);

  // Outward direction for this piece (radial from cylinder center)
  const outwardDir = useMemo(() => {
    return new THREE.Vector3(
      Math.sin(outwardAngle),
      0,
      Math.cos(outwardAngle)
    );
  }, [outwardAngle]);

  // Apply rotation to make piece point radially outward
  useLayoutEffect(() => {
    if (groupRef.current) {
      // Piece's original up direction
      const upDir = new THREE.Vector3(0, 1, 0);
      // Quaternion that rotates from up to outward
      const quat = new THREE.Quaternion();
      quat.setFromUnitVectors(upDir, outwardDir);
      groupRef.current.quaternion.copy(quat);
    }
  }, [outwardDir]);

  // Animate selected piece (bob up and down along the outward direction)
  useFrame((state) => {
    if (groupRef.current && isSelected) {
      const offset = Math.sin(state.clock.elapsedTime * 3) * 0.05 + 0.1;
      groupRef.current.position.set(
        position[0] + outwardDir.x * offset,
        position[1] + outwardDir.y * offset,
        position[2] + outwardDir.z * offset
      );
    } else if (groupRef.current) {
      groupRef.current.position.set(position[0], position[1], position[2]);
    }
  });

  const pieceColor = color === 'white' ? '#ffffff' : '#111111';
  const emissiveColor = isSelected ? '#ffff00' : '#000000';
  const emissiveIntensity = isSelected ? 0.3 : 0;

  // Base material props
  const materialProps = {
    color: pieceColor,
    emissive: emissiveColor,
    emissiveIntensity,
    metalness: 0.3,
    roughness: 0.7,
  };

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      {/* Render piece based on type */}
      {type === 'pawn' && <Pawn materialProps={materialProps} />}
      {type === 'rook' && <Rook materialProps={materialProps} />}
      {type === 'knight' && <Knight materialProps={materialProps} />}
      {type === 'bishop' && <Bishop materialProps={materialProps} />}
      {type === 'queen' && <Queen materialProps={materialProps} />}
      {type === 'king' && <King materialProps={materialProps} />}
    </group>
  );
}

interface PieceGeometryProps {
  materialProps: {
    color: string;
    emissive: string;
    emissiveIntensity: number;
    metalness: number;
    roughness: number;
  };
}

// Pawn - simple cylinder with sphere top
function Pawn({ materialProps }: PieceGeometryProps) {
  return (
    <group>
      {/* Base */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.15, 0.18, 0.1, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      {/* Body */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 0.25, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.4, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
    </group>
  );
}

// Rook - castle tower shape
function Rook({ materialProps }: PieceGeometryProps) {
  return (
    <group>
      {/* Base */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.18, 0.2, 0.1, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      {/* Body */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 0.35, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      {/* Top platform */}
      <mesh position={[0, 0.47, 0]}>
        <cylinderGeometry args={[0.15, 0.12, 0.08, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      {/* Battlements */}
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          position={[
            Math.cos((i * Math.PI) / 2) * 0.1,
            0.55,
            Math.sin((i * Math.PI) / 2) * 0.1,
          ]}
        >
          <boxGeometry args={[0.06, 0.08, 0.06]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      ))}
    </group>
  );
}

// Knight - abstract horse head
function Knight({ materialProps }: PieceGeometryProps) {
  return (
    <group>
      {/* Base */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.17, 0.19, 0.1, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      {/* Body */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.1, 0.14, 0.2, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      {/* Neck */}
      <mesh position={[0, 0.38, 0.03]} rotation={[-0.3, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.2, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.5, 0.08]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[0.1, 0.15, 0.18]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      {/* Ears */}
      <mesh position={[0.04, 0.58, 0.02]} rotation={[0, 0, 0.3]}>
        <coneGeometry args={[0.03, 0.08, 4]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      <mesh position={[-0.04, 0.58, 0.02]} rotation={[0, 0, -0.3]}>
        <coneGeometry args={[0.03, 0.08, 4]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
    </group>
  );
}

// Bishop - tall piece with diagonal cut top
function Bishop({ materialProps }: PieceGeometryProps) {
  return (
    <group>
      {/* Base */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.17, 0.19, 0.1, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      {/* Body */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.08, 0.14, 0.35, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      {/* Top point */}
      <mesh position={[0, 0.62, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      {/* Slit (decorative) */}
      <mesh position={[0, 0.52, 0.08]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.02, 0.1, 0.04]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </group>
  );
}

// Queen - tall with crown
function Queen({ materialProps }: PieceGeometryProps) {
  return (
    <group>
      {/* Base */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.18, 0.2, 0.1, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      {/* Body */}
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.08, 0.15, 0.4, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      {/* Collar */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.12, 0.08, 0.06, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      {/* Crown base */}
      <mesh position={[0, 0.57, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.08, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      {/* Crown points */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh
          key={i}
          position={[
            Math.cos((i * Math.PI) / 3) * 0.08,
            0.68,
            Math.sin((i * Math.PI) / 3) * 0.08,
          ]}
        >
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      ))}
      {/* Top ball */}
      <mesh position={[0, 0.68, 0]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
    </group>
  );
}

// King - tallest piece with cross
function King({ materialProps }: PieceGeometryProps) {
  return (
    <group>
      {/* Base */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.18, 0.2, 0.1, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      {/* Body */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.09, 0.15, 0.45, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      {/* Collar */}
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.12, 0.09, 0.06, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      {/* Crown base */}
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.08, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      {/* Cross vertical */}
      <mesh position={[0, 0.76, 0]}>
        <boxGeometry args={[0.04, 0.16, 0.04]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      {/* Cross horizontal */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[0.12, 0.04, 0.04]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
    </group>
  );
}
