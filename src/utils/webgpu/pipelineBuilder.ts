/**
 * WebGPU Pipeline Builder
 *
 * Utilities for creating compute pipelines and bind groups
 * for particle simulations.
 */

export interface PipelineConfig {
  /** WGSL shader source code */
  shaderCode: string;
  /** Entry point function name */
  entryPoint: string;
  /** Bind group layout entries */
  bindGroupLayoutEntries: GPUBindGroupLayoutEntry[];
  /** Optional pipeline label */
  label?: string;
}

export interface ComputePipelineResult {
  pipeline: GPUComputePipeline;
  bindGroupLayout: GPUBindGroupLayout;
}

/**
 * Create a compute pipeline from shader code
 */
export async function createComputePipeline(
  device: GPUDevice,
  config: PipelineConfig
): Promise<ComputePipelineResult> {
  // Create shader module
  const shaderModule = device.createShaderModule({
    code: config.shaderCode,
    label: config.label ? `${config.label}_shader` : undefined,
  });

  // Create bind group layout
  const bindGroupLayout = device.createBindGroupLayout({
    entries: config.bindGroupLayoutEntries,
    label: config.label ? `${config.label}_layout` : undefined,
  });

  // Create pipeline layout
  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
    label: config.label ? `${config.label}_pipeline_layout` : undefined,
  });

  // Create compute pipeline
  const pipeline = device.createComputePipeline({
    layout: pipelineLayout,
    compute: {
      module: shaderModule,
      entryPoint: config.entryPoint,
    },
    label: config.label,
  });

  return { pipeline, bindGroupLayout };
}

/**
 * Create a bind group from buffer entries
 */
export function createBindGroup(
  device: GPUDevice,
  layout: GPUBindGroupLayout,
  entries: { binding: number; resource: GPUBindingResource }[],
  label?: string
): GPUBindGroup {
  return device.createBindGroup({
    layout,
    entries: entries.map((e) => ({
      binding: e.binding,
      resource: e.resource,
    })),
    label,
  });
}

/**
 * Standard bind group layout entry for uniform buffer
 */
export function uniformEntry(binding: number): GPUBindGroupLayoutEntry {
  return {
    binding,
    visibility: GPUShaderStage.COMPUTE,
    buffer: { type: 'uniform' },
  };
}

/**
 * Standard bind group layout entry for read-only storage buffer
 */
export function storageReadEntry(binding: number): GPUBindGroupLayoutEntry {
  return {
    binding,
    visibility: GPUShaderStage.COMPUTE,
    buffer: { type: 'read-only-storage' },
  };
}

/**
 * Standard bind group layout entry for read-write storage buffer
 */
export function storageReadWriteEntry(binding: number): GPUBindGroupLayoutEntry {
  return {
    binding,
    visibility: GPUShaderStage.COMPUTE,
    buffer: { type: 'storage' },
  };
}

/**
 * Encode and dispatch a compute pass
 */
export function dispatchCompute(
  device: GPUDevice,
  pipeline: GPUComputePipeline,
  bindGroup: GPUBindGroup,
  workgroupCounts: [number, number, number],
  label?: string
): void {
  const encoder = device.createCommandEncoder({ label });
  const pass = encoder.beginComputePass({ label });

  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(...workgroupCounts);
  pass.end();

  device.queue.submit([encoder.finish()]);
}

/**
 * Calculate workgroup count for 1D dispatch
 */
export function workgroupCount1D(totalItems: number, workgroupSize: number = 256): number {
  return Math.ceil(totalItems / workgroupSize);
}

/**
 * Calculate workgroup counts for 3D dispatch
 */
export function workgroupCount3D(
  dimensions: [number, number, number],
  workgroupSize: [number, number, number] = [8, 8, 8]
): [number, number, number] {
  return [
    Math.ceil(dimensions[0] / workgroupSize[0]),
    Math.ceil(dimensions[1] / workgroupSize[1]),
    Math.ceil(dimensions[2] / workgroupSize[2]),
  ];
}

/**
 * N-Body simulation bind group layout
 */
export function createNBodyBindGroupLayout(): GPUBindGroupLayoutEntry[] {
  return [
    uniformEntry(0),          // params
    storageReadEntry(1),      // positions_in
    storageReadEntry(2),      // velocities_in
    storageReadWriteEntry(3), // positions_out
    storageReadWriteEntry(4), // velocities_out
    storageReadWriteEntry(5), // forces
  ];
}

/**
 * DEM/SPH simulation bind group layout (with spatial hash)
 */
export function createSpatialSimBindGroupLayout(): GPUBindGroupLayoutEntry[] {
  return [
    uniformEntry(0),          // params
    storageReadEntry(1),      // positions_in
    storageReadEntry(2),      // velocities_in
    storageReadWriteEntry(3), // positions_out
    storageReadWriteEntry(4), // velocities_out
    storageReadWriteEntry(5), // forces
    storageReadEntry(6),      // cell_offsets
    storageReadEntry(7),      // sorted_indices
  ];
}

/**
 * Spatial hash compute bind group layout
 */
export function createSpatialHashBindGroupLayout(): GPUBindGroupLayoutEntry[] {
  return [
    uniformEntry(0),          // params
    storageReadEntry(1),      // positions
    storageReadWriteEntry(2), // cell_indices
    storageReadWriteEntry(3), // cell_counts
  ];
}
