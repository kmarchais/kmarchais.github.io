/**
 * Spatial Hash Tests
 *
 * Tests for cell assignment, neighbor finding completeness,
 * and parameter buffer creation.
 */

import { describe, it, expect } from 'vitest';
import {
  SPATIAL_HASH_PARAMS_SIZE,
  SPATIAL_HASH_WORKGROUP_SIZE,
  createSpatialHashParamsBuffer,
} from '../../src/shaders/simulations/common/spatialHash';

/**
 * Reference implementation of position to cell conversion
 * Mirrors the WGSL shader logic
 */
function positionToCell(
  pos: [number, number, number],
  gridMin: [number, number, number],
  cellSize: number,
  gridDims: [number, number, number]
): [number, number, number] {
  const localPos = [
    pos[0] - gridMin[0],
    pos[1] - gridMin[1],
    pos[2] - gridMin[2],
  ];

  const cellCoord: [number, number, number] = [
    Math.floor(localPos[0] / cellSize),
    Math.floor(localPos[1] / cellSize),
    Math.floor(localPos[2] / cellSize),
  ];

  // Clamp to grid bounds
  return [
    Math.max(0, Math.min(gridDims[0] - 1, cellCoord[0])),
    Math.max(0, Math.min(gridDims[1] - 1, cellCoord[1])),
    Math.max(0, Math.min(gridDims[2] - 1, cellCoord[2])),
  ];
}

/**
 * Reference implementation of cell to linear index
 */
function cellToIndex(
  cell: [number, number, number],
  gridDims: [number, number, number]
): number {
  return cell[0] + cell[1] * gridDims[0] + cell[2] * gridDims[0] * gridDims[1];
}

/**
 * Reference implementation of getting neighbor cells
 */
function getNeighborCells(
  centerCell: [number, number, number],
  gridDims: [number, number, number]
): number[] {
  const neighbors: number[] = [];

  for (let dz = -1; dz <= 1; dz++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = centerCell[0] + dx;
        const ny = centerCell[1] + dy;
        const nz = centerCell[2] + dz;

        if (
          nx >= 0 &&
          nx < gridDims[0] &&
          ny >= 0 &&
          ny < gridDims[1] &&
          nz >= 0 &&
          nz < gridDims[2]
        ) {
          neighbors.push(cellToIndex([nx, ny, nz], gridDims));
        }
      }
    }
  }

  return neighbors;
}

/**
 * Check if two particles are within interaction distance
 */
function particlesInRange(
  pos1: [number, number, number],
  pos2: [number, number, number],
  radius: number
): boolean {
  const dx = pos1[0] - pos2[0];
  const dy = pos1[1] - pos2[1];
  const dz = pos1[2] - pos2[2];
  return dx * dx + dy * dy + dz * dz <= radius * radius;
}

