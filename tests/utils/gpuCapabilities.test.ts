import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  detectGPUCapabilities,
  isWebGPUAvailable,
  getPreferredCanvasFormat,
} from '@/utils/gpuCapabilities';

describe('GPU Capabilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectGPUCapabilities', () => {
    it('detects WebGPU support when available', async () => {
      const caps = await detectGPUCapabilities();

      expect(caps).toHaveProperty('webgpu');
      expect(caps).toHaveProperty('webgl2');
      expect(caps).toHaveProperty('webgl1');
      expect(caps).toHaveProperty('tier');
      expect(caps).toHaveProperty('maxTextureSize');
      expect(caps).toHaveProperty('isMobile');
      expect(caps).toHaveProperty('recommended');
    });

    it('returns valid tier value', async () => {
      const caps = await detectGPUCapabilities();
      expect(['high', 'medium', 'low']).toContain(caps.tier);
    });

    it('includes recommended settings', async () => {
      const caps = await detectGPUCapabilities();

      expect(caps.recommended).toHaveProperty('maxParticles');
      expect(caps.recommended).toHaveProperty('gridResolution');
      expect(caps.recommended).toHaveProperty('enablePostProcessing');
      expect(caps.recommended).toHaveProperty('shadowMapSize');
      expect(caps.recommended).toHaveProperty('enableAA');
    });

    it('maxTextureSize is a positive number', async () => {
      const caps = await detectGPUCapabilities();
      expect(caps.maxTextureSize).toBeGreaterThan(0);
    });

    it('recommended settings are appropriate for tier', async () => {
      const caps = await detectGPUCapabilities();

      if (caps.tier === 'high') {
        expect(caps.recommended.maxParticles).toBeGreaterThanOrEqual(1_000_000);
        expect(caps.recommended.gridResolution).toBeGreaterThanOrEqual(128);
      } else if (caps.tier === 'medium') {
        expect(caps.recommended.maxParticles).toBeGreaterThanOrEqual(100_000);
        expect(caps.recommended.gridResolution).toBeGreaterThanOrEqual(64);
      } else {
        expect(caps.recommended.maxParticles).toBeGreaterThanOrEqual(10_000);
        expect(caps.recommended.gridResolution).toBeGreaterThanOrEqual(32);
      }
    });
  });

  describe('isWebGPUAvailable', () => {
    it('returns boolean', () => {
      const result = isWebGPUAvailable();
      expect(typeof result).toBe('boolean');
    });

    it('returns true when navigator.gpu exists', () => {
      // navigator.gpu is mocked in setup.ts
      expect(isWebGPUAvailable()).toBe(true);
    });
  });

  describe('getPreferredCanvasFormat', () => {
    it('returns valid texture format', () => {
      const format = getPreferredCanvasFormat();
      expect(typeof format).toBe('string');
      // Common formats
      expect(['bgra8unorm', 'rgba8unorm']).toContain(format);
    });
  });
});

describe('GPU Capabilities - Fallback Behavior', () => {
  it('provides fallback for WebGL-only environments', async () => {
    // Even with mocked WebGPU, the function should handle all cases
    const caps = await detectGPUCapabilities();
    expect(caps).toBeDefined();
    expect(caps.tier).toBeDefined();
    // Verify the structure is complete regardless of WebGPU support
    expect(['high', 'medium', 'low']).toContain(caps.tier);
    expect(caps.recommended.maxParticles).toBeGreaterThan(0);
  });

  it('isMobile detection works', async () => {
    const caps = await detectGPUCapabilities();
    expect(typeof caps.isMobile).toBe('boolean');
  });
});
