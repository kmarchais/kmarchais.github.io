/**
 * DEM Presets Tests
 *
 * Tests for DEM initial condition generators.
 */

import { describe, it, expect } from 'vitest';
import {
  DEM_PRESETS,
  DEM_PRESET_OPTIONS,
} from '../../src/components/projects/simulations/dem/demPresets';
import { DEMConfig } from '../../src/hooks/simulations/useDEMSimulation';

const DEFAULT_CONFIG: DEMConfig = {
  particleCount: 100,
  radiusDistribution: 'mono',
  radius: 0.1,
  radiusMin: 0.08,
  radiusMax: 0.12,
  radiusMean: 0.1,
  radiusStdDev: 0.01,
  stiffness: 50000,
  tangentialRatio: 0.4,
  dampingN: 100,
  dampingT: 50,
  friction: 0.5,
  restitution: 0.3,
  gravity: -9.81,
  dt: 0.001,
  preset: 'boxPacking',
  boxSize: [5, 8, 5],
};

describe('DEM Presets', () => {
  describe('DEM_PRESETS', () => {
    it('should have all expected presets', () => {
      expect(DEM_PRESETS).toHaveProperty('boxPacking');
      expect(DEM_PRESETS).toHaveProperty('drum');
    });

    it('should have matching DEM_PRESET_OPTIONS', () => {
      expect(Object.keys(DEM_PRESET_OPTIONS)).toEqual(Object.keys(DEM_PRESETS));
    });
  });

  describe.each(Object.keys(DEM_PRESETS))('%s preset', (key) => {
    const preset = DEM_PRESETS[key];

    it('generates count*4 positions and velocities', () => {
      const count = 100;
      const data = preset.generator(count, DEFAULT_CONFIG);
      expect(data.positions.length).toBe(count * 4);
      expect(data.velocities.length).toBe(count * 4);
    });

    it('starts with zero velocities', () => {
      const count = 50;
      const data = preset.generator(count, DEFAULT_CONFIG);
      for (let i = 0; i < count; i++) {
        expect(data.velocities[i * 4]).toBe(0);
        expect(data.velocities[i * 4 + 1]).toBe(0);
        expect(data.velocities[i * 4 + 2]).toBe(0);
      }
    });

    it('stores radius in positions.w', () => {
      const count = 50;
      const data = preset.generator(count, DEFAULT_CONFIG);
      for (let i = 0; i < count; i++) {
        expect(data.positions[i * 4 + 3]).toBeCloseTo(DEFAULT_CONFIG.radius, 5);
      }
    });

    it('produces finite positions and velocities', () => {
      const count = 100;
      const data = preset.generator(count, DEFAULT_CONFIG);
      for (let i = 0; i < count * 4; i++) {
        expect(isFinite(data.positions[i])).toBe(true);
        expect(isFinite(data.velocities[i])).toBe(true);
      }
    });
  });
});
