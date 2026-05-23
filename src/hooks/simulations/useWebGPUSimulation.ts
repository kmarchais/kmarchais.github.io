/**
 * Base WebGPU Simulation Hook
 *
 * Provides common functionality for particle simulations including:
 * - Device initialization
 * - Buffer management
 * - Frame loop integration
 * - Cleanup on unmount
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
  ComputePipelineResult,
  createComputePipeline,
  createBindGroup,
  workgroupCount1D,
  PipelineConfig,
} from '@/utils/webgpu/pipelineBuilder';

export interface SimulationConfig {
  /** Number of particles */
  particleCount: number;
  /** Size of uniform params struct in bytes */
  paramsByteSize: number;
  /** WGSL shader source code */
  shaderCode: string;
  /** Shader entry points */
  entryPoints: {
    forces: string;
    integrate: string;
  };
  /** Bind group layout entries */
  bindGroupLayoutEntries: GPUBindGroupLayoutEntry[];
  /** Workgroup size for dispatch */
  workgroupSize?: number;
}

export interface ParticleData {
  /** Position data (Float32Array with vec4 per particle) */
  positions: Float32Array;
  /** Velocity data (Float32Array with vec4 per particle) */
  velocities: Float32Array;
}

export interface SimulationState {
  /** Whether simulation is running */
  running: boolean;
  /** Current frame number */
  frame: number;
  /** Whether WebGPU is initialized */
  initialized: boolean;
  /** Error message if initialization failed */
  error: string | null;
}

export interface SimulationControls {
  /** Start the simulation */
  start: () => void;
  /** Pause the simulation */
  pause: () => void;
  /** Reset with new initial conditions */
  reset: (data: ParticleData) => void;
  /** Update uniform parameters */
  updateParams: (params: ArrayBuffer) => void;
  /** Get current positions (async, triggers GPU readback) */
  getPositions: () => Promise<Float32Array | null>;
  /** Get current velocities (async, triggers GPU readback) */
  getVelocities: () => Promise<Float32Array | null>;
}

interface SimulationRefs {
  device: GPUDevice | null;
  buffers: SimulationBuffers | null;
  forcesPipeline: ComputePipelineResult | null;
  integratePipeline: ComputePipelineResult | null;
  pingPong: boolean;
}

/**
 * Base hook for WebGPU particle simulations
 *
 * Handles device initialization, buffer management, and frame loop integration.
 * Specific simulation types (N-Body, DEM, SPH) build on top of this.
 */
