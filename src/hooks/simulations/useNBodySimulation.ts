/**
 * N-Body Simulation Hook
 *
 * WebGPU-accelerated N-body gravitational simulation using direct summation.
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { getWebGPUDevice } from '@/utils/gpuCapabilities';
import {
  SimulationBuffers,
  createSimulationBuffers,
  uploadParticleData,
  readParticlePositions,
  readParticleVelocities,
  destroySimulationBuffers,
} from '@/utils/webgpu/bufferManager';
import {
  createComputePipeline,
  createBindGroup,
  workgroupCount1D,
  uniformEntry,
  storageReadEntry,
  storageReadWriteEntry,
} from '@/utils/webgpu/pipelineBuilder';
import {
  nbodyShader,
  NBODY_PARAMS_SIZE,
  createNBodyParamsBuffer,
} from '@/shaders/simulations/nbody';
import { NBODY_PRESETS } from '@/components/projects/simulations/nbody/nbodyPresets';

export interface NBodyConfig {
  /** Number of particles */
  particleCount: number;
  /** Gravitational constant */
  G: number;
  /** Softening parameter (prevents singularities) */
  softening: number;
  /** Time step */
  dt: number;
  /** Boundary box half-size (0 = no bounds) */
  bounds: number;
  /** Velocity damping at boundaries (0-1) */
  damping: number;
  /** Initial condition preset key */
  preset: string;
  /** Particle collision radius (0 = no collisions) */
  collisionRadius: number;
  /** Collision spring stiffness */
  collisionStiffness: number;
  /** Collision velocity damping */
  collisionDamping: number;
}

export interface NBodyState {
  /** Whether simulation is running */
  running: boolean;
  /** Current frame number */
  frame: number;
  /** Whether WebGPU is initialized */
  initialized: boolean;
  /** Error message if initialization failed */
  error: string | null;
}

export interface NBodyControls {
  /** Start the simulation */
  start: () => void;
  /** Pause the simulation */
  pause: () => void;
  /** Toggle running state */
  toggle: () => void;
  /** Reset with current preset */
  reset: () => void;
  /** Update simulation parameters */
  updateConfig: (config: Partial<NBodyConfig>) => void;
}

interface SimulationRefs {
  device: GPUDevice | null;
  buffers: SimulationBuffers | null;
  forcesPipeline: GPUComputePipeline | null;
  integratePipeline: GPUComputePipeline | null;
  bindGroupLayout: GPUBindGroupLayout | null;
  pingPong: boolean;
  config: NBodyConfig;
}

const DEFAULT_CONFIG: NBodyConfig = {
  particleCount: 1000,
  G: 0.5,
  softening: 0.1,
  dt: 0.01,
  bounds: 0,
  damping: 0.8,
  preset: 'plummer',
  collisionRadius: 0.1,
  collisionStiffness: 50,
  collisionDamping: 5,
};

// Workgroup size must match shader
const WORKGROUP_SIZE = 256;

/**
 * Hook for N-body gravitational simulation
 */
