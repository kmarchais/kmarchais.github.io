/**
 * GPU Capabilities Detection Utility
 *
 * Detects WebGPU and WebGL support, determines device capabilities,
 * and provides appropriate quality settings based on hardware.
 */

export interface GPUCapabilities {
  /** WebGPU is available and working */
  webgpu: boolean;
  /** WebGL2 is available */
  webgl2: boolean;
  /** WebGL1 is available (fallback) */
  webgl1: boolean;
  /** Performance tier based on capabilities */
  tier: 'high' | 'medium' | 'low';
  /** Maximum texture size supported */
  maxTextureSize: number;
  /** Device is mobile/tablet */
  isMobile: boolean;
  /** WebGPU adapter info (if available) */
  adapterInfo?: GPUAdapterInfo;
  /** Recommended settings based on capabilities */
  recommended: RecommendedSettings;
}

export interface RecommendedSettings {
  /** Max particles for simulations */
  maxParticles: number;
  /** Grid resolution for TPMS/marching cubes */
  gridResolution: number;
  /** Enable post-processing effects */
  enablePostProcessing: boolean;
  /** Shadow map size */
  shadowMapSize: number;
  /** Enable anti-aliasing */
  enableAA: boolean;
}

/**
 * Detects device type from user agent
 */
function detectMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Detects WebGL capabilities
 */
function detectWebGL(): { webgl2: boolean; webgl1: boolean; maxTextureSize: number } {
  if (typeof document === 'undefined') {
    return { webgl2: false, webgl1: false, maxTextureSize: 2048 };
  }

  const canvas = document.createElement('canvas');
  let maxTextureSize = 2048;

  // Try WebGL2 first
  const gl2 = canvas.getContext('webgl2');
  if (gl2) {
    maxTextureSize = gl2.getParameter(gl2.MAX_TEXTURE_SIZE) || 4096;
    return { webgl2: true, webgl1: true, maxTextureSize };
  }

  // Fallback to WebGL1
  const gl1 = canvas.getContext('webgl');
  if (gl1) {
    maxTextureSize = gl1.getParameter(gl1.MAX_TEXTURE_SIZE) || 2048;
    return { webgl2: false, webgl1: true, maxTextureSize };
  }

  return { webgl2: false, webgl1: false, maxTextureSize };
}

/**
 * Detects WebGPU support and capabilities
 */
async function detectWebGPU(): Promise<{
  supported: boolean;
  adapterInfo?: GPUAdapterInfo;
}> {
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
    console.log('[WebGPU] navigator.gpu not available');
    return { supported: false };
  }

  try {
    console.log('[WebGPU] Requesting adapter...');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      console.log('[WebGPU] No adapter returned');
      return { supported: false };
    }
    console.log('[WebGPU] Adapter obtained');

    // Try to get adapter info
    let adapterInfo: GPUAdapterInfo | undefined;
    if ('requestAdapterInfo' in adapter) {
      try {
        adapterInfo = await (adapter as GPUAdapter & {
          requestAdapterInfo: () => Promise<GPUAdapterInfo>;
        }).requestAdapterInfo();
        console.log('[WebGPU] Adapter info:', adapterInfo);
      } catch {
        // requestAdapterInfo not available
      }
    }

    // Verify we can actually create a device
    console.log('[WebGPU] Requesting device...');
    const device = await adapter.requestDevice();
    console.log('[WebGPU] Device created successfully');
    device.destroy();

    return { supported: true, adapterInfo };
  } catch (e) {
    console.error('[WebGPU] Detection failed:', e);
    return { supported: false };
  }
}

/**
 * Determines performance tier and recommended settings
 */
function determineSettings(
  webgpu: boolean,
  webgl2: boolean,
  isMobile: boolean,
  _maxTextureSize: number
): { tier: 'high' | 'medium' | 'low'; recommended: RecommendedSettings } {
  // High tier: WebGPU on desktop
  if (webgpu && !isMobile) {
    return {
      tier: 'high',
      recommended: {
        maxParticles: 1_000_000,
        gridResolution: 128,
        enablePostProcessing: true,
        shadowMapSize: 2048,
        enableAA: true,
      },
    };
  }

  // Medium tier: WebGL2 on desktop or WebGPU on mobile
  if ((webgl2 && !isMobile) || (webgpu && isMobile)) {
    return {
      tier: 'medium',
      recommended: {
        maxParticles: 100_000,
        gridResolution: 64,
        enablePostProcessing: true,
        shadowMapSize: 1024,
        enableAA: true,
      },
    };
  }

  // Low tier: Mobile WebGL2 or WebGL1
  return {
    tier: 'low',
    recommended: {
      maxParticles: 10_000,
      gridResolution: 32,
      enablePostProcessing: false,
      shadowMapSize: 512,
      enableAA: false,
    },
  };
}

/**
 * Main function to detect all GPU capabilities
 */
export async function detectGPUCapabilities(): Promise<GPUCapabilities> {
  const isMobile = detectMobile();
  const { webgl2, webgl1, maxTextureSize } = detectWebGL();
  const { supported: webgpu, adapterInfo } = await detectWebGPU();

  const { tier, recommended } = determineSettings(
    webgpu,
    webgl2,
    isMobile,
    maxTextureSize
  );

  return {
    webgpu,
    webgl2,
    webgl1,
    tier,
    maxTextureSize,
    isMobile,
    adapterInfo,
    recommended,
  };
}

// React hook for GPU capabilities
import { useState, useEffect } from 'react';

/**
 * React hook to detect GPU capabilities
 * Returns null while detecting, then the capabilities object
 */
export function useGPUCapabilities(): GPUCapabilities | null {
  const [capabilities, setCapabilities] = useState<GPUCapabilities | null>(null);

  useEffect(() => {
    let mounted = true;

    detectGPUCapabilities().then((caps) => {
      if (mounted) {
        setCapabilities(caps);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  return capabilities;
}

/**
 * Check if WebGPU compute is available (synchronous check)
 * For quick checks without full capability detection
 */
export function isWebGPUAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

/**
 * Get WebGPU device (async)
 * Returns null if WebGPU is not available
 * Requests higher limits for complex shaders (SPH needs 10 storage buffers)
 */
export async function getWebGPUDevice(): Promise<GPUDevice | null> {
  if (!isWebGPUAvailable()) {
    return null;
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return null;
    }

    // Check adapter limits and request higher if supported
    const adapterLimits = adapter.limits;
    const requiredLimits: Record<string, number> = {};

    // SPH simulation needs 10 storage buffers per shader stage
    if (adapterLimits.maxStorageBuffersPerShaderStage >= 10) {
      requiredLimits.maxStorageBuffersPerShaderStage = 10;
    }

    return await adapter.requestDevice({
      requiredLimits,
    });
  } catch {
    return null;
  }
}

/**
 * Get preferred canvas format for WebGPU
 */
export function getPreferredCanvasFormat(): GPUTextureFormat {
  if (!isWebGPUAvailable()) {
    return 'bgra8unorm';
  }
  return navigator.gpu.getPreferredCanvasFormat();
}
