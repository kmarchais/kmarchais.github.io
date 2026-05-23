/**
 * DEM (Discrete Element Method) Simulation Hook
 *
 * WebGPU-accelerated granular particle simulation using linear spring-dashpot contact model.
 * Uses spatial hashing for O(N) neighbor search - all GPU, no CPU involvement.
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
  demShader,
  DEM_WORKGROUP_SIZE,
} from '@/shaders/simulations/dem';
import {
  spatialHashShader,
  SPATIAL_HASH_WORKGROUP_SIZE,
  SPATIAL_HASH_PARAMS_SIZE,
} from '@/shaders/simulations/common/spatialHash';
import { DEM_PRESETS } from '@/components/projects/simulations/dem/demPresets';

/** Radius distribution type */
export type RadiusDistribution = 'mono' | 'uniform' | 'normal';

export interface DEMConfig {
  /** Number of particles */
  particleCount: number;
  /** Radius distribution type */
  radiusDistribution: RadiusDistribution;
  /** Particle radius (for mono) */
  radius: number;
  /** Min radius (for uniform and normal) */
  radiusMin: number;
  /** Max radius (for uniform and normal) */
  radiusMax: number;
  /** Mean radius (for normal) */
  radiusMean: number;
  /** Std dev radius (for normal) */
  radiusStdDev: number;
  /** Normal stiffness (kn) */
  stiffness: number;
  /** Tangential stiffness ratio (kt/kn) */
  tangentialRatio: number;
  /** Normal damping coefficient */
  dampingN: number;
  /** Tangential damping coefficient */
  dampingT: number;
  /** Friction coefficient */
  friction: number;
  /** Coefficient of restitution */
  restitution: number;
  /** Gravity (m/s²) */
  gravity: number;
  /** Time step */
  dt: number;
  /** Initial condition preset key */
  preset: string;
  /** Box dimensions [width, height, depth] */
  boxSize: [number, number, number];
  /** Container type: 'box' or 'drum' */
  containerType?: 'box' | 'drum';
  /** Drum inner radius */
  drumRadius?: number;
  /** Drum length along X axis */
  drumLength?: number;
  /** Drum rotation speed in RPM */
  drumRPM?: number;
  /** Drum axis Y position (center height) */
  drumCenterY?: number;
}

export interface DEMState {
  /** Whether simulation is running */
  running: boolean;
  /** Current frame number (iteration count) */
  frame: number;
  /** Simulation time in seconds */
  time: number;
  /** Whether WebGPU is initialized */
  initialized: boolean;
  /** Error message if initialization failed */
  error: string | null;
}

export interface DEMControls {
  /** Start the simulation */
  start: () => void;
  /** Pause the simulation */
  pause: () => void;
  /** Toggle running state */
  toggle: () => void;
  /** Reset with current preset */
  reset: () => void;
  /** Update simulation parameters */
  updateConfig: (config: Partial<DEMConfig>) => void;
}

interface SpatialHashPipelines {
  resetCellCounts: GPUComputePipeline;
  buildHash: GPUComputePipeline;
}

interface SimulationRefs {
  device: GPUDevice | null;
  buffers: SimulationBuffers | null;
  hashBuffers: SpatialHashBuffers | null;
  hashParams: GPUBuffer | null;
  // Main simulation pipelines
  forcesPipeline: GPUComputePipeline | null;
  integratePipeline: GPUComputePipeline | null;
  // Spatial hash pipelines
  hashPipelines: SpatialHashPipelines | null;
  // Bind group layouts
  bindGroupLayout: GPUBindGroupLayout | null;
  hashBindGroupLayout: GPUBindGroupLayout | null;
  hashBuildLayout: GPUBindGroupLayout | null;
  // Grid configuration
  gridDimensions: [number, number, number];
  gridMin: [number, number, number];
  cellSize: number;
  // State
  pingPong: boolean;
  config: DEMConfig;
}

/**
 * Compute damping coefficient from restitution using the formula:
 * gamma = -ln(e) / sqrt(pi^2 + ln(e)^2)
 * c = 2 * gamma * sqrt(m * k)
 */
function computeDampingFromRestitution(restitution: number, stiffness: number, mass: number = 1.0): number {
  const e = Math.max(0.01, Math.min(0.99, restitution)); // Clamp to valid range
  const lnE = Math.log(e);
  const gamma = -lnE / Math.sqrt(Math.PI * Math.PI + lnE * lnE);
  return 2 * gamma * Math.sqrt(mass * stiffness);
}