describe('Spatial Hash', () => {
  describe('Constants', () => {
    it('should have correct workgroup size', () => {
      expect(SPATIAL_HASH_WORKGROUP_SIZE).toBe(256);
    });

    it('should have correct params size', () => {
      expect(SPATIAL_HASH_PARAMS_SIZE).toBe(32);
    });
  });

  describe('createSpatialHashParamsBuffer', () => {
    it('should create buffer with correct size', () => {
      const buffer = createSpatialHashParamsBuffer(
        1000,
        [16, 16, 16],
        1.0,
        [-8, -8, -8]
      );
      expect(buffer.byteLength).toBe(SPATIAL_HASH_PARAMS_SIZE);
    });

    it('should pack parameters correctly', () => {
      const particleCount = 1234;
      const gridDims: [number, number, number] = [16, 32, 8];
      const cellSize = 0.5;
      const gridMin: [number, number, number] = [-8, -16, -4];

      const buffer = createSpatialHashParamsBuffer(
        particleCount,
        gridDims,
        cellSize,
        gridMin
      );

      const u32View = new Uint32Array(buffer);
      const f32View = new Float32Array(buffer);

      expect(u32View[0]).toBe(particleCount);
      expect(u32View[1]).toBe(gridDims[0]);
      expect(u32View[2]).toBe(gridDims[1]);
      expect(u32View[3]).toBe(gridDims[2]);
      expect(f32View[4]).toBeCloseTo(cellSize, 5);
      expect(f32View[5]).toBeCloseTo(gridMin[0], 5);
      expect(f32View[6]).toBeCloseTo(gridMin[1], 5);
      expect(f32View[7]).toBeCloseTo(gridMin[2], 5);
    });

    it('should handle various grid dimensions', () => {
      // Small grid
      const small = createSpatialHashParamsBuffer(100, [4, 4, 4], 2.0, [0, 0, 0]);
      const smallView = new Uint32Array(small);
      expect(smallView[1]).toBe(4);
      expect(smallView[2]).toBe(4);
      expect(smallView[3]).toBe(4);

      // Large grid
      const large = createSpatialHashParamsBuffer(10000, [64, 64, 64], 0.25, [-8, -8, -8]);
      const largeView = new Uint32Array(large);
      expect(largeView[1]).toBe(64);
      expect(largeView[2]).toBe(64);
      expect(largeView[3]).toBe(64);

      // Non-uniform grid
      const nonUniform = createSpatialHashParamsBuffer(500, [32, 8, 16], 1.0, [0, 0, 0]);
      const nonUniformView = new Uint32Array(nonUniform);
      expect(nonUniformView[1]).toBe(32);
      expect(nonUniformView[2]).toBe(8);
      expect(nonUniformView[3]).toBe(16);
    });
  });

  describe('Cell Assignment (positionToCell)', () => {
    const gridMin: [number, number, number] = [-8, -8, -8];
    const cellSize = 1.0;
    const gridDims: [number, number, number] = [16, 16, 16];

    it('should assign particles at grid minimum to cell (0,0,0)', () => {
      const pos: [number, number, number] = [-8, -8, -8];
      const cell = positionToCell(pos, gridMin, cellSize, gridDims);
      expect(cell).toEqual([0, 0, 0]);
    });

    it('should assign particles at grid maximum to last cell', () => {
      const pos: [number, number, number] = [7.9, 7.9, 7.9];
      const cell = positionToCell(pos, gridMin, cellSize, gridDims);
      expect(cell).toEqual([15, 15, 15]);
    });

    it('should clamp positions outside grid', () => {
      // Below minimum
      const posBelow: [number, number, number] = [-100, -100, -100];
      expect(positionToCell(posBelow, gridMin, cellSize, gridDims)).toEqual([0, 0, 0]);

      // Above maximum
      const posAbove: [number, number, number] = [100, 100, 100];
      expect(positionToCell(posAbove, gridMin, cellSize, gridDims)).toEqual([15, 15, 15]);
    });

    it('should correctly assign positions at cell boundaries', () => {
      // Exactly at cell boundary (should go to next cell)
      const pos: [number, number, number] = [-7, -8, -8]; // 1 unit from gridMin.x
      const cell = positionToCell(pos, gridMin, cellSize, gridDims);
      expect(cell[0]).toBe(1);
    });

    it('should handle different cell sizes', () => {
      const largeCellSize = 2.0;
      const pos: [number, number, number] = [-6, -8, -8]; // 2 units from gridMin.x
      const cell = positionToCell(pos, gridMin, largeCellSize, gridDims);
      expect(cell[0]).toBe(1); // 2 units / 2.0 cellSize = 1

      const smallCellSize = 0.5;
      const pos2: [number, number, number] = [-7.5, -8, -8]; // 0.5 units from gridMin.x
      const cell2 = positionToCell(pos2, gridMin, smallCellSize, gridDims);
      expect(cell2[0]).toBe(1); // 0.5 units / 0.5 cellSize = 1
    });
  });

  describe('Cell Indexing (cellToIndex)', () => {
    it('should return 0 for cell (0,0,0)', () => {
      const gridDims: [number, number, number] = [16, 16, 16];
      expect(cellToIndex([0, 0, 0], gridDims)).toBe(0);
    });

    it('should correctly compute linear index', () => {
      const gridDims: [number, number, number] = [4, 4, 4];

      // Cell (1, 0, 0) = 1
      expect(cellToIndex([1, 0, 0], gridDims)).toBe(1);

      // Cell (0, 1, 0) = 4 (gridDimX)
      expect(cellToIndex([0, 1, 0], gridDims)).toBe(4);

      // Cell (0, 0, 1) = 16 (gridDimX * gridDimY)
      expect(cellToIndex([0, 0, 1], gridDims)).toBe(16);

      // Cell (1, 2, 3) = 1 + 2*4 + 3*16 = 1 + 8 + 48 = 57
      expect(cellToIndex([1, 2, 3], gridDims)).toBe(57);
    });

    it('should handle non-uniform grid dimensions', () => {
      const gridDims: [number, number, number] = [8, 4, 2];

      // Cell (0, 0, 1) = 8 * 4 = 32
      expect(cellToIndex([0, 0, 1], gridDims)).toBe(32);

      // Cell (7, 3, 1) = 7 + 3*8 + 1*32 = 7 + 24 + 32 = 63
      expect(cellToIndex([7, 3, 1], gridDims)).toBe(63);
    });

    it('should be invertible', () => {
      const gridDims: [number, number, number] = [16, 16, 16];

      for (let z = 0; z < gridDims[2]; z += 4) {
        for (let y = 0; y < gridDims[1]; y += 4) {
          for (let x = 0; x < gridDims[0]; x += 4) {
            const cell: [number, number, number] = [x, y, z];
            const index = cellToIndex(cell, gridDims);

            // Convert back
            const recoveredX = index % gridDims[0];
            const recoveredY = Math.floor(index / gridDims[0]) % gridDims[1];
            const recoveredZ = Math.floor(index / (gridDims[0] * gridDims[1]));

            expect([recoveredX, recoveredY, recoveredZ]).toEqual(cell);
          }
        }
      }
    });
  });

  describe('Neighbor Finding (getNeighborCells)', () => {
    it('should return 27 neighbors for interior cell', () => {
      const gridDims: [number, number, number] = [16, 16, 16];
      const centerCell: [number, number, number] = [8, 8, 8];
      const neighbors = getNeighborCells(centerCell, gridDims);

      expect(neighbors.length).toBe(27);
    });

    it('should return 8 neighbors for corner cell', () => {
      const gridDims: [number, number, number] = [16, 16, 16];
      const cornerCell: [number, number, number] = [0, 0, 0];
      const neighbors = getNeighborCells(cornerCell, gridDims);

      expect(neighbors.length).toBe(8);
    });

    it('should return 12 neighbors for edge cell', () => {
      const gridDims: [number, number, number] = [16, 16, 16];
      // Edge cell (not corner, on one edge)
      const edgeCell: [number, number, number] = [0, 0, 8];
      const neighbors = getNeighborCells(edgeCell, gridDims);

      expect(neighbors.length).toBe(12);
    });

    it('should return 18 neighbors for face cell', () => {
      const gridDims: [number, number, number] = [16, 16, 16];
      // Face cell (one coordinate at boundary, others interior)
      const faceCell: [number, number, number] = [0, 8, 8];
      const neighbors = getNeighborCells(faceCell, gridDims);

      expect(neighbors.length).toBe(18);
    });

    it('should include self cell in neighbors', () => {
      const gridDims: [number, number, number] = [16, 16, 16];
      const cell: [number, number, number] = [8, 8, 8];
      const cellIndex = cellToIndex(cell, gridDims);
      const neighbors = getNeighborCells(cell, gridDims);

      expect(neighbors).toContain(cellIndex);
    });

    it('should return unique cell indices', () => {
      const gridDims: [number, number, number] = [16, 16, 16];
      const cell: [number, number, number] = [8, 8, 8];
      const neighbors = getNeighborCells(cell, gridDims);

      const uniqueNeighbors = new Set(neighbors);
      expect(uniqueNeighbors.size).toBe(neighbors.length);
    });

    it('should contain all valid indices within bounds', () => {
      const gridDims: [number, number, number] = [4, 4, 4];
      const totalCells = gridDims[0] * gridDims[1] * gridDims[2];

      // Check all cells
      for (let z = 0; z < gridDims[2]; z++) {
        for (let y = 0; y < gridDims[1]; y++) {
          for (let x = 0; x < gridDims[0]; x++) {
            const cell: [number, number, number] = [x, y, z];
            const neighbors = getNeighborCells(cell, gridDims);

            neighbors.forEach((idx) => {
              expect(idx).toBeGreaterThanOrEqual(0);
              expect(idx).toBeLessThan(totalCells);
            });
          }
        }
      }
    });
  });

  describe('Neighbor Finding Completeness', () => {
    it('should find all particles within interaction radius', () => {
      const cellSize = 1.0;
      const gridDims: [number, number, number] = [10, 10, 10];
      const gridMin: [number, number, number] = [0, 0, 0];
      const interactionRadius = cellSize; // Particles within one cell size

      // Create test particles
      const particles: [number, number, number][] = [
        [4.5, 4.5, 4.5], // Center particle
        [4.6, 4.5, 4.5], // Very close
        [5.4, 4.5, 4.5], // Close but in adjacent cell
        [6.0, 4.5, 4.5], // One cell away
        [7.0, 4.5, 4.5], // Two cells away (should not be found)
      ];

      // Find neighbors of first particle using spatial hash approach
      const centerParticle = particles[0];
      const centerCell = positionToCell(centerParticle, gridMin, cellSize, gridDims);
      const neighborCells = getNeighborCells(centerCell, gridDims);

      // Brute force find all particles within radius
      const actualNeighbors: number[] = [];
      for (let i = 1; i < particles.length; i++) {
        if (particlesInRange(centerParticle, particles[i], interactionRadius)) {
          actualNeighbors.push(i);
        }
      }

      // Find particles in neighbor cells
      const foundNeighbors: number[] = [];
      for (let i = 1; i < particles.length; i++) {
        const particleCell = positionToCell(particles[i], gridMin, cellSize, gridDims);
        const particleCellIndex = cellToIndex(particleCell, gridDims);

        if (neighborCells.includes(particleCellIndex)) {
          // This particle is in a neighbor cell, check actual distance
          if (particlesInRange(centerParticle, particles[i], interactionRadius)) {
            foundNeighbors.push(i);
          }
        }
      }

      // All actual neighbors should be found
      actualNeighbors.forEach((idx) => {
        expect(foundNeighbors).toContain(idx);
      });
    });

    it('should not miss neighbors at cell boundaries', () => {
      const cellSize = 1.0;
      const gridDims: [number, number, number] = [10, 10, 10];
      const gridMin: [number, number, number] = [0, 0, 0];
      const interactionRadius = 0.5;

      // Particles at cell boundary
      const particles: [number, number, number][] = [
        [4.99, 5.0, 5.0], // Just before cell boundary
        [5.01, 5.0, 5.0], // Just after cell boundary (different cell, but close)
      ];

      const cell0 = positionToCell(particles[0], gridMin, cellSize, gridDims);
      const cell1 = positionToCell(particles[1], gridMin, cellSize, gridDims);

      // They should be in adjacent cells
      expect(cell0).not.toEqual(cell1);

      // But cell1 should be in neighbors of cell0
      const neighbors0 = getNeighborCells(cell0, gridDims);
      const cell1Index = cellToIndex(cell1, gridDims);
      expect(neighbors0).toContain(cell1Index);

      // And they are within interaction radius
      expect(particlesInRange(particles[0], particles[1], interactionRadius)).toBe(true);
    });

    it('should find all neighbors in a cluster', () => {
      const cellSize = 2.0;
      const gridDims: [number, number, number] = [16, 16, 16];
      const gridMin: [number, number, number] = [0, 0, 0];
      const interactionRadius = 2.0;

      // Create a dense cluster of particles
      const clusterCenter: [number, number, number] = [16, 16, 16];
      const particles: [number, number, number][] = [];

      // Generate particles in a sphere around cluster center
      for (let i = 0; i < 100; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = Math.random() * interactionRadius;

        particles.push([
          clusterCenter[0] + r * Math.sin(phi) * Math.cos(theta),
          clusterCenter[1] + r * Math.sin(phi) * Math.sin(theta),
          clusterCenter[2] + r * Math.cos(phi),
        ]);
      }

      // For each particle, verify all actual neighbors are found
      for (let i = 0; i < particles.length; i++) {
        const particleCell = positionToCell(particles[i], gridMin, cellSize, gridDims);
        const neighborCells = getNeighborCells(particleCell, gridDims);

        // Brute force find all neighbors
        const actualNeighbors: number[] = [];
        for (let j = 0; j < particles.length; j++) {
          if (i !== j && particlesInRange(particles[i], particles[j], interactionRadius)) {
            actualNeighbors.push(j);
          }
        }

        // Find neighbors using spatial hash
        const foundNeighbors: number[] = [];
        for (let j = 0; j < particles.length; j++) {
          if (i !== j) {
            const jCell = positionToCell(particles[j], gridMin, cellSize, gridDims);
            const jCellIndex = cellToIndex(jCell, gridDims);
            if (neighborCells.includes(jCellIndex)) {
              if (particlesInRange(particles[i], particles[j], interactionRadius)) {
                foundNeighbors.push(j);
              }
            }
          }
        }

        // All actual neighbors must be found
        actualNeighbors.forEach((idx) => {
          expect(foundNeighbors).toContain(idx);
        });
      }
    });
  });

  describe('Grid Coverage', () => {
    it('should have no gaps in cell coverage', () => {
      const gridDims: [number, number, number] = [8, 8, 8];
      const cellSize = 1.0;
      const gridMin: [number, number, number] = [0, 0, 0];

      // Test many random positions
      for (let i = 0; i < 100; i++) {
        const pos: [number, number, number] = [
          Math.random() * gridDims[0] * cellSize + gridMin[0],
          Math.random() * gridDims[1] * cellSize + gridMin[1],
          Math.random() * gridDims[2] * cellSize + gridMin[2],
        ];

        const cell = positionToCell(pos, gridMin, cellSize, gridDims);
        const cellIndex = cellToIndex(cell, gridDims);

        // Should always produce valid cell
        expect(cellIndex).toBeGreaterThanOrEqual(0);
        expect(cellIndex).toBeLessThan(gridDims[0] * gridDims[1] * gridDims[2]);
      }
    });

    it('should handle positions exactly at grid boundaries', () => {
      const gridDims: [number, number, number] = [8, 8, 8];
      const cellSize = 1.0;
      const gridMin: [number, number, number] = [0, 0, 0];

      // All corner positions
      const corners: [number, number, number][] = [
        [0, 0, 0],
        [8, 0, 0],
        [0, 8, 0],
        [0, 0, 8],
        [8, 8, 0],
        [8, 0, 8],
        [0, 8, 8],
        [8, 8, 8],
      ];

      corners.forEach((corner) => {
        const cell = positionToCell(corner, gridMin, cellSize, gridDims);
        const cellIndex = cellToIndex(cell, gridDims);

        // Should clamp to valid cell
        expect(cellIndex).toBeGreaterThanOrEqual(0);
        expect(cellIndex).toBeLessThan(gridDims[0] * gridDims[1] * gridDims[2]);
      });
    });
  });
});
