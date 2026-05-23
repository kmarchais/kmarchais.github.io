/**
 * Gyroid Flow Simulation Hook
 *
 * WebGPU-accelerated particle simulation flowing through a gyroid structure.
 * Particles respawn when they fall below a threshold, creating continuous flow.
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
  gyroidFlowShader,
  GYROID_FLOW_WORKGROUP_SIZE,
  GYROID_FLOW_PARAMS_SIZE,
  createGyroidFlowParamsBuffer,
} from '@/shaders/simulations/gyroidFlow';
import {
  spatialHashShader,
  SPATIAL_HASH_WORKGROUP_SIZE,
  SPATIAL_HASH_PARAMS_SIZE,
} from '@/shaders/simulations/common/spatialHash';
import { GYROID_FLOW_PRESETS } from '@/components/projects/simulations/gyroidFlow/gyroidFlowPresets';

export interface GyroidFlowConfig {
  particleCount: number;
  radius: number;
  radiusMin: number;
  radiusMax: number;
  stiffness: number;
  tangentialRatio: number;
  friction: number;
  restitution: number;
  gravity: number;
  dt: number;
  // Hourglass bounds
  hourglassRadiusTop: number;    // Radius at top and bottom (wide)
  hourglassRadiusWaist: number;  // Radius at waist (narrow)
  hourglassYMin: number;         // Bottom of hourglass
  hourglassYMax: number;         // Top of hourglass
  spawnXMin: number;
  spawnXMax: number;
  spawnYMin: number;
  spawnYMax: number;
  spawnZMin: number;
  spawnZMax: number;
  respawnYThreshold: number;
  topCapEnabled: boolean;
  geometryType: number;        // 0 = hourglass, 1 = gyroid, 2 = helix+stadium
  gyroidScale: number;         // Scale factor for gyroid (2π for unit cell)
  gyroidThreshold: number;     // SDF threshold for collision
  // Helix+Stadium parameters (geometryType = 2)
  helixPitch?: number;
  helixRadius?: number;
  helixShaftRadius?: number;
  helixThickness?: number;
  stadiumMajorRadius?: number;
  stadiumStraightLength?: number;
  stadiumTubeRadius?: number;
  preset: string;
  autoStart?: boolean;
}

export interface GyroidFlowState {
  running: boolean;
  frame: number;
  time: number;
  initialized: boolean;
  error: string | null;
}

export interface GyroidFlowControls {
  start: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  updateConfig: (config: Partial<GyroidFlowConfig>) => void;
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
  forcesPipeline: GPUComputePipeline | null;
  integratePipeline: GPUComputePipeline | null;
  hashPipelines: SpatialHashPipelines | null;
  bindGroupLayout: GPUBindGroupLayout | null;
  hashBindGroupLayout: GPUBindGroupLayout | null;
  hashBuildLayout: GPUBindGroupLayout | null;
  gridDimensions: [number, number, number];
  gridMin: [number, number, number];
  cellSize: number;
  pingPong: boolean;
  config: GyroidFlowConfig;
  frameCounter: number;
}

/**
 * Compute damping from restitution coefficient
 */
function computeDampingFromRestitution(restitution: number, stiffness: number, mass: number = 1.0): number {
  const e = Math.max(0.01, Math.min(0.99, restitution));
  const lnE = Math.log(e);
  const gamma = -lnE / Math.sqrt(Math.PI * Math.PI + lnE * lnE);
  return 2 * gamma * Math.sqrt(mass * stiffness);
}

/**
 * Compute safe time step for linear spring-dashpot model
 */
function computeSafeTimeStep(stiffness: number, mass: number = 1.0, safetyFactor: number = 0.3): number {
  const dtCrit = Math.PI * Math.sqrt(mass / stiffness);
  return dtCrit * safetyFactor;
}

