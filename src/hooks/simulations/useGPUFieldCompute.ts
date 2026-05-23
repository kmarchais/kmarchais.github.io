/**
 * GPU Field Computation Hook
 *
 * Computes density and velocity fields on a 3D grid using WebGPU.
 * Used for marching cubes mesh generation.
 */

import { useRef, useCallback, useEffect } from 'react';
import {
  fieldComputeShader,
  FIELD_COMPUTE_WORKGROUP_SIZE,
  FIELD_COMPUTE_PARAMS_SIZE,
  createFieldComputeParamsBuffer,
  FieldComputeParams,
} from '@/shaders/simulations/sph/fieldCompute';

export interface GPUFieldComputeConfig {
  gridResolution: number;
  smoothingRadius: number;
  bounds: {
    min: [number, number, number];
    max: [number, number, number];
  };
}

export interface GPUFieldResult {
  density: Float32Array;
  velocityX: Float32Array;
  velocityY: Float32Array;
  velocityZ: Float32Array;
}

interface FieldComputeRefs {
  device: GPUDevice | null;
  // Buffers
  paramsBuffer: GPUBuffer | null;
  densityFieldBuffer: GPUBuffer | null;
  velocityFieldXBuffer: GPUBuffer | null;
  velocityFieldYBuffer: GPUBuffer | null;
  velocityFieldZBuffer: GPUBuffer | null;
  stagingBuffer: GPUBuffer | null;
  // Pipelines
  computeFieldsPipeline: GPUComputePipeline | null;
  computeFieldsDirectPipeline: GPUComputePipeline | null;
  resetFieldsPipeline: GPUComputePipeline | null;
  // Bind group layouts
  mainBindGroupLayout: GPUBindGroupLayout | null;
  hashBindGroupLayout: GPUBindGroupLayout | null;
  // Current config
  gridResolution: number;
  totalCells: number;
}

/**
 * Hook for GPU-accelerated field computation
 */