export function useWebGPUSimulation(
  config: SimulationConfig,
  initialData: ParticleData
): [SimulationState, SimulationControls, Float32Array | null, Float32Array | null] {
  const refs = useRef<SimulationRefs>({
    device: null,
    buffers: null,
    forcesPipeline: null,
    integratePipeline: null,
    pingPong: false,
  });

  const [state, setState] = useState<SimulationState>({
    running: false,
    frame: 0,
    initialized: false,
    error: null,
  });

  // CPU-side position/velocity data for rendering
  const [positions, setPositions] = useState<Float32Array | null>(null);
  const [velocities, setVelocities] = useState<Float32Array | null>(null);

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
          // Unmounted while waiting for adapter/device; the cleanup
          // function has nothing to destroy because refs were never set.
          device.destroy();
          return;
        }

        refs.current.device = device;

        // Create buffers
        const buffers = createSimulationBuffers(
          device,
          config.particleCount,
          config.paramsByteSize
        );
        refs.current.buffers = buffers;

        // Upload initial data
        uploadParticleData(device, buffers, initialData.positions, initialData.velocities);

        // Create force computation pipeline
        const forcesPipelineConfig: PipelineConfig = {
          shaderCode: config.shaderCode,
          entryPoint: config.entryPoints.forces,
          bindGroupLayoutEntries: config.bindGroupLayoutEntries,
          label: 'forces',
        };
        refs.current.forcesPipeline = await createComputePipeline(device, forcesPipelineConfig);

        // Create integration pipeline
        const integratePipelineConfig: PipelineConfig = {
          shaderCode: config.shaderCode,
          entryPoint: config.entryPoints.integrate,
          bindGroupLayoutEntries: config.bindGroupLayoutEntries,
          label: 'integrate',
        };
        refs.current.integratePipeline = await createComputePipeline(device, integratePipelineConfig);

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
      // Cleanup. Null out refs after destroy so a late-resolving init
      // promise or a re-fired cleanup cannot double-destroy.
      if (refs.current.buffers) {
        destroySimulationBuffers(refs.current.buffers);
        refs.current.buffers = null;
      }
      refs.current.forcesPipeline = null;
      refs.current.integratePipeline = null;
      if (refs.current.device) {
        refs.current.device.destroy();
        refs.current.device = null;
      }
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Frame loop - run simulation step
  useFrame(() => {
    const { device, buffers, forcesPipeline, integratePipeline, pingPong } = refs.current;

    if (!device || !buffers || !forcesPipeline || !integratePipeline || !state.running) {
      return;
    }

    const workgroups = workgroupCount1D(config.particleCount, config.workgroupSize || 256);

    // Select input/output buffers based on ping-pong state
    const posIn = pingPong ? buffers.positionsB : buffers.positionsA;
    const posOut = pingPong ? buffers.positionsA : buffers.positionsB;
    const velIn = pingPong ? buffers.velocitiesB : buffers.velocitiesA;
    const velOut = pingPong ? buffers.velocitiesA : buffers.velocitiesB;

    // Create bind groups for this frame
    const forcesBindGroup = createBindGroup(
      device,
      forcesPipeline.bindGroupLayout,
      [
        { binding: 0, resource: { buffer: buffers.params } },
        { binding: 1, resource: { buffer: posIn } },
        { binding: 2, resource: { buffer: velIn } },
        { binding: 3, resource: { buffer: posOut } },
        { binding: 4, resource: { buffer: velOut } },
        { binding: 5, resource: { buffer: buffers.forces } },
      ]
    );

    const integrateBindGroup = createBindGroup(
      device,
      integratePipeline.bindGroupLayout,
      [
        { binding: 0, resource: { buffer: buffers.params } },
        { binding: 1, resource: { buffer: posIn } },
        { binding: 2, resource: { buffer: velIn } },
        { binding: 3, resource: { buffer: posOut } },
        { binding: 4, resource: { buffer: velOut } },
        { binding: 5, resource: { buffer: buffers.forces } },
      ]
    );

    // Encode compute passes
    const encoder = device.createCommandEncoder();

    // Pass 1: Compute forces
    const forcesPass = encoder.beginComputePass();
    forcesPass.setPipeline(forcesPipeline.pipeline);
    forcesPass.setBindGroup(0, forcesBindGroup);
    forcesPass.dispatchWorkgroups(workgroups);
    forcesPass.end();

    // Pass 2: Integrate
    const integratePass = encoder.beginComputePass();
    integratePass.setPipeline(integratePipeline.pipeline);
    integratePass.setBindGroup(0, integrateBindGroup);
    integratePass.dispatchWorkgroups(workgroups);
    integratePass.end();

    // Submit
    device.queue.submit([encoder.finish()]);

    // Toggle ping-pong
    refs.current.pingPong = !pingPong;

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

  const reset = useCallback(
    (data: ParticleData) => {
      const { device, buffers } = refs.current;
      if (!device || !buffers) return;

      uploadParticleData(device, buffers, data.positions, data.velocities);
      refs.current.pingPong = false;
      setPositions(new Float32Array(data.positions));
      setVelocities(new Float32Array(data.velocities));
      setState((s) => ({ ...s, frame: 0 }));
    },
    []
  );

  const updateParams = useCallback((params: ArrayBuffer) => {
    const { device, buffers } = refs.current;
    if (!device || !buffers) return;
    device.queue.writeBuffer(buffers.params, 0, params);
  }, []);

  const getPositions = useCallback(async (): Promise<Float32Array | null> => {
    const { device, buffers, pingPong } = refs.current;
    if (!device || !buffers) return null;

    const currentBuffer = pingPong ? buffers.positionsB : buffers.positionsA;
    const data = await readParticlePositions(
      device,
      currentBuffer,
      buffers.stagingPositions,
      config.particleCount
    );
    setPositions(data);
    return data;
  }, [config.particleCount]);

  const getVelocities = useCallback(async (): Promise<Float32Array | null> => {
    const { device, buffers, pingPong } = refs.current;
    if (!device || !buffers) return null;

    const currentBuffer = pingPong ? buffers.velocitiesB : buffers.velocitiesA;
    const data = await readParticleVelocities(
      device,
      currentBuffer,
      buffers.stagingVelocities,
      config.particleCount
    );
    setVelocities(data);
    return data;
  }, [config.particleCount]);

  const controls: SimulationControls = {
    start,
    pause,
    reset,
    updateParams,
    getPositions,
    getVelocities,
  };

  return [state, controls, positions, velocities];
}