const DEFAULT_CONFIG: GyroidFlowConfig = {
  particleCount: 2000,
  radius: 0.08,
  radiusMin: 0.08,
  radiusMax: 0.08,
  stiffness: 15000,
  tangentialRatio: 0.5,
  friction: 0.3,
  restitution: 0.4,
  gravity: -9.81,
  dt: 0.001,
  // Hourglass bounds
  hourglassRadiusTop: 2.5,     // Radius at top and bottom (wide)
  hourglassRadiusWaist: 0.5,   // Radius at waist (narrow)
  hourglassYMin: 0.0,          // Bottom of hourglass
  hourglassYMax: 6.0,          // Top of hourglass
  // Spawn above the hourglass so particles fall in
  spawnXMin: -1.5,
  spawnXMax: 1.5,
  spawnYMin: 6.5,
  spawnYMax: 8.0,
  spawnZMin: -1.5,
  spawnZMax: 1.5,
  respawnYThreshold: -0.5,
  topCapEnabled: false,
  geometryType: 0,             // 0 = hourglass, 1 = gyroid
  gyroidScale: 2 * Math.PI,    // Unit cell
  gyroidThreshold: 0.3,        // SDF threshold for channel width
  preset: 'default',
  autoStart: false,
};

/**
 * Calculate grid dimensions for spatial hashing
 * For gyroid mode: no X/Z padding so cell wrapping works correctly
 */
function calculateGridDimensions(
  config: GyroidFlowConfig,
  cellSize: number
): [number, number, number] {
  const isGyroid = config.geometryType === 1;
  const boxHalfSize = (config.hourglassYMax - config.hourglassYMin) / 6.0;

  // For gyroid: use full periodic domain with NO padding in X/Z
  // For hourglass: use spawn bounds with padding
  const xRange = isGyroid ? boxHalfSize * 2 : (config.spawnXMax - config.spawnXMin);
  const yRange = config.hourglassYMax - config.hourglassYMin;
  const zRange = isGyroid ? boxHalfSize * 2 : (config.spawnZMax - config.spawnZMin);

  return [
    isGyroid ? Math.ceil(xRange / cellSize) : Math.ceil(xRange / cellSize) + 2,
    Math.ceil(yRange / cellSize) + 2,  // Y always has padding
    isGyroid ? Math.ceil(zRange / cellSize) : Math.ceil(zRange / cellSize) + 2,
  ];
}

/**
 * Hook for gyroid flow particle simulation
 */
