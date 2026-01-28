import { describe, it, expect } from 'vitest';
import {
  vertexShader,
  fragmentShader,
  getFragmentShader,
  QUALITY_TIERS,
  SURFACE_INDEX,
  SURFACE_NAMES,
  COLORMAP_INDEX,
  COLORMAP_NAMES,
  defaultUniforms,
} from '@/components/projects/tpms/TPMSShader';

describe('TPMSShader Quality Tiers', () => {
  it('exports QUALITY_TIERS with low, medium, high', () => {
    expect(QUALITY_TIERS).toBeDefined();
    expect(QUALITY_TIERS.low).toBeDefined();
    expect(QUALITY_TIERS.medium).toBeDefined();
    expect(QUALITY_TIERS.high).toBeDefined();
  });

  it('low tier has 48 steps', () => {
    expect(QUALITY_TIERS.low.volSteps).toBe(48);
    expect(QUALITY_TIERS.low.surfSteps).toBe(48);
  });

  it('medium tier has 96 steps', () => {
    expect(QUALITY_TIERS.medium.volSteps).toBe(96);
    expect(QUALITY_TIERS.medium.surfSteps).toBe(96);
  });

  it('high tier has 128 steps', () => {
    expect(QUALITY_TIERS.high.volSteps).toBe(128);
    expect(QUALITY_TIERS.high.surfSteps).toBe(128);
  });

  it('each tier has a label', () => {
    expect(QUALITY_TIERS.low.label).toBe('Low (Mobile)');
    expect(QUALITY_TIERS.medium.label).toBe('Medium');
    expect(QUALITY_TIERS.high.label).toBe('High');
  });
});

describe('getFragmentShader', () => {
  it('returns a string containing GLSL code', () => {
    const shader = getFragmentShader();
    expect(typeof shader).toBe('string');
    expect(shader).toContain('gl_FragColor');
    expect(shader).toContain('void main()');
  });

  it('uses default 96 steps when called without arguments', () => {
    const shader = getFragmentShader();
    expect(shader).toContain('const int VOL_STEPS = 96');
    expect(shader).toContain('const int SURF_STEPS = 96');
  });

  it('injects custom step counts', () => {
    const shader = getFragmentShader(48, 48);
    expect(shader).toContain('const int VOL_STEPS = 48');
    expect(shader).toContain('const int SURF_STEPS = 48');
  });

  it('supports high quality step counts', () => {
    const shader = getFragmentShader(128, 128);
    expect(shader).toContain('const int VOL_STEPS = 128');
    expect(shader).toContain('const int SURF_STEPS = 128');
  });

  it('allows different vol and surf steps', () => {
    const shader = getFragmentShader(64, 32);
    expect(shader).toContain('const int VOL_STEPS = 64');
    expect(shader).toContain('const int SURF_STEPS = 32');
  });
});

describe('Backward-compatible exports', () => {
  it('fragmentShader is a valid GLSL string (backward compatible)', () => {
    expect(typeof fragmentShader).toBe('string');
    expect(fragmentShader).toContain('gl_FragColor');
    expect(fragmentShader).toContain('const int VOL_STEPS = 96');
  });

  it('vertexShader is a valid GLSL string', () => {
    expect(typeof vertexShader).toBe('string');
    expect(vertexShader).toContain('gl_Position');
  });
});

describe('Surface and colormap mappings', () => {
  it('exports 14 surface names', () => {
    expect(SURFACE_NAMES.length).toBe(14);
  });

  it('surface indices are sequential from 0 to 13', () => {
    const indices = Object.values(SURFACE_INDEX);
    for (let i = 0; i <= 13; i++) {
      expect(indices).toContain(i);
    }
  });

  it('exports 7 colormap names', () => {
    expect(COLORMAP_NAMES.length).toBe(7);
  });

  it('colormap indices are sequential from 0 to 6', () => {
    const indices = Object.values(COLORMAP_INDEX);
    for (let i = 0; i <= 6; i++) {
      expect(indices).toContain(i);
    }
  });

  it('Gyroid is surface index 0', () => {
    expect(SURFACE_INDEX['Gyroid']).toBe(0);
  });

  it('Blue-White-Red is colormap index 0', () => {
    expect(COLORMAP_INDEX['Blue-White-Red']).toBe(0);
  });
});

describe('Default uniforms', () => {
  it('has all expected uniform keys', () => {
    expect(defaultUniforms).toHaveProperty('uResolution');
    expect(defaultUniforms).toHaveProperty('uTime');
    expect(defaultUniforms).toHaveProperty('uFov');
    expect(defaultUniforms).toHaveProperty('uFrequency');
    expect(defaultUniforms).toHaveProperty('uScale');
    expect(defaultUniforms).toHaveProperty('uThickness');
    expect(defaultUniforms).toHaveProperty('uMorphFactor');
    expect(defaultUniforms).toHaveProperty('uMorphTarget');
  });

  it('has correct default values', () => {
    expect(defaultUniforms.uFrequency).toBe(2.0);
    expect(defaultUniforms.uScale).toBe(3.0);
    expect(defaultUniforms.uThickness).toBe(1.0);
    expect(defaultUniforms.uMorphFactor).toBe(0.0);
    expect(defaultUniforms.uRenderMode).toBe(1.0); // Surface mode
  });
});
