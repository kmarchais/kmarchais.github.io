/**
 * SPH (Smoothed Particle Hydrodynamics) Simulation Hook
 *
 * WebGPU-accelerated fluid simulation with pressure and viscosity forces.
 * Uses spatial hashing for O(N) neighbor search.
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { getWebGPUDevice } from '@/utils/gpuCapabilities';
import {
  SimulationBuffers,
  SpatialHashBuffers,
  createSimulationBuffers,
  createSpatialHashBuffers,
  uploadParticleData,
  destroySimulationBuffers,
  destroySpatialHashBuffers,
} from '@/utils/webgpu/bufferManager';
import {
  createBindGroup,
  workgroupCount1D,
  uniformEntry,
  storageReadEntry,
  storageReadWriteEntry,
} from '@/utils/webgpu/pipelineBuilder';
import {
  sphShader,
  SPH_WORKGROUP_SIZE,
  SPH_PARAMS_SIZE,
} from '@/shaders/simulations/sph';
import {
  spatialHashShader,
  SPATIAL_HASH_WORKGROUP_SIZE,
  SPATIAL_HASH_PARAMS_SIZE,
} from '@/shaders/simulations/common/spatialHash';
import {
  prefixSumShader,
  PREFIX_SUM_PARAMS_SIZE,
  prefixSumWorkgroups,
  createPrefixSumParamsBuffer,
} from '@/shaders/simulations/common/prefixSum';
import {
  fieldComputeShader,
  FIELD_COMPUTE_WORKGROUP_SIZE,
  FIELD_COMPUTE_PARAMS_SIZE,
  createFieldComputeParamsBuffer,
} from '@/shaders/simulations/sph/fieldCompute';
import { SPH_PRESETS } from '@/components/projects/simulations/sph/sphPresets';

export interface SPHConfig {
  /** Number of particles */
  particleCount: number;
  /** Smoothing length (h) */
  smoothingLength: number;
  /** Rest density (kg/m³) */
  restDensity: number;
  /** Pressure stiffness coefficient */
  stiffness: number;
  /** Dynamic viscosity */
  viscosity: number;
  /** Particle mass */
  particleMass: number;
  /** Gravity (m/s²) */
  gravity: number;
  /** Time step */
  dt: number;
  /** Initial condition preset key */
  preset: string;
  /** Box dimensions [width, height, depth] */
  boxSize: [number, number, number];
  /** Use spatial hashing for neighbor search */
  useSpatialHash?: boolean;
}

export interface SPHState {
  /** Whether simulation is running */
  running: boolean;
  /** Current render frame number (~60/s) */
  frame: number;
  /** Simulation time in seconds */
  time: number;
  /** Whether WebGPU is initialized */
  initialized: boolean;
  /** Error message if initialization failed */
  error: string | null;
}

/** Result of GPU field computation */
export interface GPUFieldResult {
  density: Float32Array;
  velocityX: Float32Array;
  velocityY: Float32Array;
  velocityZ: Float32Array;
  gridResolution: number;
}

/** Configuration for field computation */
export interface FieldComputeConfig {
  gridResolution: number;
  bounds: {
    min: [number, number, number];
    max: [number, number, number];
  };
}

export interface SPHControls {
  /** Start the simulation */
  start: () => void;
  /** Pause the simulation */
  pause: () => void;
  /** Toggle running state */
  toggle: () => void;
  /** Reset with current preset */
  reset: () => void;
  /** Update simulation parameters */
  updateConfig: (config: Partial<SPHConfig>) => void;
  /** Compute density/velocity fields on GPU for mesh generation */
  computeFields: (config: FieldComputeConfig) => Promise<GPUFieldResult | null>;
}

interface SPHBuffers extends SimulationBuffers {
  densities: GPUBuffer;
  pressures: GPUBuffer;
}

interface SpatialHashPipelines {
  computeCellIndices: GPUComputePipeline;
  resetCellCounts: GPUComputePipeline;
  sortParticles: GPUComputePipeline;
}

interface PrefixSumPipelines {
  localScan: GPUComputePipeline;
  scanBlockSums: GPUComputePipeline;
  addBlockSums: GPUComputePipeline;
}

interface PrefixSumBuffers {
  params: GPUBuffer;
  blockSums: GPUBuffer;
}

interface FieldComputeBuffers {
  params: GPUBuffer;
  densityField: GPUBuffer;
  velocityFieldX: GPUBuffer;
  velocityFieldY: GPUBuffer;
  velocityFieldZ: GPUBuffer;
  staging: GPUBuffer;
  gridResolution: number;
  totalCells: number;
}

/** Pre-created bind groups for both ping-pong states (avoids creation in hot loop) */
interface PingPongBindGroups {
  // Main simulation bind groups (A→B and B→A)
  mainA: GPUBindGroup; // posA/velA as input, posB/velB as output
  mainB: GPUBindGroup; // posB/velB as input, posA/velA as output
  // Spatial hash bind groups
  hashBuildA: GPUBindGroup;
  hashBuildB: GPUBindGroup;
  hashQueryA: GPUBindGroup;
  hashQueryB: GPUBindGroup;
  // Prefix sum bind group (doesn't depend on ping-pong)
  prefixSum: GPUBindGroup;
}

