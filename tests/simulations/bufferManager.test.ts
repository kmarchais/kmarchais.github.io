/**
 * Buffer Manager Tests
 *
 * Tests for WebGPU buffer creation and management utilities.
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// Ensure GPUBufferUsage is defined before importing the module
beforeAll(() => {
  if (typeof globalThis.GPUBufferUsage === 'undefined') {
    (globalThis as Record<string, unknown>).GPUBufferUsage = {
      MAP_READ: 1,
      MAP_WRITE: 2,
      COPY_SRC: 4,
      COPY_DST: 8,
      INDEX: 16,
      VERTEX: 32,
      UNIFORM: 64,
      STORAGE: 128,
      INDIRECT: 256,
      QUERY_RESOLVE: 512,
    };
  }
});

// Use dynamic import to ensure globals are set first
let alignedSize: typeof import('../../src/utils/webgpu/bufferManager').alignedSize;
let createSimulationBuffers: typeof import('../../src/utils/webgpu/bufferManager').createSimulationBuffers;
let createSpatialHashBuffers: typeof import('../../src/utils/webgpu/bufferManager').createSpatialHashBuffers;

beforeAll(async () => {
  const module = await import('../../src/utils/webgpu/bufferManager');
  alignedSize = module.alignedSize;
  createSimulationBuffers = module.createSimulationBuffers;
  createSpatialHashBuffers = module.createSpatialHashBuffers;
});

describe('Buffer Manager', () => {
  describe('alignedSize', () => {
    it('should align to 4 bytes by default', () => {
      expect(alignedSize(1)).toBe(4);
      expect(alignedSize(3)).toBe(4);
      expect(alignedSize(4)).toBe(4);
      expect(alignedSize(5)).toBe(8);
    });

    it('should align to custom alignment', () => {
      expect(alignedSize(1, 16)).toBe(16);
      expect(alignedSize(15, 16)).toBe(16);
      expect(alignedSize(16, 16)).toBe(16);
      expect(alignedSize(17, 16)).toBe(32);
    });

    it('should handle zero correctly', () => {
      expect(alignedSize(0)).toBe(0);
    });
  });

  describe('createSimulationBuffers', () => {
    let mockDevice: GPUDevice;
    let createdBuffers: GPUBuffer[];

    beforeEach(() => {
      createdBuffers = [];
      mockDevice = {
        createBuffer: vi.fn().mockImplementation((desc) => {
          const buffer = {
            size: desc.size,
            usage: desc.usage,
            label: desc.label,
            destroy: vi.fn(),
            getMappedRange: vi.fn(),
            unmap: vi.fn(),
            mapAsync: vi.fn(),
          };
          createdBuffers.push(buffer as unknown as GPUBuffer);
          return buffer;
        }),
        queue: {
          writeBuffer: vi.fn(),
          submit: vi.fn(),
        },
      } as unknown as GPUDevice;
    });

    it('should create all required buffers', () => {
      const particleCount = 1000;
      const paramsSize = 32;

      const buffers = createSimulationBuffers(mockDevice, particleCount, paramsSize);

      expect(buffers.positionsA).toBeDefined();
      expect(buffers.positionsB).toBeDefined();
      expect(buffers.velocitiesA).toBeDefined();
      expect(buffers.velocitiesB).toBeDefined();
      expect(buffers.forces).toBeDefined();
      expect(buffers.stagingPositions).toBeDefined();
      expect(buffers.stagingVelocities).toBeDefined();
      expect(buffers.params).toBeDefined();
    });

    it('should create buffers with correct sizes', () => {
      const particleCount = 1000;
      const paramsSize = 32;

      createSimulationBuffers(mockDevice, particleCount, paramsSize);

      // Position/velocity buffers: particleCount * 4 floats * 4 bytes
      const vec4BufferSize = particleCount * 16;

      // Check that buffers were created with correct sizes
      const calls = (mockDevice.createBuffer as ReturnType<typeof vi.fn>).mock.calls;

      // Position buffers (A and B, not staging)
      const positionCalls = calls.filter(
        (c) => c[0].label === 'positions_A' || c[0].label === 'positions_B'
      );
      expect(positionCalls).toHaveLength(2);
      positionCalls.forEach((call) => {
        expect(call[0].size).toBe(vec4BufferSize);
      });

      // Staging position buffer
      const stagingPosCalls = calls.filter((c) => c[0].label === 'staging_positions');
      expect(stagingPosCalls).toHaveLength(1);
      expect(stagingPosCalls[0][0].size).toBe(vec4BufferSize);
    });

    it('should store particle count', () => {
      const particleCount = 1000;
      const paramsSize = 32;

      const buffers = createSimulationBuffers(mockDevice, particleCount, paramsSize);

      expect(buffers.particleCount).toBe(particleCount);
    });

    it('should create buffers with correct usage flags', () => {
      const particleCount = 1000;
      const paramsSize = 32;

      createSimulationBuffers(mockDevice, particleCount, paramsSize);

      const calls = (mockDevice.createBuffer as ReturnType<typeof vi.fn>).mock.calls;

      // Position buffers should have STORAGE | COPY_SRC | COPY_DST
      const positionCalls = calls.filter(
        (c) => c[0].label === 'positions_A' || c[0].label === 'positions_B'
      );
      positionCalls.forEach((call) => {
        expect(call[0].usage).toBe(
          GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        );
      });

      // Staging buffers should have MAP_READ | COPY_DST
      const stagingCalls = calls.filter((c) => c[0].label?.includes('staging'));
      stagingCalls.forEach((call) => {
        expect(call[0].usage).toBe(GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST);
      });

      // Params buffer should have UNIFORM | COPY_DST
      const paramsCalls = calls.filter((c) => c[0].label === 'simulation_params');
      paramsCalls.forEach((call) => {
        expect(call[0].usage).toBe(GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
      });
    });
  });

  describe('createSpatialHashBuffers', () => {
    let mockDevice: GPUDevice;

    beforeEach(() => {
      mockDevice = {
        createBuffer: vi.fn().mockImplementation((desc) => ({
          size: desc.size,
          usage: desc.usage,
          label: desc.label,
          destroy: vi.fn(),
        })),
      } as unknown as GPUDevice;
    });

    it('should create all required buffers', () => {
      const particleCount = 1000;
      const gridDims: [number, number, number] = [16, 16, 16];

      const buffers = createSpatialHashBuffers(mockDevice, particleCount, gridDims);

      expect(buffers.cellIndices).toBeDefined();
      expect(buffers.cellOffsets).toBeDefined();
      expect(buffers.sortedIndices).toBeDefined();
      expect(buffers.cellCounts).toBeDefined();
    });

    it('should calculate correct number of cells', () => {
      const particleCount = 1000;
      const gridDims: [number, number, number] = [16, 16, 16];

      const buffers = createSpatialHashBuffers(mockDevice, particleCount, gridDims);

      expect(buffers.numCells).toBe(16 * 16 * 16);
    });

    it('should create buffers with correct sizes', () => {
      const particleCount = 1000;
      const gridDims: [number, number, number] = [8, 8, 8];
      const numCells = 8 * 8 * 8;

      createSpatialHashBuffers(mockDevice, particleCount, gridDims);

      const calls = (mockDevice.createBuffer as ReturnType<typeof vi.fn>).mock.calls;

      // Cell indices: particleCount * 4 bytes (u32)
      const cellIndicesCalls = calls.filter((c) => c[0].label === 'cell_indices');
      expect(cellIndicesCalls[0][0].size).toBe(particleCount * 4);

      // Cell offsets: (numCells + 1) * 4 bytes
      const cellOffsetsCalls = calls.filter((c) => c[0].label === 'cell_offsets');
      expect(cellOffsetsCalls[0][0].size).toBe((numCells + 1) * 4);

      // Sorted indices: particleCount * 4 bytes
      const sortedIndicesCalls = calls.filter((c) => c[0].label === 'sorted_indices');
      expect(sortedIndicesCalls[0][0].size).toBe(particleCount * 4);

      // Cell counts: numCells * 4 bytes
      const cellCountsCalls = calls.filter((c) => c[0].label === 'cell_counts');
      expect(cellCountsCalls[0][0].size).toBe(numCells * 4);
    });
  });
});
