import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock WebGL context
const mockWebGLContext = {
  getParameter: vi.fn().mockReturnValue(4096),
  getExtension: vi.fn().mockReturnValue({}),
  createShader: vi.fn(),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  getShaderParameter: vi.fn().mockReturnValue(true),
  createProgram: vi.fn(),
  attachShader: vi.fn(),
  linkProgram: vi.fn(),
  getProgramParameter: vi.fn().mockReturnValue(true),
  useProgram: vi.fn(),
  createBuffer: vi.fn(),
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),
  createTexture: vi.fn(),
  bindTexture: vi.fn(),
  texImage2D: vi.fn(),
  texParameteri: vi.fn(),
  viewport: vi.fn(),
  clear: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  blendFunc: vi.fn(),
  depthFunc: vi.fn(),
  cullFace: vi.fn(),
  drawArrays: vi.fn(),
  drawElements: vi.fn(),
  deleteShader: vi.fn(),
  deleteProgram: vi.fn(),
  deleteBuffer: vi.fn(),
  deleteTexture: vi.fn(),
  getUniformLocation: vi.fn(),
  getAttribLocation: vi.fn(),
  enableVertexAttribArray: vi.fn(),
  vertexAttribPointer: vi.fn(),
  uniformMatrix4fv: vi.fn(),
  uniform1f: vi.fn(),
  uniform2f: vi.fn(),
  uniform3f: vi.fn(),
  uniform4f: vi.fn(),
  uniform1i: vi.fn(),
  MAX_TEXTURE_SIZE: 4096,
  TEXTURE_2D: 0x0DE1,
  ARRAY_BUFFER: 0x8892,
  ELEMENT_ARRAY_BUFFER: 0x8893,
};

// Mock canvas getContext
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (
  contextId: string,
  options?: unknown
) {
  if (contextId === 'webgl' || contextId === 'webgl2') {
    return mockWebGLContext as unknown as WebGLRenderingContext;
  }
  if (contextId === 'webgpu') {
    return null; // WebGPU needs explicit mocking per test
  }
  return originalGetContext.call(this, contextId, options);
} as typeof HTMLCanvasElement.prototype.getContext;

// Mock WebGPU (navigator.gpu)
const mockGPUAdapter = {
  requestDevice: vi.fn().mockResolvedValue({
    createShaderModule: vi.fn().mockReturnValue({}),
    createComputePipeline: vi.fn().mockReturnValue({}),
    createRenderPipeline: vi.fn().mockReturnValue({}),
    createBuffer: vi.fn().mockReturnValue({
      getMappedRange: vi.fn().mockReturnValue(new ArrayBuffer(1024)),
      unmap: vi.fn(),
      destroy: vi.fn(),
    }),
    createBindGroup: vi.fn().mockReturnValue({}),
    createBindGroupLayout: vi.fn().mockReturnValue({}),
    createPipelineLayout: vi.fn().mockReturnValue({}),
    createCommandEncoder: vi.fn().mockReturnValue({
      beginComputePass: vi.fn().mockReturnValue({
        setPipeline: vi.fn(),
        setBindGroup: vi.fn(),
        dispatchWorkgroups: vi.fn(),
        end: vi.fn(),
      }),
      beginRenderPass: vi.fn().mockReturnValue({
        setPipeline: vi.fn(),
        setBindGroup: vi.fn(),
        setVertexBuffer: vi.fn(),
        draw: vi.fn(),
        end: vi.fn(),
      }),
      copyBufferToBuffer: vi.fn(),
      finish: vi.fn().mockReturnValue({}),
    }),
    queue: {
      submit: vi.fn(),
      writeBuffer: vi.fn(),
    },
    destroy: vi.fn(),
  }),
  features: new Set(),
  limits: {},
};

Object.defineProperty(navigator, 'gpu', {
  writable: true,
  value: {
    requestAdapter: vi.fn().mockResolvedValue(mockGPUAdapter),
    getPreferredCanvasFormat: vi.fn().mockReturnValue('bgra8unorm'),
  },
});

// Mock GPUBufferUsage, GPUShaderStage, GPUMapMode (WebGPU constants)
(global as Record<string, unknown>).GPUBufferUsage = {
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

(global as Record<string, unknown>).GPUShaderStage = {
  VERTEX: 1,
  FRAGMENT: 2,
  COMPUTE: 4,
};

(global as Record<string, unknown>).GPUMapMode = {
  READ: 1,
  WRITE: 2,
};

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn().mockImplementation((callback: FrameRequestCallback) => {
  return setTimeout(() => callback(performance.now()), 16);
});

global.cancelAnimationFrame = vi.fn().mockImplementation((id: number) => {
  clearTimeout(id);
});

// Mock Three.js WebGLRenderer
vi.mock('three', async () => {
  const actual = await vi.importActual('three');
  return {
    ...actual,
    WebGLRenderer: vi.fn().mockImplementation(() => ({
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
      domElement: document.createElement('canvas'),
      shadowMap: { enabled: false, type: 0 },
      outputColorSpace: 'srgb',
      toneMapping: 0,
      toneMappingExposure: 1,
      getContext: vi.fn().mockReturnValue(mockWebGLContext),
      capabilities: { maxTextureSize: 4096 },
    })),
  };
});

// Mock Leva controls
vi.mock('leva', () => ({
  useControls: vi.fn().mockImplementation((name, config) => {
    // Return default values from config
    if (typeof config === 'object' && config !== null) {
      const defaults: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(config)) {
        if (typeof value === 'object' && value !== null && 'value' in value) {
          defaults[key] = (value as { value: unknown }).value;
        } else {
          defaults[key] = value;
        }
      }
      return defaults;
    }
    return {};
  }),
  Leva: () => null,
  folder: vi.fn().mockImplementation((config) => config),
  button: vi.fn(),
}));

// Suppress console errors/warnings in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // Suppress specific Three.js/WebGL warnings
    const message = args[0];
    if (
      typeof message === 'string' &&
      (message.includes('WebGL') ||
        message.includes('THREE') ||
        message.includes('R3F'))
    ) {
      return;
    }
    originalError.apply(console, args);
  };

  console.warn = (...args: unknown[]) => {
    const message = args[0];
    if (
      typeof message === 'string' &&
      (message.includes('WebGL') ||
        message.includes('THREE') ||
        message.includes('R3F'))
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});