export function useGyroidFlowSimulation(
  initialConfig: Partial<GyroidFlowConfig> = {}
): [GyroidFlowState, GyroidFlowControls, Float32Array | null, Float32Array | null, GyroidFlowConfig] {
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
    frameCounter: 0,
  });

  const [state, setState] = useState<GyroidFlowState>({
    running: false,
    frame: 0,
    time: 0,
    initialized: false,
    error: null,
  });

  const runningRef = useRef(false);
  const [positions, setPositions] = useState<Float32Array | null>(null);
  const [velocities, setVelocities] = useState<Float32Array | null>(null);
  const frameCountRef = useRef(0);
  const readbackInProgressRef = useRef(false);
  const simulationTimeRef = useRef(0);

  // Mount version to prevent stale readbacks from overwriting fresh data
  const mountVersionRef = useRef(0);
  const isMountedRef = useRef(true);

  // Create params buffer data
  const createParamsData = useCallback((config: GyroidFlowConfig, seed: number): ArrayBuffer => {
    const dampingN = computeDampingFromRestitution(config.restitution, config.stiffness);
    const dampingT = dampingN * config.tangentialRatio;
    const safedt = computeSafeTimeStep(config.stiffness);
    const dt = Math.min(config.dt, safedt);

    return createGyroidFlowParamsBuffer({
      particleCount: config.particleCount,
      radius: config.radius,
      kn: config.stiffness,
      kt: config.stiffness * config.tangentialRatio,
      dampingN,
      dampingT,
      friction: config.friction,
      restitution: config.restitution,
      gravity: [0, config.gravity, 0],
      dt,
      hourglassRadiusTop: config.hourglassRadiusTop,
      hourglassYMin: config.hourglassYMin,
      hourglassYMax: config.hourglassYMax,
      spawnXMin: config.spawnXMin,
      spawnXMax: config.spawnXMax,
      spawnYMin: config.spawnYMin,
      spawnYMax: config.spawnYMax,
      spawnZMin: config.spawnZMin,
      spawnZMax: config.spawnZMax,
      respawnYThreshold: config.respawnYThreshold,
      seed,
      hourglassRadiusWaist: config.hourglassRadiusWaist,
      topCapEnabled: config.topCapEnabled ? 1.0 : 0.0,
      geometryType: config.geometryType,
      gyroidScale: config.gyroidScale,
      gyroidThreshold: config.gyroidThreshold,
      // Helix+Stadium parameters
      helixPitch: config.helixPitch ?? 0.35,
      helixRadius: config.helixRadius ?? 0.4,
      helixShaftRadius: config.helixShaftRadius ?? 0.08,
      helixThickness: config.helixThickness ?? 0.05,
      stadiumMajorRadius: config.stadiumMajorRadius ?? 0.5,
      stadiumStraightLength: config.stadiumStraightLength ?? 1.0,
      stadiumTubeRadius: config.stadiumTubeRadius ?? 0.5,
    });
  }, []);

  // Create hash params data
  const createHashParamsData = useCallback((
    config: GyroidFlowConfig,
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
    // Increment mount version to invalidate any pending readbacks from previous mounts
    mountVersionRef.current += 1;
    const currentMountVersion = mountVersionRef.current;
    isMountedRef.current = true;

    const init = async () => {
      try {
        const device = await getWebGPUDevice();
        if (!device) {
          if (isMountedRef.current && mountVersionRef.current === currentMountVersion) {
            setState((s) => ({ ...s, error: 'WebGPU not available' }));
          }
          return;
        }

        if (!isMountedRef.current || mountVersionRef.current !== currentMountVersion) {
          device.destroy();
          return;
        }

        refs.current.device = device;
        const config = refs.current.config;

        // Calculate grid configuration
        const cellSize = config.radius * 2;
        const gridDimensions = calculateGridDimensions(config, cellSize);
        const isGyroid = config.geometryType === 1;
        const boxHalfSize = (config.hourglassYMax - config.hourglassYMin) / 6.0;
        const gridMin: [number, number, number] = [
          // For gyroid: no X/Z padding, grid starts exactly at -boxHalfSize
          isGyroid ? -boxHalfSize : config.spawnXMin - cellSize,
          config.hourglassYMin - cellSize,  // Y always has padding
          isGyroid ? -boxHalfSize : config.spawnZMin - cellSize,
        ];

        refs.current.gridDimensions = gridDimensions;
        refs.current.gridMin = gridMin;
        refs.current.cellSize = cellSize;

        // Create simulation buffers
        const buffers = createSimulationBuffers(device, config.particleCount, GYROID_FLOW_PARAMS_SIZE);
        refs.current.buffers = buffers;

        // Create spatial hash buffers
        const hashBuffers = createSpatialHashBuffers(device, config.particleCount, gridDimensions);
        refs.current.hashBuffers = hashBuffers;

        // Create hash params buffer
        const hashParams = device.createBuffer({
          size: SPATIAL_HASH_PARAMS_SIZE,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
          label: 'gyroid_hash_params',
        });
        refs.current.hashParams = hashParams;

        // Upload hash params
        const hashParamsData = createHashParamsData(config, gridDimensions, gridMin, cellSize);
        device.queue.writeBuffer(hashParams, 0, hashParamsData);

        // Generate initial particle data
        const preset = GYROID_FLOW_PRESETS[config.preset] || GYROID_FLOW_PRESETS.default;
        const initialData = preset.generator(config.particleCount, config);

        // Upload initial data
        uploadParticleData(device, buffers, initialData.positions, initialData.velocities);

        // Update params buffer
        const paramsData = createParamsData(config, 0);
        device.queue.writeBuffer(buffers.params, 0, paramsData);

        // Create bind group layouts
        const mainBindGroupLayout = device.createBindGroupLayout({
          entries: [
            uniformEntry(0),
            storageReadEntry(1),
            storageReadEntry(2),
            storageReadWriteEntry(3),
            storageReadWriteEntry(4),
            storageReadWriteEntry(5),
          ],
          label: 'gyroid_main_bind_group_layout',
        });
        refs.current.bindGroupLayout = mainBindGroupLayout;

        const hashBindGroupLayout = device.createBindGroupLayout({
          entries: [
            uniformEntry(0),
            storageReadEntry(1),
            storageReadEntry(2),
          ],
          label: 'gyroid_hash_bind_group_layout',
        });
        refs.current.hashBindGroupLayout = hashBindGroupLayout;

        const hashBuildLayout = device.createBindGroupLayout({
          entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
            { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
            { binding: 6, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
          ],
          label: 'gyroid_hash_build_layout',
        });
        refs.current.hashBuildLayout = hashBuildLayout;

        // Create pipeline layouts
        const forcePipelineLayout = device.createPipelineLayout({
          bindGroupLayouts: [mainBindGroupLayout, hashBindGroupLayout],
          label: 'gyroid_force_pipeline_layout',
        });

        const integratePipelineLayout = device.createPipelineLayout({
          bindGroupLayouts: [mainBindGroupLayout],
          label: 'gyroid_integrate_pipeline_layout',
        });

        const hashBuildPipelineLayout = device.createPipelineLayout({
          bindGroupLayouts: [hashBuildLayout],
          label: 'gyroid_hash_build_pipeline_layout',
        });

        // Create shader modules
        const gyroidModule = device.createShaderModule({
          code: gyroidFlowShader,
          label: 'gyroid_flow_shader',
        });

        const hashModule = device.createShaderModule({
          code: spatialHashShader,
          label: 'gyroid_hash_shader',
        });

        // Create compute pipelines
        const forcesPipeline = device.createComputePipeline({
          layout: forcePipelineLayout,
          compute: {
            module: gyroidModule,
            entryPoint: 'computeForces',
          },
          label: 'gyroid_forces',
        });

        const integratePipeline = device.createComputePipeline({
          layout: integratePipelineLayout,
          compute: {
            module: gyroidModule,
            entryPoint: 'integrate',
          },
          label: 'gyroid_integrate',
        });

        refs.current.forcesPipeline = forcesPipeline;
        refs.current.integratePipeline = integratePipeline;

        // Create spatial hash pipelines
        const resetCellCountsPipeline = device.createComputePipeline({
          layout: hashBuildPipelineLayout,
          compute: {
            module: hashModule,
            entryPoint: 'resetCellCounts',
          },
          label: 'gyroid_reset_cell_counts',
        });

        const buildHashPipeline = device.createComputePipeline({
          layout: hashBuildPipelineLayout,
          compute: {
            module: hashModule,
            entryPoint: 'buildHash',
          },
          label: 'gyroid_build_hash',
        });

        refs.current.hashPipelines = {
          resetCellCounts: resetCellCountsPipeline,
          buildHash: buildHashPipeline,
        };

        // Set initial positions for rendering (only if still mounted with same version)
        if (isMountedRef.current && mountVersionRef.current === currentMountVersion) {
          setPositions(new Float32Array(initialData.positions));
          setVelocities(new Float32Array(initialData.velocities));
          setState((s) => ({ ...s, initialized: true }));

          // Auto-start if configured
          if (config.autoStart) {
            runningRef.current = true;
            setState((s) => ({ ...s, running: true }));
          }
        }
      } catch (err) {
        if (isMountedRef.current && mountVersionRef.current === currentMountVersion) {
          setState((s) => ({
            ...s,
            error: err instanceof Error ? err.message : 'Unknown error',
          }));
        }
      }
    };

    init();

    return () => {
      isMountedRef.current = false;
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
      if (refs.current.device) {
        refs.current.device.destroy();
        refs.current.device = null;
      }
    };
  }, [createParamsData, createHashParamsData]);

  // Frame loop
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

    const workgroups = workgroupCount1D(config.particleCount, GYROID_FLOW_WORKGROUP_SIZE);
    const numCells = gridDimensions[0] * gridDimensions[1] * gridDimensions[2];
    const cellWorkgroups = workgroupCount1D(numCells, SPATIAL_HASH_WORKGROUP_SIZE);

    const safedt = computeSafeTimeStep(config.stiffness);
    const dt = Math.min(config.dt, safedt);

    let currentPingPong = refs.current.pingPong;

    // Increment frame counter for random seed
    refs.current.frameCounter++;

    // Update params with new seed
    const paramsData = createParamsData(config, refs.current.frameCounter);
    device.queue.writeBuffer(buffers.params, 0, paramsData);

    const encoder = device.createCommandEncoder();

    // Multiple substeps per frame to achieve real-time simulation
    // With dt=0.001 and substeps=16, we get ~0.016s per frame (60 FPS = real-time)
    const substeps = 16;

    for (let step = 0; step < substeps; step++) {
      const posIn = currentPingPong ? buffers.positionsB : buffers.positionsA;
      const posOut = currentPingPong ? buffers.positionsA : buffers.positionsB;
      const velIn = currentPingPong ? buffers.velocitiesB : buffers.velocitiesA;
      const velOut = currentPingPong ? buffers.velocitiesA : buffers.velocitiesB;

      // Build spatial hash
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

      // Build hash
      const buildPass = encoder.beginComputePass();
      buildPass.setPipeline(hashPipelines.buildHash);
      buildPass.setBindGroup(0, hashBuildBindGroup);
      buildPass.dispatchWorkgroups(workgroups);
      buildPass.end();

      // Compute forces
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

      // Integrate
      const integratePass = encoder.beginComputePass();
      integratePass.setPipeline(integratePipeline);
      integratePass.setBindGroup(0, mainBindGroup);
      integratePass.dispatchWorkgroups(workgroups);
      integratePass.end();

      currentPingPong = !currentPingPong;
      simulationTimeRef.current += dt;
    }
    frameCountRef.current++;

    refs.current.pingPong = currentPingPong;

    // Copy to staging for readback
    const finalPosBuffer = currentPingPong ? buffers.positionsB : buffers.positionsA;
    const finalVelBuffer = currentPingPong ? buffers.velocitiesB : buffers.velocitiesA;

    const shouldReadback = !readbackInProgressRef.current;
    if (shouldReadback) {
      encoder.copyBufferToBuffer(finalPosBuffer, 0, buffers.stagingPositions, 0, config.particleCount * 16);
      encoder.copyBufferToBuffer(finalVelBuffer, 0, buffers.stagingVelocities, 0, config.particleCount * 16);
    }

    device.queue.submit([encoder.finish()]);

    setState((s) => ({ ...s, frame: frameCountRef.current, time: simulationTimeRef.current }));

    if (shouldReadback) {
      readbackInProgressRef.current = true;
      // Capture current mount version to check when readback completes
      const readbackMountVersion = mountVersionRef.current;

      Promise.all([
        buffers.stagingPositions.mapAsync(GPUMapMode.READ),
        buffers.stagingVelocities.mapAsync(GPUMapMode.READ),
      ]).then(() => {
        // CRITICAL: Only update state if we're still on the same mount
        // This prevents stale readbacks from overwriting fresh initial positions
        if (!isMountedRef.current || mountVersionRef.current !== readbackMountVersion) {
          // Component unmounted or remounted - discard this stale readback
          try {
            buffers.stagingPositions.unmap();
            buffers.stagingVelocities.unmap();
          } catch {
            // Buffer may already be destroyed
          }
          return;
        }

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

    // Increment mount version to invalidate any pending readbacks
    mountVersionRef.current += 1;

    const preset = GYROID_FLOW_PRESETS[config.preset] || GYROID_FLOW_PRESETS.default;
    const initialData = preset.generator(config.particleCount, config);

    uploadParticleData(device, buffers, initialData.positions, initialData.velocities);

    refs.current.pingPong = false;
    refs.current.frameCounter = 0;
    frameCountRef.current = 0;
    simulationTimeRef.current = 0;
    readbackInProgressRef.current = false;

    setPositions(new Float32Array(initialData.positions));
    setVelocities(new Float32Array(initialData.velocities));

    setState((s) => ({ ...s, frame: 0, time: 0 }));
  }, []);

  const updateConfig = useCallback((newConfig: Partial<GyroidFlowConfig>) => {
    const { device, buffers, config } = refs.current;

    refs.current.config = { ...config, ...newConfig };
    const updatedConfig = refs.current.config;

    if (device && buffers) {
      const paramsData = createParamsData(updatedConfig, refs.current.frameCounter);
      device.queue.writeBuffer(buffers.params, 0, paramsData);
    }
  }, [createParamsData]);

  const controls: GyroidFlowControls = {
    start,
    pause,
    toggle,
    reset,
    updateConfig,
  };

  return [state, controls, positions, velocities, refs.current.config];
}