export function useNBodySimulation(
  initialConfig: Partial<NBodyConfig> = {}
): [NBodyState, NBodyControls, Float32Array | null, Float32Array | null] {
  const refs = useRef<SimulationRefs>({
    device: null,
    buffers: null,
    forcesPipeline: null,
    integratePipeline: null,
    bindGroupLayout: null,
    pingPong: false,
    config: { ...DEFAULT_CONFIG, ...initialConfig },
  });

  const [state, setState] = useState<NBodyState>({
    running: false,
    frame: 0,
    initialized: false,
    error: null,
  });

  // CPU-side data for rendering
  const [positions, setPositions] = useState<Float32Array | null>(null);
  const [velocities, setVelocities] = useState<Float32Array | null>(null);

  // Frame counter for periodic GPU readback
  const frameCountRef = useRef(0);
  // Gates concurrent readbacks: a new mapAsync must not race the previous one.
  const readbackInFlightRef = useRef(false);

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

        // Create buffers
        const buffers = createSimulationBuffers(
          device,
          config.particleCount,
          NBODY_PARAMS_SIZE
        );
        refs.current.buffers = buffers;

        // Generate initial particle data
        const preset = NBODY_PRESETS[config.preset] || NBODY_PRESETS.plummer;
        const initialData = preset.generator(config.particleCount);

        // Upload initial data
        uploadParticleData(device, buffers, initialData.positions, initialData.velocities);

        // Update params buffer
        const paramsData = createNBodyParamsBuffer(
          config.particleCount,
          config.G,
          config.softening,
          config.dt,
          config.bounds,
          config.damping,
          config.collisionRadius,
          config.collisionStiffness,
          config.collisionDamping
        );
        device.queue.writeBuffer(buffers.params, 0, paramsData);

        // Bind group layout
        const bindGroupLayoutEntries = [
          uniformEntry(0),          // params
          storageReadEntry(1),      // positions_in
          storageReadEntry(2),      // velocities_in
          storageReadWriteEntry(3), // positions_out
          storageReadWriteEntry(4), // velocities_out
          storageReadWriteEntry(5), // forces
        ];

        // Create pipelines
        const forcesPipeline = await createComputePipeline(device, {
          shaderCode: nbodyShader,
          entryPoint: 'computeForces',
          bindGroupLayoutEntries,
          label: 'nbody_forces',
        });

        const integratePipeline = await createComputePipeline(device, {
          shaderCode: nbodyShader,
          entryPoint: 'integrate',
          bindGroupLayoutEntries,
          label: 'nbody_integrate',
        });

        refs.current.forcesPipeline = forcesPipeline.pipeline;
        refs.current.integratePipeline = integratePipeline.pipeline;
        refs.current.bindGroupLayout = forcesPipeline.bindGroupLayout;

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
      if (refs.current.buffers) {
        destroySimulationBuffers(refs.current.buffers);
        refs.current.buffers = null;
      }
      refs.current.forcesPipeline = null;
      refs.current.integratePipeline = null;
      refs.current.bindGroupLayout = null;
      if (refs.current.device) {
        refs.current.device.destroy();
        refs.current.device = null;
      }
    };
  }, []);

  // Frame loop
  useFrame(() => {
    const {
      device,
      buffers,
      forcesPipeline,
      integratePipeline,
      bindGroupLayout,
      pingPong,
      config,
    } = refs.current;

    if (
      !device ||
      !buffers ||
      !forcesPipeline ||
      !integratePipeline ||
      !bindGroupLayout ||
      !state.running
    ) {
      return;
    }

    const workgroups = workgroupCount1D(config.particleCount, WORKGROUP_SIZE);

    // Select input/output buffers based on ping-pong state
    const posIn = pingPong ? buffers.positionsB : buffers.positionsA;
    const posOut = pingPong ? buffers.positionsA : buffers.positionsB;
    const velIn = pingPong ? buffers.velocitiesB : buffers.velocitiesA;
    const velOut = pingPong ? buffers.velocitiesA : buffers.velocitiesB;

    // Create bind group
    const bindGroup = createBindGroup(device, bindGroupLayout, [
      { binding: 0, resource: { buffer: buffers.params } },
      { binding: 1, resource: { buffer: posIn } },
      { binding: 2, resource: { buffer: velIn } },
      { binding: 3, resource: { buffer: posOut } },
      { binding: 4, resource: { buffer: velOut } },
      { binding: 5, resource: { buffer: buffers.forces } },
    ]);

    // Encode compute passes
    const encoder = device.createCommandEncoder();

    // Pass 1: Compute forces
    const forcesPass = encoder.beginComputePass();
    forcesPass.setPipeline(forcesPipeline);
    forcesPass.setBindGroup(0, bindGroup);
    forcesPass.dispatchWorkgroups(workgroups);
    forcesPass.end();

    // Pass 2: Integrate
    const integratePass = encoder.beginComputePass();
    integratePass.setPipeline(integratePipeline);
    integratePass.setBindGroup(0, bindGroup);
    integratePass.dispatchWorkgroups(workgroups);
    integratePass.end();

    // Copy to staging buffer for CPU readback (every N frames)
    frameCountRef.current++;
    if (frameCountRef.current % 2 === 0) {
      encoder.copyBufferToBuffer(
        posOut,
        0,
        buffers.stagingPositions,
        0,
        config.particleCount * 16
      );
      encoder.copyBufferToBuffer(
        velOut,
        0,
        buffers.stagingVelocities,
        0,
        config.particleCount * 16
      );
    }

    device.queue.submit([encoder.finish()]);

    // Toggle ping-pong
    refs.current.pingPong = !pingPong;

    // Read back positions/velocities (async, non-blocking). Skip if a
    // previous readback is still mapped — overlapping mapAsync calls on
    // the same staging buffer is a validation error.
    if (frameCountRef.current % 2 === 0 && !readbackInFlightRef.current) {
      readbackInFlightRef.current = true;
      Promise.all([
        readParticlePositions(device, posOut, buffers.stagingPositions, config.particleCount),
        readParticleVelocities(device, velOut, buffers.stagingVelocities, config.particleCount),
      ])
        .then(([pos, vel]) => {
          setPositions(pos);
          setVelocities(vel);
        })
        .finally(() => {
          readbackInFlightRef.current = false;
        });
    }

    // Increment frame counter
    setState((s) => ({ ...s, frame: s.frame + 1 }));
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
    const preset = NBODY_PRESETS[config.preset] || NBODY_PRESETS.plummer;
    const initialData = preset.generator(config.particleCount);

    // Upload to GPU
    uploadParticleData(device, buffers, initialData.positions, initialData.velocities);

    // Reset ping-pong state
    refs.current.pingPong = false;
    frameCountRef.current = 0;

    // Update CPU-side data
    setPositions(new Float32Array(initialData.positions));
    setVelocities(new Float32Array(initialData.velocities));

    // Reset frame counter
    setState((s) => ({ ...s, frame: 0 }));
  }, []);

  const updateConfig = useCallback((newConfig: Partial<NBodyConfig>) => {
    const { device, buffers, config } = refs.current;

    // Update stored config
    refs.current.config = { ...config, ...newConfig };
    const updatedConfig = refs.current.config;

    // If particle count changed, we need to reinitialize (not supported in this hook)
    // For now, just update the uniform buffer
    if (device && buffers) {
      const paramsData = createNBodyParamsBuffer(
        updatedConfig.particleCount,
        updatedConfig.G,
        updatedConfig.softening,
        updatedConfig.dt,
        updatedConfig.bounds,
        updatedConfig.damping,
        updatedConfig.collisionRadius,
        updatedConfig.collisionStiffness,
        updatedConfig.collisionDamping
      );
      device.queue.writeBuffer(buffers.params, 0, paramsData);
    }
  }, []);

  const controls: NBodyControls = {
    start,
    pause,
    toggle,
    reset,
    updateConfig,
  };

  return [state, controls, positions, velocities];
}