export function useGPUFieldCompute(device: GPUDevice | null) {
  const refs = useRef<FieldComputeRefs>({
    device: null,
    paramsBuffer: null,
    densityFieldBuffer: null,
    velocityFieldXBuffer: null,
    velocityFieldYBuffer: null,
    velocityFieldZBuffer: null,
    stagingBuffer: null,
    computeFieldsPipeline: null,
    computeFieldsDirectPipeline: null,
    resetFieldsPipeline: null,
    mainBindGroupLayout: null,
    hashBindGroupLayout: null,
    gridResolution: 0,
    totalCells: 0,
  });

  // Initialize pipelines when device is available
  useEffect(() => {
    if (!device) return;

    refs.current.device = device;

    // Create bind group layouts
    const mainBindGroupLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 6, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      ],
      label: 'field_compute_main_bind_group_layout',
    });

    const hashBindGroupLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      ],
      label: 'field_compute_hash_bind_group_layout',
    });

    refs.current.mainBindGroupLayout = mainBindGroupLayout;
    refs.current.hashBindGroupLayout = hashBindGroupLayout;

    // Create pipeline layouts
    const combinedPipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [mainBindGroupLayout, hashBindGroupLayout],
      label: 'field_compute_combined_pipeline_layout',
    });

    const mainOnlyPipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [mainBindGroupLayout],
      label: 'field_compute_main_only_pipeline_layout',
    });

    // Create shader module
    const shaderModule = device.createShaderModule({
      code: fieldComputeShader,
      label: 'field_compute_shader',
    });

    // Create pipelines
    refs.current.computeFieldsPipeline = device.createComputePipeline({
      layout: combinedPipelineLayout,
      compute: {
        module: shaderModule,
        entryPoint: 'computeFields',
      },
      label: 'field_compute_pipeline',
    });

    refs.current.computeFieldsDirectPipeline = device.createComputePipeline({
      layout: mainOnlyPipelineLayout,
      compute: {
        module: shaderModule,
        entryPoint: 'computeFieldsDirect',
      },
      label: 'field_compute_direct_pipeline',
    });

    refs.current.resetFieldsPipeline = device.createComputePipeline({
      layout: mainOnlyPipelineLayout,
      compute: {
        module: shaderModule,
        entryPoint: 'resetFields',
      },
      label: 'field_reset_pipeline',
    });

    // Create params buffer
    refs.current.paramsBuffer = device.createBuffer({
      size: FIELD_COMPUTE_PARAMS_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: 'field_compute_params',
    });

    return () => {
      // Cleanup is handled by parent when device is destroyed
    };
  }, [device]);

  // Ensure field buffers are sized correctly
  const ensureBuffers = useCallback((gridResolution: number) => {
    const { device } = refs.current;
    if (!device) return false;

    const totalCells = gridResolution * gridResolution * gridResolution;

    if (refs.current.gridResolution === gridResolution && refs.current.densityFieldBuffer) {
      return true; // Buffers already correct size
    }

    // Destroy old buffers
    if (refs.current.densityFieldBuffer) refs.current.densityFieldBuffer.destroy();
    if (refs.current.velocityFieldXBuffer) refs.current.velocityFieldXBuffer.destroy();
    if (refs.current.velocityFieldYBuffer) refs.current.velocityFieldYBuffer.destroy();
    if (refs.current.velocityFieldZBuffer) refs.current.velocityFieldZBuffer.destroy();
    if (refs.current.stagingBuffer) refs.current.stagingBuffer.destroy();

    // Create new buffers
    const bufferSize = totalCells * 4; // f32 per cell

    refs.current.densityFieldBuffer = device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      label: 'density_field',
    });

    refs.current.velocityFieldXBuffer = device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      label: 'velocity_field_x',
    });

    refs.current.velocityFieldYBuffer = device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      label: 'velocity_field_y',
    });

    refs.current.velocityFieldZBuffer = device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      label: 'velocity_field_z',
    });

    // Staging buffer for readback (all 4 fields)
    refs.current.stagingBuffer = device.createBuffer({
      size: bufferSize * 4,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      label: 'field_staging',
    });

    refs.current.gridResolution = gridResolution;
    refs.current.totalCells = totalCells;

    return true;
  }, []);

  /**
   * Compute fields using spatial hash (efficient O(N + G³))
   */
  const computeFields = useCallback(async (
    config: GPUFieldComputeConfig,
    particleCount: number,
    positionsBuffer: GPUBuffer,
    velocitiesBuffer: GPUBuffer,
    hashParamsBuffer: GPUBuffer,
    cellOffsetsBuffer: GPUBuffer,
    sortedIndicesBuffer: GPUBuffer,
    cellIndicesBuffer: GPUBuffer
  ): Promise<GPUFieldResult | null> => {
    const {
      device,
      paramsBuffer,
      computeFieldsPipeline,
      mainBindGroupLayout,
      hashBindGroupLayout,
    } = refs.current;

    if (!device || !paramsBuffer || !computeFieldsPipeline || !mainBindGroupLayout || !hashBindGroupLayout) {
      return null;
    }

    // Ensure buffers are correct size
    if (!ensureBuffers(config.gridResolution)) {
      return null;
    }

    const {
      densityFieldBuffer,
      velocityFieldXBuffer,
      velocityFieldYBuffer,
      velocityFieldZBuffer,
      stagingBuffer,
      totalCells,
    } = refs.current;

    if (!densityFieldBuffer || !velocityFieldXBuffer || !velocityFieldYBuffer ||
        !velocityFieldZBuffer || !stagingBuffer) {
      return null;
    }

    // Update params
    const params: FieldComputeParams = {
      gridDimX: config.gridResolution,
      gridDimY: config.gridResolution,
      gridDimZ: config.gridResolution,
      gridMin: config.bounds.min,
      gridMax: config.bounds.max,
      smoothingRadius: config.smoothingRadius,
      particleCount,
    };
    device.queue.writeBuffer(paramsBuffer, 0, createFieldComputeParamsBuffer(params));

    // Create bind groups
    const mainBindGroup = device.createBindGroup({
      layout: mainBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: paramsBuffer } },
        { binding: 1, resource: { buffer: positionsBuffer } },
        { binding: 2, resource: { buffer: velocitiesBuffer } },
        { binding: 3, resource: { buffer: densityFieldBuffer } },
        { binding: 4, resource: { buffer: velocityFieldXBuffer } },
        { binding: 5, resource: { buffer: velocityFieldYBuffer } },
        { binding: 6, resource: { buffer: velocityFieldZBuffer } },
      ],
      label: 'field_compute_main_bind_group',
    });

    const hashBindGroup = device.createBindGroup({
      layout: hashBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: hashParamsBuffer } },
        { binding: 1, resource: { buffer: cellIndicesBuffer } },
        { binding: 2, resource: { buffer: cellOffsetsBuffer } },
        { binding: 3, resource: { buffer: sortedIndicesBuffer } },
      ],
      label: 'field_compute_hash_bind_group',
    });

    // Compute workgroup counts for 3D dispatch
    const wgSize = FIELD_COMPUTE_WORKGROUP_SIZE;
    const workgroupsX = Math.ceil(config.gridResolution / wgSize);
    const workgroupsY = Math.ceil(config.gridResolution / wgSize);
    const workgroupsZ = Math.ceil(config.gridResolution / wgSize);

    // Create command encoder
    const encoder = device.createCommandEncoder();

    // Dispatch compute shader
    const computePass = encoder.beginComputePass();
    computePass.setPipeline(computeFieldsPipeline);
    computePass.setBindGroup(0, mainBindGroup);
    computePass.setBindGroup(1, hashBindGroup);
    computePass.dispatchWorkgroups(workgroupsX, workgroupsY, workgroupsZ);
    computePass.end();

    // Copy results to staging buffer
    const bufferSize = totalCells * 4;
    encoder.copyBufferToBuffer(densityFieldBuffer, 0, stagingBuffer, 0, bufferSize);
    encoder.copyBufferToBuffer(velocityFieldXBuffer, 0, stagingBuffer, bufferSize, bufferSize);
    encoder.copyBufferToBuffer(velocityFieldYBuffer, 0, stagingBuffer, bufferSize * 2, bufferSize);
    encoder.copyBufferToBuffer(velocityFieldZBuffer, 0, stagingBuffer, bufferSize * 3, bufferSize);

    device.queue.submit([encoder.finish()]);

    // Read back results
    try {
      await stagingBuffer.mapAsync(GPUMapMode.READ);
      const data = new Float32Array(stagingBuffer.getMappedRange().slice(0));
      stagingBuffer.unmap();

      return {
        density: data.slice(0, totalCells),
        velocityX: data.slice(totalCells, totalCells * 2),
        velocityY: data.slice(totalCells * 2, totalCells * 3),
        velocityZ: data.slice(totalCells * 3, totalCells * 4),
      };
    } catch {
      return null;
    }
  }, [ensureBuffers]);

  /**
   * Compute fields without spatial hash (direct O(N×G³), fallback)
   */
  const computeFieldsDirect = useCallback(async (
    config: GPUFieldComputeConfig,
    particleCount: number,
    positionsBuffer: GPUBuffer,
    velocitiesBuffer: GPUBuffer
  ): Promise<GPUFieldResult | null> => {
    const {
      device,
      paramsBuffer,
      computeFieldsDirectPipeline,
      mainBindGroupLayout,
    } = refs.current;

    if (!device || !paramsBuffer || !computeFieldsDirectPipeline || !mainBindGroupLayout) {
      return null;
    }

    // Ensure buffers are correct size
    if (!ensureBuffers(config.gridResolution)) {
      return null;
    }

    const {
      densityFieldBuffer,
      velocityFieldXBuffer,
      velocityFieldYBuffer,
      velocityFieldZBuffer,
      stagingBuffer,
      totalCells,
    } = refs.current;

    if (!densityFieldBuffer || !velocityFieldXBuffer || !velocityFieldYBuffer ||
        !velocityFieldZBuffer || !stagingBuffer) {
      return null;
    }

    // Update params
    const params: FieldComputeParams = {
      gridDimX: config.gridResolution,
      gridDimY: config.gridResolution,
      gridDimZ: config.gridResolution,
      gridMin: config.bounds.min,
      gridMax: config.bounds.max,
      smoothingRadius: config.smoothingRadius,
      particleCount,
    };
    device.queue.writeBuffer(paramsBuffer, 0, createFieldComputeParamsBuffer(params));

    // Create bind group (no hash data needed)
    const mainBindGroup = device.createBindGroup({
      layout: mainBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: paramsBuffer } },
        { binding: 1, resource: { buffer: positionsBuffer } },
        { binding: 2, resource: { buffer: velocitiesBuffer } },
        { binding: 3, resource: { buffer: densityFieldBuffer } },
        { binding: 4, resource: { buffer: velocityFieldXBuffer } },
        { binding: 5, resource: { buffer: velocityFieldYBuffer } },
        { binding: 6, resource: { buffer: velocityFieldZBuffer } },
      ],
      label: 'field_compute_direct_bind_group',
    });

    // Compute workgroup counts
    const wgSize = FIELD_COMPUTE_WORKGROUP_SIZE;
    const workgroupsX = Math.ceil(config.gridResolution / wgSize);
    const workgroupsY = Math.ceil(config.gridResolution / wgSize);
    const workgroupsZ = Math.ceil(config.gridResolution / wgSize);

    // Create command encoder
    const encoder = device.createCommandEncoder();

    // Dispatch compute shader
    const computePass = encoder.beginComputePass();
    computePass.setPipeline(computeFieldsDirectPipeline);
    computePass.setBindGroup(0, mainBindGroup);
    computePass.dispatchWorkgroups(workgroupsX, workgroupsY, workgroupsZ);
    computePass.end();

    // Copy results to staging buffer
    const bufferSize = totalCells * 4;
    encoder.copyBufferToBuffer(densityFieldBuffer, 0, stagingBuffer, 0, bufferSize);
    encoder.copyBufferToBuffer(velocityFieldXBuffer, 0, stagingBuffer, bufferSize, bufferSize);
    encoder.copyBufferToBuffer(velocityFieldYBuffer, 0, stagingBuffer, bufferSize * 2, bufferSize);
    encoder.copyBufferToBuffer(velocityFieldZBuffer, 0, stagingBuffer, bufferSize * 3, bufferSize);

    device.queue.submit([encoder.finish()]);

    // Read back results
    try {
      await stagingBuffer.mapAsync(GPUMapMode.READ);
      const data = new Float32Array(stagingBuffer.getMappedRange().slice(0));
      stagingBuffer.unmap();

      return {
        density: data.slice(0, totalCells),
        velocityX: data.slice(totalCells, totalCells * 2),
        velocityY: data.slice(totalCells * 2, totalCells * 3),
        velocityZ: data.slice(totalCells * 3, totalCells * 4),
      };
    } catch {
      return null;
    }
  }, [ensureBuffers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refs.current.densityFieldBuffer) refs.current.densityFieldBuffer.destroy();
      if (refs.current.velocityFieldXBuffer) refs.current.velocityFieldXBuffer.destroy();
      if (refs.current.velocityFieldYBuffer) refs.current.velocityFieldYBuffer.destroy();
      if (refs.current.velocityFieldZBuffer) refs.current.velocityFieldZBuffer.destroy();
      if (refs.current.stagingBuffer) refs.current.stagingBuffer.destroy();
      if (refs.current.paramsBuffer) refs.current.paramsBuffer.destroy();
    };
  }, []);

  return {
    computeFields,
    computeFieldsDirect,
    isReady: !!refs.current.device && !!refs.current.computeFieldsPipeline,
  };
}