interface SimulationRefs {
  device: GPUDevice | null;
  buffers: SPHBuffers | null;
  hashBuffers: SpatialHashBuffers | null;
  hashParams: GPUBuffer | null;
  // Main simulation pipelines
  densityPipeline: GPUComputePipeline | null;
  densityDirectPipeline: GPUComputePipeline | null;
  pressurePipeline: GPUComputePipeline | null;
  forcesPipeline: GPUComputePipeline | null;
  forcesDirectPipeline: GPUComputePipeline | null;
  integratePipeline: GPUComputePipeline | null;
  // Spatial hash pipelines
  hashPipelines: SpatialHashPipelines | null;
  // Prefix sum pipelines and buffers
  prefixSumPipelines: PrefixSumPipelines | null;
  prefixSumBuffers: PrefixSumBuffers | null;
  prefixSumBindGroupLayout: GPUBindGroupLayout | null;
  // Bind group layouts
  bindGroupLayout: GPUBindGroupLayout | null;
  hashBindGroupLayout: GPUBindGroupLayout | null;
  // Pre-created bind groups for fast iteration
  pingPongBindGroups: PingPongBindGroups | null;
  // Field computation (for mesh generation)
  fieldComputePipeline: GPUComputePipeline | null;
  fieldComputeDirectPipeline: GPUComputePipeline | null;
  fieldComputeBindGroupLayout: GPUBindGroupLayout | null;
  fieldComputeHashBindGroupLayout: GPUBindGroupLayout | null;
  fieldBuffers: FieldComputeBuffers | null;
  fieldComputeInProgress: boolean;
  // Grid configuration
  gridDimensions: [number, number, number];
  gridMin: [number, number, number];
  cellSize: number;
  // State
  pingPong: boolean;
  config: SPHConfig;
}

/**
 * Default SPH configuration
 *
 * Key relationships for proper SPH:
 * - spacing ≈ ∛(fillVolume / particleCount)
 * - h (smoothing length) ≈ 2 × spacing for ~30-50 neighbors
 * - mass = restDensity × spacing³
 * - dt determined by CFL condition
 */
const DEFAULT_CONFIG: SPHConfig = {
  particleCount: 1000,
  smoothingLength: 0.22,  // h ≈ 2× spacing; for 1000 particles: spacing≈0.11, h≈0.22
  restDensity: 1000,      // Water density (kg/m³)
  stiffness: 50,          // Lower stiffness for better stability (higher = stiffer but needs smaller dt)
  viscosity: 0.1,         // Moderate viscosity for stability
  particleMass: 1.3,      // restDensity × spacing³ ≈ 1000 × 0.11³ ≈ 1.3 kg
  gravity: -9.81,
  dt: 0.001,              // Conservative timestep
  preset: 'damBreak',
  boxSize: [1.5, 2, 1.5],
  useSpatialHash: true,   // GPU prefix sum enables efficient O(N) neighbor search
};

/**
 * Calculate grid dimensions based on box size and cell size
 */
function calculateGridDimensions(
  boxSize: [number, number, number],
  cellSize: number
): [number, number, number] {
  return [
    Math.ceil(boxSize[0] / cellSize) + 2, // +2 for boundary cells
    Math.ceil(boxSize[1] / cellSize) + 2,
    Math.ceil(boxSize[2] / cellSize) + 2,
  ];
}

/**
 * Hook for SPH fluid simulation
 */