/**
 * Compute critical time step for linear spring-dashpot model:
 * dt_crit = pi * sqrt(m / k)
 * We use a safety factor of 0.1
 */
function computeSafeTimeStep(stiffness: number, mass: number = 1.0, safetyFactor: number = 0.3): number {
  const dtCrit = Math.PI * Math.sqrt(mass / stiffness);
  return dtCrit * safetyFactor;
}

const DEFAULT_CONFIG: DEMConfig = {
  particleCount: 5000,
  radiusDistribution: 'uniform',
  radius: 0.1,
  radiusMin: 0.05,
  radiusMax: 0.15,
  radiusMean: 0.1,
  radiusStdDev: 0.02,
  stiffness: 10000,
  tangentialRatio: 0.5,
  dampingN: 70,
  dampingT: 35,
  friction: 0.5,
  restitution: 0.6,
  gravity: -9.81,
  dt: 0.001,
  preset: 'boxPacking',
  boxSize: [5, 8, 5],
  containerType: 'box',
  drumRadius: 4.0,
  drumLength: 6.0,
  drumRPM: 15,
  drumCenterY: 4.5,
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
 * Hook for DEM granular particle simulation
 */
export function useDEMSimulation(
  initialConfig: Partial<DEMConfig> = {}
): [DEMState, DEMControls, Float32Array | null, Float32Array | null, DEMConfig] {
  const refs = useRef<SimulationRefs>({
    device: null,
    buffers: null,
    hashBuffers: null,
    hashParams: null,
    forcesPipeline: null,
    integratePipeline: null,
    hashPipelines: null,
    bindGroupLayout: null,
    hashBindGroupLayout: null,
    hashBuildLayout: null,
    gridDimensions: [1, 1, 1],
    gridMin: [0, 0, 0],
    cellSize: 0.2,
    pingPong: false,
    config: { ...DEFAULT_CONFIG, ...initialConfig },
  });

  const [state, setState] = useState<DEMState>({
    running: false,
    frame: 0,
    time: 0,
    initialized: false,
    error: null,
  });

  // Use ref for running state to avoid stale closure in useFrame
  const runningRef = useRef(false);

  // CPU-side data for rendering
  const [positions, setPositions] = useState<Float32Array | null>(null);
  const [velocities, setVelocities] = useState<Float32Array | null>(null);

  // Frame counter for periodic GPU readback
  const frameCountRef = useRef(0);

  // Track if readback is in progress to avoid backing up
  const readbackInProgressRef = useRef(false);

  // Create params buffer data with computed damping and safe time step
  const createParamsData = useCallback((config: DEMConfig): ArrayBuffer => {
    const buffer = new ArrayBuffer(128);
    const u32View = new Uint32Array(buffer);
    const f32View = new Float32Array(buffer);

    const halfBox = config.boxSize.map(s => s / 2) as [number, number, number];

    // Compute damping from restitution coefficient
    const dampingN = computeDampingFromRestitution(config.restitution, config.stiffness);
    const dampingT = dampingN * config.tangentialRatio;

    // Compute safe time step
    const safedt = computeSafeTimeStep(config.stiffness);
    const dt = Math.min(config.dt, safedt);

    // Compute drum angular velocity from RPM: omega = 2*pi*RPM/60
    const drumOmega = (config.drumRPM ?? 15) * Math.PI * 2 / 60;

    u32View[0] = config.particleCount;
    f32View[1] = config.radius;
    f32View[2] = config.stiffness;
    f32View[3] = config.stiffness * config.tangentialRatio;
    f32View[4] = dampingN;
    f32View[5] = dampingT;
    f32View[6] = config.friction;
    f32View[7] = config.restitution;
    f32View[8] = 0;
    f32View[9] = config.gravity;
    f32View[10] = 0;
    f32View[11] = dt;
    f32View[12] = -halfBox[0];
    f32View[13] = 0;
    f32View[14] = -halfBox[2];
    f32View[16] = halfBox[0];
    f32View[17] = config.boxSize[1];
    f32View[18] = halfBox[2];
    // Drum parameters (offset 76+)
    // boxMax ends at offset 76 (64 + 12), so containerType starts at 76
    u32View[19] = config.containerType === 'drum' ? 1 : 0;  // containerType at offset 76
    f32View[20] = config.drumRadius ?? 4.0;                  // drumRadius at offset 80
    f32View[21] = config.drumLength ?? 6.0;                  // drumLength at offset 84
    f32View[22] = drumOmega;                                 // drumOmega at offset 88
    f32View[23] = config.drumCenterY ?? 4.5;                 // drumCenterY at offset 92

    return buffer;
  }, []);

  // Create spatial hash params data
  const createHashParamsData = useCallback((
    config: DEMConfig,
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

        // Calculate max radius for spatial hash cell size
        const maxRadius = config.radiusDistribution === 'mono'
          ? config.radius
          : config.radiusMax;

        // Calculate grid configuration (cell size = 2 * maxRadius for contact detection)
        const cellSize = maxRadius * 2;
        const gridDimensions = calculateGridDimensions(config.boxSize, cellSize);
        const gridMin: [number, number, number] = [
          -halfBox[0] - cellSize,
          -cellSize,
          -halfBox[2] - cellSize,
        ];

        refs.current.gridDimensions = gridDimensions;
        refs.current.gridMin = gridMin;
        refs.current.cellSize = cellSize;

        // Create simulation buffers (128 bytes for params including drum parameters)
        const buffers = createSimulationBuffers(device, config.particleCount, 128);
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
        const preset = DEM_PRESETS[config.preset] || DEM_PRESETS.boxPacking;
        const initialData = preset.generator(config.particleCount, config);

        // Upload initial data
        uploadParticleData(device, buffers, initialData.positions, initialData.velocities);

        // Update params buffer
        const paramsData = createParamsData(config);
        device.queue.writeBuffer(buffers.params, 0, paramsData);

        // Main simulation bind group layout
        const mainBindGroupLayout = device.createBindGroupLayout({
          entries: [
            uniformEntry(0),          // params
            storageReadEntry(1),      // positions_in
            storageReadEntry(2),      // velocities_in
            storageReadWriteEntry(3), // positions_out
            storageReadWriteEntry(4), // velocities_out
            storageReadWriteEntry(5), // forces
          ],
          label: 'dem_main_bind_group_layout',
        });
        refs.current.bindGroupLayout = mainBindGroupLayout;

        // Hash query bind group layout (for force computation)
        const hashBindGroupLayout = device.createBindGroupLayout({
          entries: [
            uniformEntry(0),          // hashParams
            storageReadEntry(1),      // cellCounts
            storageReadEntry(2),      // cellParticles
          ],
          label: 'dem_hash_bind_group_layout',
        });
        refs.current.hashBindGroupLayout = hashBindGroupLayout;

        // Hash build bind group layout (for building the hash)
        // DEM uses bindings 0, 1, 3, 6 for buildHash:
        // - binding 0: params (uniform)
        // - binding 1: positions (read-only storage)
        // - binding 3: cellCounts (atomic storage)
        // - binding 6: cellParticles (storage for DEM fixed-max-per-cell)
        const hashBuildLayout = device.createBindGroupLayout({
          entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
            { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
            { binding: 6, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
          ],
          label: 'hash_build_layout',
        });
        refs.current.hashBuildLayout = hashBuildLayout;

        // Create pipeline layouts
        const forcePipelineLayout = device.createPipelineLayout({
          bindGroupLayouts: [mainBindGroupLayout, hashBindGroupLayout],
          label: 'dem_force_pipeline_layout',
        });

        const integratePipelineLayout = device.createPipelineLayout({
          bindGroupLayouts: [mainBindGroupLayout],
          label: 'dem_integrate_pipeline_layout',
        });

        const hashBuildPipelineLayout = device.createPipelineLayout({
          bindGroupLayouts: [hashBuildLayout],
          label: 'hash_build_pipeline_layout',
        });

        // Create DEM shader module
        const demModule = device.createShaderModule({
          code: demShader,
          label: 'dem_shader',
        });

        // Create compute pipelines
        const forcesPipeline = device.createComputePipeline({
          layout: forcePipelineLayout,
          compute: {
            module: demModule,
            entryPoint: 'computeForces',
          },
          label: 'dem_forces',
        });

        const integratePipeline = device.createComputePipeline({
          layout: integratePipelineLayout,
          compute: {
            module: demModule,
            entryPoint: 'integrate',
          },
          label: 'dem_integrate',
        });

        refs.current.forcesPipeline = forcesPipeline;
        refs.current.integratePipeline = integratePipeline;

        // Create spatial hash pipelines
        const hashModule = device.createShaderModule({
          code: spatialHashShader,
          label: 'spatial_hash_shader',
        });

        const resetCellCountsPipeline = device.createComputePipeline({
          layout: hashBuildPipelineLayout,
          compute: {
            module: hashModule,
            entryPoint: 'resetCellCounts',
          },
          label: 'reset_cell_counts',
        });

        const buildHashPipeline = device.createComputePipeline({
          layout: hashBuildPipelineLayout,
          compute: {
            module: hashModule,
            entryPoint: 'buildHash',
          },
          label: 'build_hash',
        });

        refs.current.hashPipelines = {
          resetCellCounts: resetCellCountsPipeline,
          buildHash: buildHashPipeline,
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
      // Null out every ref after destroy so a re-fired cleanup or
      // late-resolving init promise cannot double-destroy the device.
      if (refs.current.buffers) {
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
      refs.current.forcesPipeline = null;
      refs.current.integratePipeline = null;
      refs.current.hashPipelines = null;
      refs.current.bindGroupLayout = null;
      refs.current.hashBindGroupLayout = null;
      refs.current.hashBuildLayout = null;
      if (refs.current.device) {
        refs.current.device.destroy();
        refs.current.device = null;
      }
    };
  }, [createParamsData, createHashParamsData]);

  // Frame loop: 1 iteration per frame for smooth rendering
  // All work stays on GPU - no CPU involvement in hash building
  const simulationTimeRef = useRef(0);

  useFrame(() => {
    const {
      device,
      buffers,
      hashBuffers,
      hashParams,
      forcesPipeline,
      integratePipeline,
      hashPipelines,
      bindGroupLayout,
      hashBindGroupLayout,
      hashBuildLayout,
      gridDimensions,
      config,
    } = refs.current;

    if (
      !device ||
      !buffers ||
      !hashBuffers ||
      !hashParams ||
      !forcesPipeline ||
      !integratePipeline ||
      !hashPipelines ||
      !bindGroupLayout ||
      !hashBindGroupLayout ||
      !hashBuildLayout ||
      !runningRef.current
    ) {
      return;
    }

    const workgroups = workgroupCount1D(config.particleCount, DEM_WORKGROUP_SIZE);
    const numCells = gridDimensions[0] * gridDimensions[1] * gridDimensions[2];
    const cellWorkgroups = workgroupCount1D(numCells, SPATIAL_HASH_WORKGROUP_SIZE);

    // Calculate simulation time step (use safe dt from params)
    const safedt = computeSafeTimeStep(config.stiffness);
    const dt = Math.min(config.dt, safedt);

    // Determine current ping-pong state
    let currentPingPong = refs.current.pingPong;

    // Create single command encoder for all GPU work this frame
    const encoder = device.createCommandEncoder();

    // Single iteration per frame for smooth rendering
    {
      const posIn = currentPingPong ? buffers.positionsB : buffers.positionsA;
      const posOut = currentPingPong ? buffers.positionsA : buffers.positionsB;
      const velIn = currentPingPong ? buffers.velocitiesB : buffers.velocitiesA;
      const velOut = currentPingPong ? buffers.velocitiesA : buffers.velocitiesB;

      // === Step 1: Build spatial hash ===
      // Bindings match shader: 0=params, 1=positions, 3=cellCounts, 6=cellParticles
      const hashBuildBindGroup = device.createBindGroup({
        layout: hashBuildLayout,
        entries: [
          { binding: 0, resource: { buffer: hashParams } },
          { binding: 1, resource: { buffer: posIn } },
          { binding: 3, resource: { buffer: hashBuffers.cellCounts } },
          { binding: 6, resource: { buffer: hashBuffers.cellParticles! } },
        ],
      });

      // Reset cell counts
      const resetPass = encoder.beginComputePass();
      resetPass.setPipeline(hashPipelines.resetCellCounts);
      resetPass.setBindGroup(0, hashBuildBindGroup);
      resetPass.dispatchWorkgroups(cellWorkgroups);
      resetPass.end();

      // Build hash (each particle atomically adds itself to its cell)
      const buildPass = encoder.beginComputePass();
      buildPass.setPipeline(hashPipelines.buildHash);
      buildPass.setBindGroup(0, hashBuildBindGroup);
      buildPass.dispatchWorkgroups(workgroups);
      buildPass.end();

      // === Step 2: Compute forces using spatial hash ===
      const mainBindGroup = createBindGroup(device, bindGroupLayout, [
        { binding: 0, resource: { buffer: buffers.params } },
        { binding: 1, resource: { buffer: posIn } },
        { binding: 2, resource: { buffer: velIn } },
        { binding: 3, resource: { buffer: posOut } },
        { binding: 4, resource: { buffer: velOut } },
        { binding: 5, resource: { buffer: buffers.forces } },
      ]);

      const hashQueryBindGroup = createBindGroup(device, hashBindGroupLayout, [
        { binding: 0, resource: { buffer: hashParams } },
        { binding: 1, resource: { buffer: hashBuffers.cellCounts } },
        { binding: 2, resource: { buffer: hashBuffers.cellParticles! } },
      ]);

      const forcesPass = encoder.beginComputePass();
      forcesPass.setPipeline(forcesPipeline);
      forcesPass.setBindGroup(0, mainBindGroup);
      forcesPass.setBindGroup(1, hashQueryBindGroup);
      forcesPass.dispatchWorkgroups(workgroups);
      forcesPass.end();

      // === Step 3: Integrate (update positions and velocities) ===
      const integratePass = encoder.beginComputePass();
      integratePass.setPipeline(integratePipeline);
      integratePass.setBindGroup(0, mainBindGroup);
      integratePass.dispatchWorkgroups(workgroups);
      integratePass.end();

      currentPingPong = !currentPingPong;
      frameCountRef.current++;
      simulationTimeRef.current += dt;
    }

    refs.current.pingPong = currentPingPong;

    // Determine final output buffer
    const finalPosBuffer = currentPingPong ? buffers.positionsB : buffers.positionsA;
    const finalVelBuffer = currentPingPong ? buffers.velocitiesB : buffers.velocitiesA;

    // Only copy to staging if no readback is pending (avoid buffer race)
    const shouldReadback = !readbackInProgressRef.current;
    if (shouldReadback) {
      encoder.copyBufferToBuffer(finalPosBuffer, 0, buffers.stagingPositions, 0, config.particleCount * 16);
      encoder.copyBufferToBuffer(finalVelBuffer, 0, buffers.stagingVelocities, 0, config.particleCount * 16);
    }

    // Submit all work in one batch
    device.queue.submit([encoder.finish()]);

    // Update frame count and time immediately
    setState((s) => ({ ...s, frame: frameCountRef.current, time: simulationTimeRef.current }));

    // Only start readback if previous one is complete
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
  });

  // Control functions
  const start = useCallback(() => {
    runningRef.current = true;
    setState((s) => ({ ...s, running: true }));
  }, []);

  const pause = useCallback(() => {
    runningRef.current = false;
    setState((s) => ({ ...s, running: false }));
  }, []);

  const toggle = useCallback(() => {
    runningRef.current = !runningRef.current;
    setState((s) => ({ ...s, running: runningRef.current }));
  }, []);

  const reset = useCallback(() => {
    const { device, buffers, config } = refs.current;
    if (!device || !buffers) return;

    // Generate new initial data
    const preset = DEM_PRESETS[config.preset] || DEM_PRESETS.boxPacking;
    const initialData = preset.generator(config.particleCount, config);

    // Upload to GPU
    uploadParticleData(device, buffers, initialData.positions, initialData.velocities);

    // Reset ping-pong state and counters
    refs.current.pingPong = false;
    frameCountRef.current = 0;
    simulationTimeRef.current = 0;

    // Update CPU-side data
    setPositions(new Float32Array(initialData.positions));
    setVelocities(new Float32Array(initialData.velocities));

    // Reset frame counter and time
    setState((s) => ({ ...s, frame: 0, time: 0 }));
  }, []);

  const updateConfig = useCallback((newConfig: Partial<DEMConfig>) => {
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

  const controls: DEMControls = {
    start,
    pause,
    toggle,
    reset,
    updateConfig,
  };

  return [state, controls, positions, velocities, refs.current.config];
}