export function useSPHSimulation(
  initialConfig: Partial<SPHConfig> = {}
): [SPHState, SPHControls, Float32Array | null, Float32Array | null, SPHConfig] {
  const refs = useRef<SimulationRefs>({
    device: null,
    buffers: null,
    hashBuffers: null,
    hashParams: null,
    densityPipeline: null,
    densityDirectPipeline: null,
    pressurePipeline: null,
    forcesPipeline: null,
    forcesDirectPipeline: null,
    integratePipeline: null,
    hashPipelines: null,
    prefixSumPipelines: null,
    prefixSumBuffers: null,
    prefixSumBindGroupLayout: null,
    // Field computation
    fieldComputePipeline: null,
    fieldComputeDirectPipeline: null,
    fieldComputeBindGroupLayout: null,
    fieldComputeHashBindGroupLayout: null,
    fieldBuffers: null,
    fieldComputeInProgress: false,
    bindGroupLayout: null,
    hashBindGroupLayout: null,
    pingPongBindGroups: null,
    gridDimensions: [1, 1, 1],
    gridMin: [0, 0, 0],
    cellSize: 0.2,
    pingPong: false,
    config: { ...DEFAULT_CONFIG, ...initialConfig },
  });

  const [state, setState] = useState<SPHState>({
    running: false,
    frame: 0,
    time: 0,
    initialized: false,
    error: null,
  });

  // CPU-side data for rendering
  const [positions, setPositions] = useState<Float32Array | null>(null);
  const [velocities, setVelocities] = useState<Float32Array | null>(null);

  // Frame counter for periodic GPU readback
  const frameCountRef = useRef(0);

  // Track if readback is in progress to avoid backing up
  const readbackInProgressRef = useRef(false);

  // Create params buffer data
  const createParamsData = useCallback((config: SPHConfig): ArrayBuffer => {
    const buffer = new ArrayBuffer(SPH_PARAMS_SIZE);
    const u32View = new Uint32Array(buffer);
    const f32View = new Float32Array(buffer);

    const halfBox = config.boxSize.map(s => s / 2) as [number, number, number];

    u32View[0] = config.particleCount;
    f32View[1] = config.smoothingLength;
    f32View[2] = config.restDensity;
    f32View[3] = config.stiffness;
    f32View[4] = config.viscosity;
    f32View[5] = config.particleMass;
    f32View[6] = config.dt;
    f32View[7] = 0; // padding
    // gravity (vec3f at offset 32)
    f32View[8] = 0;
    f32View[9] = config.gravity;
    f32View[10] = 0;
    f32View[11] = 0; // padding
    // boxMin (vec3f at offset 48)
    f32View[12] = -halfBox[0];
    f32View[13] = 0; // Floor at y=0
    f32View[14] = -halfBox[2];
    f32View[15] = 0; // padding
    // boxMax (vec3f at offset 64)
    f32View[16] = halfBox[0];
    f32View[17] = config.boxSize[1];
    f32View[18] = halfBox[2];
    f32View[19] = 0; // padding

    return buffer;
  }, []);

  // Create spatial hash params data
  const createHashParamsData = useCallback((
    config: SPHConfig,
    gridDimensions: [number, number, number],
    gridMin: [number, number, number],
    cellSize: number
  ): ArrayBuffer => {
    const buffer = new ArrayBuffer(SPATIAL_HASH_PARAMS_SIZE);
    const u32View = new Uint32Array(buffer);
    const f32View = new Float32Array(buffer);

    u32View[0] = config.particleCount;
    u32View[1] = gridDimensions[0];
    u32View[2] = gridDimensions[1];
    u32View[3] = gridDimensions[2];
    f32View[4] = cellSize;
    f32View[5] = gridMin[0];
    f32View[6] = gridMin[1];
    f32View[7] = gridMin[2];

    return buffer;
  }, []);

  // Initialize WebGPU
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const device = await getWebGPUDevice();
        if (!device) {
          if (mounted) {
            setState((s) => ({ ...s, error: 'WebGPU not available' }));
          }
          return;
        }

        if (!mounted) {
          device.destroy();
          return;
        }

        refs.current.device = device;

        const config = refs.current.config;
        const halfBox = config.boxSize.map(s => s / 2) as [number, number, number];

        // Calculate grid configuration
        const cellSize = config.smoothingLength; // Cell size = smoothing length for optimal neighbor search
        const gridDimensions = calculateGridDimensions(config.boxSize, cellSize);
        const gridMin: [number, number, number] = [
          -halfBox[0] - cellSize,
          -cellSize,
          -halfBox[2] - cellSize,
        ];

        refs.current.gridDimensions = gridDimensions;
        refs.current.gridMin = gridMin;
        refs.current.cellSize = cellSize;

        // Create base simulation buffers
        const baseBuffers = createSimulationBuffers(
          device,
          config.particleCount,
          SPH_PARAMS_SIZE
        );

        // Create additional SPH-specific buffers
        const densities = device.createBuffer({
          size: config.particleCount * 4, // f32 per particle
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
          label: 'densities',
        });

        const pressures = device.createBuffer({
          size: config.particleCount * 4, // f32 per particle
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
          label: 'pressures',
        });

        const buffers: SPHBuffers = {
          ...baseBuffers,
          densities,
          pressures,
        };
        refs.current.buffers = buffers;

        // Create spatial hash buffers
        const hashBuffers = createSpatialHashBuffers(device, config.particleCount, gridDimensions);
        refs.current.hashBuffers = hashBuffers;

        // Create spatial hash params buffer
        const hashParams = device.createBuffer({
          size: SPATIAL_HASH_PARAMS_SIZE,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
          label: 'spatial_hash_params',
        });
        refs.current.hashParams = hashParams;

        // Upload hash params
        const hashParamsData = createHashParamsData(config, gridDimensions, gridMin, cellSize);
        device.queue.writeBuffer(hashParams, 0, hashParamsData);

        // Generate initial particle data
        const preset = SPH_PRESETS[config.preset] || SPH_PRESETS.damBreak;
        const initialData = preset.generator(config.particleCount, config);

        // Upload initial data
        uploadParticleData(device, buffers, initialData.positions, initialData.velocities);

        // Update params buffer
        const paramsData = createParamsData(config);
        device.queue.writeBuffer(buffers.params, 0, paramsData);

        // Bind group layout for SPH with spatial hash (two groups)
        const mainBindGroupLayoutEntries = [
          uniformEntry(0),          // params
          storageReadEntry(1),      // positions_in
          storageReadEntry(2),      // velocities_in
          storageReadWriteEntry(3), // positions_out
          storageReadWriteEntry(4), // velocities_out
          storageReadWriteEntry(5), // densities
          storageReadWriteEntry(6), // pressures
          storageReadWriteEntry(7), // forces
        ];

        const hashBindGroupLayoutEntries = [
          uniformEntry(0),          // hashParams
          storageReadEntry(1),      // cellIndices
          storageReadEntry(2),      // cellOffsets
          storageReadEntry(3),      // sortedIndices
        ];

        // Create main bind group layout
        const mainBindGroupLayout = device.createBindGroupLayout({
          entries: mainBindGroupLayoutEntries,
          label: 'sph_main_bind_group_layout',
        });
        refs.current.bindGroupLayout = mainBindGroupLayout;

        // Create hash bind group layout
        const hashBindGroupLayout = device.createBindGroupLayout({
          entries: hashBindGroupLayoutEntries,
          label: 'sph_hash_bind_group_layout',
        });
        refs.current.hashBindGroupLayout = hashBindGroupLayout;

        // Create combined pipeline layout for spatial hash versions
        const combinedPipelineLayout = device.createPipelineLayout({
          bindGroupLayouts: [mainBindGroupLayout, hashBindGroupLayout],
          label: 'sph_combined_pipeline_layout',
        });

        // Create main-only pipeline layout for direct versions
        const mainOnlyPipelineLayout = device.createPipelineLayout({
          bindGroupLayouts: [mainBindGroupLayout],
          label: 'sph_main_only_pipeline_layout',
        });

        // Create SPH shader module
        const sphModule = device.createShaderModule({
          code: sphShader,
          label: 'sph_shader',
        });

        // Create compute pipelines for spatial hash versions
        const densityPipeline = device.createComputePipeline({
          layout: combinedPipelineLayout,
          compute: {
            module: sphModule,
            entryPoint: 'computeDensity',
          },
          label: 'sph_density',
        });

        const forcesPipeline = device.createComputePipeline({
          layout: combinedPipelineLayout,
          compute: {
            module: sphModule,
            entryPoint: 'computeForces',
          },
          label: 'sph_forces',
        });

        // Create compute pipelines for direct (O(N²)) versions
        const densityDirectPipeline = device.createComputePipeline({
          layout: mainOnlyPipelineLayout,
          compute: {
            module: sphModule,
            entryPoint: 'computeDensityDirect',
          },
          label: 'sph_density_direct',
        });

        const forcesDirectPipeline = device.createComputePipeline({
          layout: mainOnlyPipelineLayout,
          compute: {
            module: sphModule,
            entryPoint: 'computeForcesDirect',
          },
          label: 'sph_forces_direct',
        });

        // Pressure and integrate don't need spatial hash
        const pressurePipeline = device.createComputePipeline({
          layout: mainOnlyPipelineLayout,
          compute: {
            module: sphModule,
            entryPoint: 'computePressure',
          },
          label: 'sph_pressure',
        });

        const integratePipeline = device.createComputePipeline({
          layout: mainOnlyPipelineLayout,
          compute: {
            module: sphModule,
            entryPoint: 'integrate',
          },
          label: 'sph_integrate',
        });

        refs.current.densityPipeline = densityPipeline;
        refs.current.densityDirectPipeline = densityDirectPipeline;
        refs.current.pressurePipeline = pressurePipeline;
        refs.current.forcesPipeline = forcesPipeline;
        refs.current.forcesDirectPipeline = forcesDirectPipeline;
        refs.current.integratePipeline = integratePipeline;

        // Create spatial hash pipelines
        // Shader declares: positions(read), cellIndices(read_write), cellCounts(read_write/atomic), cellOffsets(read), sortedIndices(read_write)
        const hashBindGroupLayoutForHash = device.createBindGroupLayout({
          entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
            { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
            { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
            { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
            { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
          ],
          label: 'spatial_hash_bind_group_layout',
        });

        const hashPipelineLayout = device.createPipelineLayout({
          bindGroupLayouts: [hashBindGroupLayoutForHash],
          label: 'spatial_hash_pipeline_layout',
        });

        const hashModule = device.createShaderModule({
          code: spatialHashShader,
          label: 'spatial_hash_shader',
        });

        const computeCellIndicesPipeline = device.createComputePipeline({
          layout: hashPipelineLayout,
          compute: {
            module: hashModule,
            entryPoint: 'computeCellIndices',
          },
          label: 'compute_cell_indices',
        });

        const resetCellCountsPipeline = device.createComputePipeline({
          layout: hashPipelineLayout,
          compute: {
            module: hashModule,
            entryPoint: 'resetCellCounts',
          },
          label: 'reset_cell_counts',
        });

        const sortParticlesPipeline = device.createComputePipeline({
          layout: hashPipelineLayout,
          compute: {
            module: hashModule,
            entryPoint: 'sortParticles',
          },
          label: 'sort_particles',
        });

        refs.current.hashPipelines = {
          computeCellIndices: computeCellIndicesPipeline,
          resetCellCounts: resetCellCountsPipeline,
          sortParticles: sortParticlesPipeline,
        };

        // Create prefix sum pipelines for GPU-based exclusive scan
        const numCells = hashBuffers.numCells;
        const prefixSumBlockCount = prefixSumWorkgroups(numCells);

        const prefixSumBindGroupLayout = device.createBindGroupLayout({
          entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
            { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
            { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
          ],
          label: 'prefix_sum_bind_group_layout',
        });
        refs.current.prefixSumBindGroupLayout = prefixSumBindGroupLayout;

        const prefixSumPipelineLayout = device.createPipelineLayout({
          bindGroupLayouts: [prefixSumBindGroupLayout],
          label: 'prefix_sum_pipeline_layout',
        });

        const prefixSumModule = device.createShaderModule({
          code: prefixSumShader,
          label: 'prefix_sum_shader',
        });

        const localScanPipeline = device.createComputePipeline({
          layout: prefixSumPipelineLayout,
          compute: {
            module: prefixSumModule,
            entryPoint: 'localScan',
          },
          label: 'prefix_sum_local_scan',
        });

        const scanBlockSumsPipeline = device.createComputePipeline({
          layout: prefixSumPipelineLayout,
          compute: {
            module: prefixSumModule,
            entryPoint: 'scanBlockSums',
          },
          label: 'prefix_sum_scan_block_sums',
        });

        const addBlockSumsPipeline = device.createComputePipeline({
          layout: prefixSumPipelineLayout,
          compute: {
            module: prefixSumModule,
            entryPoint: 'addBlockSums',
          },
          label: 'prefix_sum_add_block_sums',
        });

        refs.current.prefixSumPipelines = {
          localScan: localScanPipeline,
          scanBlockSums: scanBlockSumsPipeline,
          addBlockSums: addBlockSumsPipeline,
        };

        // Create prefix sum buffers
        const prefixSumParamsBuffer = device.createBuffer({
          size: PREFIX_SUM_PARAMS_SIZE,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
          label: 'prefix_sum_params',
        });

        // Block sums buffer: one u32 per workgroup
        const blockSumsBuffer = device.createBuffer({
          size: Math.max(prefixSumBlockCount, 1) * 4,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
          label: 'prefix_sum_block_sums',
        });

        refs.current.prefixSumBuffers = {
          params: prefixSumParamsBuffer,
          blockSums: blockSumsBuffer,
        };

        // Initialize prefix sum params
        const prefixSumParamsData = createPrefixSumParamsBuffer(numCells, prefixSumBlockCount);
        device.queue.writeBuffer(prefixSumParamsBuffer, 0, prefixSumParamsData);

        // Create field computation pipelines (for mesh generation)
        const fieldComputeBindGroupLayout = device.createBindGroupLayout({
          entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
            { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
            { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
            { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
            { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
            { binding: 6, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
          ],
          label: 'field_compute_bind_group_layout',
        });

        const fieldComputeHashBindGroupLayout = device.createBindGroupLayout({
          entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
            { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
            { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
          ],
          label: 'field_compute_hash_bind_group_layout',
        });

        refs.current.fieldComputeBindGroupLayout = fieldComputeBindGroupLayout;
        refs.current.fieldComputeHashBindGroupLayout = fieldComputeHashBindGroupLayout;

        const fieldComputeModule = device.createShaderModule({
          code: fieldComputeShader,
          label: 'field_compute_shader',
        });

        const fieldComputeCombinedLayout = device.createPipelineLayout({
          bindGroupLayouts: [fieldComputeBindGroupLayout, fieldComputeHashBindGroupLayout],
          label: 'field_compute_combined_pipeline_layout',
        });

        const fieldComputeMainOnlyLayout = device.createPipelineLayout({
          bindGroupLayouts: [fieldComputeBindGroupLayout],
          label: 'field_compute_main_only_pipeline_layout',
        });

        refs.current.fieldComputePipeline = device.createComputePipeline({
          layout: fieldComputeCombinedLayout,
          compute: {
            module: fieldComputeModule,
            entryPoint: 'computeFields',
          },
          label: 'field_compute_pipeline',
        });

        refs.current.fieldComputeDirectPipeline = device.createComputePipeline({
          layout: fieldComputeMainOnlyLayout,
          compute: {
            module: fieldComputeModule,
            entryPoint: 'computeFieldsDirect',
          },
          label: 'field_compute_direct_pipeline',
        });

        // Pre-create bind groups for both ping-pong states (avoids creation in hot loop)
        // This is critical for performance when running multiple iterations per frame
        const mainBindGroupA = createBindGroup(device, mainBindGroupLayout, [
          { binding: 0, resource: { buffer: buffers.params } },
          { binding: 1, resource: { buffer: buffers.positionsA } },
          { binding: 2, resource: { buffer: buffers.velocitiesA } },
          { binding: 3, resource: { buffer: buffers.positionsB } },
          { binding: 4, resource: { buffer: buffers.velocitiesB } },
          { binding: 5, resource: { buffer: buffers.densities } },
          { binding: 6, resource: { buffer: buffers.pressures } },
          { binding: 7, resource: { buffer: buffers.forces } },
        ]);

        const mainBindGroupB = createBindGroup(device, mainBindGroupLayout, [
          { binding: 0, resource: { buffer: buffers.params } },
          { binding: 1, resource: { buffer: buffers.positionsB } },
          { binding: 2, resource: { buffer: buffers.velocitiesB } },
          { binding: 3, resource: { buffer: buffers.positionsA } },
          { binding: 4, resource: { buffer: buffers.velocitiesA } },
          { binding: 5, resource: { buffer: buffers.densities } },
          { binding: 6, resource: { buffer: buffers.pressures } },
          { binding: 7, resource: { buffer: buffers.forces } },
        ]);

        const hashBuildBindGroupA = device.createBindGroup({
          layout: hashBindGroupLayoutForHash,
          entries: [
            { binding: 0, resource: { buffer: hashParams } },
            { binding: 1, resource: { buffer: buffers.positionsA } },
            { binding: 2, resource: { buffer: hashBuffers.cellIndices } },
            { binding: 3, resource: { buffer: hashBuffers.cellCounts } },
            { binding: 4, resource: { buffer: hashBuffers.cellOffsets } },
            { binding: 5, resource: { buffer: hashBuffers.sortedIndices } },
          ],
          label: 'hash_build_bind_group_a',
        });

        const hashBuildBindGroupB = device.createBindGroup({
          layout: hashBindGroupLayoutForHash,
          entries: [
            { binding: 0, resource: { buffer: hashParams } },
            { binding: 1, resource: { buffer: buffers.positionsB } },
            { binding: 2, resource: { buffer: hashBuffers.cellIndices } },
            { binding: 3, resource: { buffer: hashBuffers.cellCounts } },
            { binding: 4, resource: { buffer: hashBuffers.cellOffsets } },
            { binding: 5, resource: { buffer: hashBuffers.sortedIndices } },
          ],
          label: 'hash_build_bind_group_b',
        });

        const hashQueryBindGroup = device.createBindGroup({
          layout: hashBindGroupLayout,
          entries: [
            { binding: 0, resource: { buffer: hashParams } },
            { binding: 1, resource: { buffer: hashBuffers.cellIndices } },
            { binding: 2, resource: { buffer: hashBuffers.cellOffsets } },
            { binding: 3, resource: { buffer: hashBuffers.sortedIndices } },
          ],
          label: 'hash_query_bind_group',
        });

        // Pre-create prefix sum bind group (doesn't depend on ping-pong state)
        const prefixSumBindGroup = device.createBindGroup({
          layout: prefixSumBindGroupLayout,
          entries: [
            { binding: 0, resource: { buffer: prefixSumParamsBuffer } },
            { binding: 1, resource: { buffer: hashBuffers.cellCounts } },
            { binding: 2, resource: { buffer: hashBuffers.cellOffsets } },
            { binding: 3, resource: { buffer: blockSumsBuffer } },
          ],
          label: 'prefix_sum_bind_group',
        });

        refs.current.pingPongBindGroups = {
          mainA: mainBindGroupA,
          mainB: mainBindGroupB,
          hashBuildA: hashBuildBindGroupA,
          hashBuildB: hashBuildBindGroupB,
          // Hash query doesn't depend on ping-pong state (reads from same hash structure)
          hashQueryA: hashQueryBindGroup,
          hashQueryB: hashQueryBindGroup,
          // Prefix sum doesn't depend on ping-pong state
          prefixSum: prefixSumBindGroup,
        };

        // Set initial positions for rendering
        setPositions(new Float32Array(initialData.positions));
        setVelocities(new Float32Array(initialData.velocities));

        if (mounted) {
          setState((s) => ({ ...s, initialized: true }));
        }
      } catch (err) {
        if (mounted) {
          setState((s) => ({
            ...s,
            error: err instanceof Error ? err.message : 'Unknown error',
          }));
        }
      }
    };

    init();

    return () => {
      mounted = false;
      // Destroy specialized buffers before the general pool, and null out
      // every ref so a re-fired cleanup or late init promise cannot
      // double-destroy the device.
      if (refs.current.buffers) {
        refs.current.buffers.densities.destroy();
        refs.current.buffers.pressures.destroy();
        destroySimulationBuffers(refs.current.buffers);
        refs.current.buffers = null;
      }
      if (refs.current.hashBuffers) {
        destroySpatialHashBuffers(refs.current.hashBuffers);
        refs.current.hashBuffers = null;
      }
      if (refs.current.hashParams) {
        refs.current.hashParams.destroy();
        refs.current.hashParams = null;
      }
      if (refs.current.prefixSumBuffers) {
        refs.current.prefixSumBuffers.params.destroy();
        refs.current.prefixSumBuffers.blockSums.destroy();
        refs.current.prefixSumBuffers = null;
      }
      if (refs.current.fieldBuffers) {
        refs.current.fieldBuffers.params.destroy();
        refs.current.fieldBuffers.densityField.destroy();
        refs.current.fieldBuffers.velocityFieldX.destroy();
        refs.current.fieldBuffers.velocityFieldY.destroy();
        refs.current.fieldBuffers.velocityFieldZ.destroy();
        refs.current.fieldBuffers.staging.destroy();
        refs.current.fieldBuffers = null;
      }
      if (refs.current.device) {
        refs.current.device.destroy();
        refs.current.device = null;
      }
    };
  }, [createParamsData, createHashParamsData]);

  // Frame loop - single iteration per frame
  useFrame(() => {
    const {
      device,
      buffers,
      hashBuffers,
      hashParams,
      densityPipeline,
      densityDirectPipeline,
      pressurePipeline,
      forcesPipeline,
      forcesDirectPipeline,
      integratePipeline,
      hashPipelines,
      hashBindGroupLayout,
      pingPongBindGroups,
      config,
    } = refs.current;

    if (
      !device ||
      !buffers ||
      !densityPipeline ||
      !densityDirectPipeline ||
      !pressurePipeline ||
      !forcesPipeline ||
      !forcesDirectPipeline ||
      !integratePipeline ||
      !pingPongBindGroups ||
      !state.running
    ) {
      return;
    }

    const {
      prefixSumPipelines,
      prefixSumBuffers,
      prefixSumBindGroupLayout,
    } = refs.current;

    const useSpatialHash = config.useSpatialHash && hashBuffers && hashParams && hashPipelines && hashBindGroupLayout &&
      prefixSumPipelines && prefixSumBuffers && prefixSumBindGroupLayout;
    const workgroups = workgroupCount1D(config.particleCount, SPH_WORKGROUP_SIZE);
    const hashWorkgroups = useSpatialHash
      ? workgroupCount1D(hashBuffers!.numCells, SPATIAL_HASH_WORKGROUP_SIZE)
      : 0;

    // Create command encoder
    const encoder = device.createCommandEncoder();

    // Select pre-created bind groups based on current ping-pong state
    const pingPong = refs.current.pingPong;
    const mainBindGroup = pingPong ? pingPongBindGroups.mainB : pingPongBindGroups.mainA;
    const hashBuildBindGroup = pingPong ? pingPongBindGroups.hashBuildB : pingPongBindGroups.hashBuildA;
    const hashQueryBindGroup = pingPong ? pingPongBindGroups.hashQueryB : pingPongBindGroups.hashQueryA;

    if (useSpatialHash) {
        const prefixSumBlockCount = prefixSumWorkgroups(hashBuffers!.numCells);
        // Pass 1: Reset cell counts
        const resetPass = encoder.beginComputePass();
        resetPass.setPipeline(hashPipelines!.resetCellCounts);
        resetPass.setBindGroup(0, hashBuildBindGroup);
        resetPass.dispatchWorkgroups(hashWorkgroups);
        resetPass.end();

        // Pass 2: Compute cell indices and count particles per cell
        const cellIndicesPass = encoder.beginComputePass();
        cellIndicesPass.setPipeline(hashPipelines!.computeCellIndices);
        cellIndicesPass.setBindGroup(0, hashBuildBindGroup);
        cellIndicesPass.dispatchWorkgroups(workgroups);
        cellIndicesPass.end();

        // Pass 3: GPU prefix sum - local scan
        const localScanPass = encoder.beginComputePass();
        localScanPass.setPipeline(prefixSumPipelines!.localScan);
        localScanPass.setBindGroup(0, pingPongBindGroups.prefixSum);
        localScanPass.dispatchWorkgroups(prefixSumBlockCount);
        localScanPass.end();

        // Pass 4: GPU prefix sum - scan block sums (if more than 1 block)
        if (prefixSumBlockCount > 1) {
          const scanBlockSumsPass = encoder.beginComputePass();
          scanBlockSumsPass.setPipeline(prefixSumPipelines!.scanBlockSums);
          scanBlockSumsPass.setBindGroup(0, pingPongBindGroups.prefixSum);
          scanBlockSumsPass.dispatchWorkgroups(1);
          scanBlockSumsPass.end();

          // Pass 5: GPU prefix sum - add block sums back
          const addBlockSumsPass = encoder.beginComputePass();
          addBlockSumsPass.setPipeline(prefixSumPipelines!.addBlockSums);
          addBlockSumsPass.setBindGroup(0, pingPongBindGroups.prefixSum);
          addBlockSumsPass.dispatchWorkgroups(prefixSumBlockCount);
          addBlockSumsPass.end();
        }

        // Pass 6: Reset cell counts again (sortParticles uses atomicAdd starting from 0)
        const resetPass2 = encoder.beginComputePass();
        resetPass2.setPipeline(hashPipelines!.resetCellCounts);
        resetPass2.setBindGroup(0, hashBuildBindGroup);
        resetPass2.dispatchWorkgroups(hashWorkgroups);
        resetPass2.end();

        // Pass 7: Sort particles by cell
        const sortPass = encoder.beginComputePass();
        sortPass.setPipeline(hashPipelines!.sortParticles);
        sortPass.setBindGroup(0, hashBuildBindGroup);
        sortPass.dispatchWorkgroups(workgroups);
        sortPass.end();

        // Pass 8: Compute densities (spatial hash)
        const densityPass = encoder.beginComputePass();
        densityPass.setPipeline(densityPipeline);
        densityPass.setBindGroup(0, mainBindGroup);
        densityPass.setBindGroup(1, hashQueryBindGroup);
        densityPass.dispatchWorkgroups(workgroups);
        densityPass.end();

        // Pass 9: Compute pressures
        const pressurePass = encoder.beginComputePass();
        pressurePass.setPipeline(pressurePipeline);
        pressurePass.setBindGroup(0, mainBindGroup);
        pressurePass.dispatchWorkgroups(workgroups);
        pressurePass.end();

        // Pass 10: Compute forces (spatial hash)
        const forcesPass = encoder.beginComputePass();
        forcesPass.setPipeline(forcesPipeline);
        forcesPass.setBindGroup(0, mainBindGroup);
        forcesPass.setBindGroup(1, hashQueryBindGroup);
        forcesPass.dispatchWorkgroups(workgroups);
        forcesPass.end();

        // Pass 11: Integrate
        const integratePass = encoder.beginComputePass();
        integratePass.setPipeline(integratePipeline);
        integratePass.setBindGroup(0, mainBindGroup);
        integratePass.dispatchWorkgroups(workgroups);
        integratePass.end();
      } else {
        // Use direct O(N²) versions without spatial hashing

        // Pass 1: Compute densities (direct)
        const densityPass = encoder.beginComputePass();
        densityPass.setPipeline(densityDirectPipeline);
        densityPass.setBindGroup(0, mainBindGroup);
        densityPass.dispatchWorkgroups(workgroups);
        densityPass.end();

        // Pass 2: Compute pressures
        const pressurePass = encoder.beginComputePass();
        pressurePass.setPipeline(pressurePipeline);
        pressurePass.setBindGroup(0, mainBindGroup);
        pressurePass.dispatchWorkgroups(workgroups);
        pressurePass.end();

        // Pass 3: Compute forces (direct)
        const forcesPass = encoder.beginComputePass();
        forcesPass.setPipeline(forcesDirectPipeline);
        forcesPass.setBindGroup(0, mainBindGroup);
        forcesPass.dispatchWorkgroups(workgroups);
        forcesPass.end();

        // Pass 4: Integrate
        const integratePass = encoder.beginComputePass();
        integratePass.setPipeline(integratePipeline);
        integratePass.setBindGroup(0, mainBindGroup);
        integratePass.dispatchWorkgroups(workgroups);
        integratePass.end();
    }

    // Toggle ping-pong for next frame
    const newPingPong = !pingPong;
    refs.current.pingPong = newPingPong;

    // Determine which buffer has the final result
    const posOut = newPingPong ? buffers.positionsB : buffers.positionsA;
    const velOut = newPingPong ? buffers.velocitiesB : buffers.velocitiesA;

    // Copy to staging and read back (only if previous readback complete)
    frameCountRef.current += 1;
    const shouldReadback = !readbackInProgressRef.current;

    if (shouldReadback) {
      encoder.copyBufferToBuffer(posOut, 0, buffers.stagingPositions, 0, config.particleCount * 16);
      encoder.copyBufferToBuffer(velOut, 0, buffers.stagingVelocities, 0, config.particleCount * 16);
    }

    device.queue.submit([encoder.finish()]);

    if (shouldReadback) {
      readbackInProgressRef.current = true;

      Promise.all([
        buffers.stagingPositions.mapAsync(GPUMapMode.READ),
        buffers.stagingVelocities.mapAsync(GPUMapMode.READ),
      ]).then(() => {
        const posData = new Float32Array(buffers.stagingPositions.getMappedRange().slice(0));
        const velData = new Float32Array(buffers.stagingVelocities.getMappedRange().slice(0));

        buffers.stagingPositions.unmap();
        buffers.stagingVelocities.unmap();

        setPositions(posData);
        setVelocities(velData);
        readbackInProgressRef.current = false;
      }).catch(() => {
        readbackInProgressRef.current = false;
      });
    }

    // Increment counters
    setState((s) => ({
      ...s,
      frame: s.frame + 1,
      time: s.time + config.dt,
    }));
  });

  // Control functions
  const start = useCallback(() => {
    setState((s) => ({ ...s, running: true }));
  }, []);

  const pause = useCallback(() => {
    setState((s) => ({ ...s, running: false }));
  }, []);

  const toggle = useCallback(() => {
    setState((s) => ({ ...s, running: !s.running }));
  }, []);

  const reset = useCallback(() => {
    const { device, buffers, config } = refs.current;
    if (!device || !buffers) return;

    // Generate new initial data
    const preset = SPH_PRESETS[config.preset] || SPH_PRESETS.damBreak;
    const initialData = preset.generator(config.particleCount, config);

    // Upload to GPU
    uploadParticleData(device, buffers, initialData.positions, initialData.velocities);

    // Reset ping-pong state
    refs.current.pingPong = false;
    frameCountRef.current = 0;

    // Update CPU-side data
    setPositions(new Float32Array(initialData.positions));
    setVelocities(new Float32Array(initialData.velocities));

    // Reset frame counter and time
    setState((s) => ({ ...s, frame: 0, time: 0 }));
  }, []);

  const updateConfig = useCallback((newConfig: Partial<SPHConfig>) => {
    const { device, buffers, config } = refs.current;

    // Update stored config
    refs.current.config = { ...config, ...newConfig };
    const updatedConfig = refs.current.config;

    // Update the uniform buffer
    if (device && buffers) {
      const paramsData = createParamsData(updatedConfig);
      device.queue.writeBuffer(buffers.params, 0, paramsData);
    }
  }, [createParamsData]);

  /**
   * Compute density/velocity fields on GPU for mesh generation
   * Uses the spatial hash for efficient neighbor lookup
   */
  const computeFields = useCallback(async (fieldConfig: FieldComputeConfig): Promise<GPUFieldResult | null> => {
    const {
      device,
      buffers,
      hashBuffers,
      hashParams,
      fieldComputePipeline,
      fieldComputeBindGroupLayout,
      fieldComputeHashBindGroupLayout,
      config,
      pingPong,
    } = refs.current;

    // Check if computation already in progress
    if (refs.current.fieldComputeInProgress) {
      return null;
    }

    if (!device || !buffers || !hashBuffers || !hashParams ||
        !fieldComputePipeline || !fieldComputeBindGroupLayout || !fieldComputeHashBindGroupLayout) {
      return null;
    }

    refs.current.fieldComputeInProgress = true;

    try {
      const gridResolution = fieldConfig.gridResolution;
      const totalCells = gridResolution * gridResolution * gridResolution;

      // Ensure field buffers exist and are correctly sized
      let fieldBuffers = refs.current.fieldBuffers;
      if (!fieldBuffers || fieldBuffers.gridResolution !== gridResolution) {
        // Destroy old buffers if they exist
        if (fieldBuffers) {
          fieldBuffers.params.destroy();
          fieldBuffers.densityField.destroy();
          fieldBuffers.velocityFieldX.destroy();
          fieldBuffers.velocityFieldY.destroy();
          fieldBuffers.velocityFieldZ.destroy();
          fieldBuffers.staging.destroy();
        }

        // Create new buffers
        const bufferSize = totalCells * 4; // f32 per cell

        fieldBuffers = {
          params: device.createBuffer({
            size: FIELD_COMPUTE_PARAMS_SIZE,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: 'field_compute_params',
          }),
          densityField: device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
            label: 'density_field',
          }),
          velocityFieldX: device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
            label: 'velocity_field_x',
          }),
          velocityFieldY: device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
            label: 'velocity_field_y',
          }),
          velocityFieldZ: device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
            label: 'velocity_field_z',
          }),
          staging: device.createBuffer({
            size: bufferSize * 4, // All 4 fields
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
            label: 'field_staging',
          }),
          gridResolution,
          totalCells,
        };

        refs.current.fieldBuffers = fieldBuffers;
      }

      // Update field compute params
      const paramsData = createFieldComputeParamsBuffer({
        gridDimX: gridResolution,
        gridDimY: gridResolution,
        gridDimZ: gridResolution,
        gridMin: fieldConfig.bounds.min,
        gridMax: fieldConfig.bounds.max,
        smoothingRadius: config.smoothingLength,
        particleCount: config.particleCount,
      });
      device.queue.writeBuffer(fieldBuffers.params, 0, paramsData);

      // Get current position/velocity buffers (based on ping-pong state)
      const posBuffer = pingPong ? buffers.positionsA : buffers.positionsB;
      const velBuffer = pingPong ? buffers.velocitiesA : buffers.velocitiesB;

      // Create bind groups
      const mainBindGroup = device.createBindGroup({
        layout: fieldComputeBindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: fieldBuffers.params } },
          { binding: 1, resource: { buffer: posBuffer } },
          { binding: 2, resource: { buffer: velBuffer } },
          { binding: 3, resource: { buffer: fieldBuffers.densityField } },
          { binding: 4, resource: { buffer: fieldBuffers.velocityFieldX } },
          { binding: 5, resource: { buffer: fieldBuffers.velocityFieldY } },
          { binding: 6, resource: { buffer: fieldBuffers.velocityFieldZ } },
        ],
        label: 'field_compute_main_bind_group',
      });

      const hashBindGroup = device.createBindGroup({
        layout: fieldComputeHashBindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: hashParams } },
          { binding: 1, resource: { buffer: hashBuffers.cellIndices } },
          { binding: 2, resource: { buffer: hashBuffers.cellOffsets } },
          { binding: 3, resource: { buffer: hashBuffers.sortedIndices } },
        ],
        label: 'field_compute_hash_bind_group',
      });

      // Compute workgroup counts for 3D dispatch
      const wgSize = FIELD_COMPUTE_WORKGROUP_SIZE;
      const workgroupsX = Math.ceil(gridResolution / wgSize);
      const workgroupsY = Math.ceil(gridResolution / wgSize);
      const workgroupsZ = Math.ceil(gridResolution / wgSize);

      // Create command encoder and dispatch
      const encoder = device.createCommandEncoder();

      const computePass = encoder.beginComputePass();
      computePass.setPipeline(fieldComputePipeline);
      computePass.setBindGroup(0, mainBindGroup);
      computePass.setBindGroup(1, hashBindGroup);
      computePass.dispatchWorkgroups(workgroupsX, workgroupsY, workgroupsZ);
      computePass.end();

      // Copy results to staging buffer
      const bufferSize = totalCells * 4;
      encoder.copyBufferToBuffer(fieldBuffers.densityField, 0, fieldBuffers.staging, 0, bufferSize);
      encoder.copyBufferToBuffer(fieldBuffers.velocityFieldX, 0, fieldBuffers.staging, bufferSize, bufferSize);
      encoder.copyBufferToBuffer(fieldBuffers.velocityFieldY, 0, fieldBuffers.staging, bufferSize * 2, bufferSize);
      encoder.copyBufferToBuffer(fieldBuffers.velocityFieldZ, 0, fieldBuffers.staging, bufferSize * 3, bufferSize);

      device.queue.submit([encoder.finish()]);

      // Read back results
      await fieldBuffers.staging.mapAsync(GPUMapMode.READ);
      const data = new Float32Array(fieldBuffers.staging.getMappedRange().slice(0));
      fieldBuffers.staging.unmap();

      refs.current.fieldComputeInProgress = false;

      return {
        density: data.slice(0, totalCells),
        velocityX: data.slice(totalCells, totalCells * 2),
        velocityY: data.slice(totalCells * 2, totalCells * 3),
        velocityZ: data.slice(totalCells * 3, totalCells * 4),
        gridResolution,
      };
    } catch (err) {
      refs.current.fieldComputeInProgress = false;
      console.error('Field computation failed:', err);
      return null;
    }
  }, []);

  const controls: SPHControls = {
    start,
    pause,
    toggle,
    reset,
    updateConfig,
    computeFields,
  };

  return [state, controls, positions, velocities, refs.current.config];
}
