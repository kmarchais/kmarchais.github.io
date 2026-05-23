/**
 * SPH Presets Tests
 *
 * Tests for SPH initial condition generators.
 */

import { describe, it, expect } from 'vitest';
import {
  SPH_PRESETS,
  SPH_PRESET_OPTIONS,
} from '../../src/components/projects/simulations/sph/sphPresets';
import { SPHConfig } from '../../src/hooks/simulations/useSPHSimulation';

const DEFAULT_CONFIG: SPHConfig = {
  particleCount: 500,
  smoothingLength: 0.2,
  restDensity: 1000,
  stiffness: 500,
  viscosity: 0.1,
  particleMass: 0.02,
  gravity: -9.81,
  dt: 0.002,
  preset: 'damBreak',
  boxSize: [4, 6, 4],
};

describe('SPH Presets', () => {
  describe('SPH_PRESETS', () => {
    it('should have all expected presets', () => {
      expect(SPH_PRESETS).toHaveProperty('damBreak');
      expect(SPH_PRESETS).toHaveProperty('droplet');
      expect(SPH_PRESETS).toHaveProperty('doubleDam');
      expect(SPH_PRESETS).toHaveProperty('waterfall');
      expect(SPH_PRESETS).toHaveProperty('cube');
      expect(SPH_PRESETS).toHaveProperty('wave');
    });

    it('should have matching SPH_PRESET_OPTIONS', () => {
      expect(Object.keys(SPH_PRESET_OPTIONS)).toEqual(Object.keys(SPH_PRESETS));
    });
  });

  describe('Dam Break Preset', () => {
    it('should generate correct number of particles', () => {
      const count = 500;
      const data = SPH_PRESETS.damBreak.generator(count, DEFAULT_CONFIG);

      expect(data.positions.length).toBe(count * 4); // vec4 per particle
      expect(data.velocities.length).toBe(count * 4);
    });

    it('should have zero initial velocities', () => {
      const count = 100;
      const data = SPH_PRESETS.damBreak.generator(count, DEFAULT_CONFIG);

      for (let i = 0; i < count; i++) {
        expect(data.velocities[i * 4]).toBe(0);     // vx
        expect(data.velocities[i * 4 + 1]).toBe(0); // vy
        expect(data.velocities[i * 4 + 2]).toBe(0); // vz
      }
    });

    it('should store reference scale 1.0 in positions.w', () => {
      const count = 100;
      const data = SPH_PRESETS.damBreak.generator(count, DEFAULT_CONFIG);

      for (let i = 0; i < count; i++) {
        expect(data.positions[i * 4 + 3]).toBeCloseTo(1.0, 5);
      }
    });

    it('should position particles on left side of box', () => {
      const count = 500;
      const config = { ...DEFAULT_CONFIG };
      const data = SPH_PRESETS.damBreak.generator(count, config);
      const halfBoxX = config.boxSize[0] / 2;

      // Most particles should be on the left side
      let leftCount = 0;
      for (let i = 0; i < count; i++) {
        const x = data.positions[i * 4];
        if (x < 0) leftCount++;
      }

      expect(leftCount).toBeGreaterThan(count * 0.5);
    });
  });

  describe('Droplet Preset', () => {
    it('should generate correct number of particles', () => {
      const count = 200;
      const data = SPH_PRESETS.droplet.generator(count, DEFAULT_CONFIG);

      expect(data.positions.length).toBe(count * 4);
      expect(data.velocities.length).toBe(count * 4);
    });

    it('should have downward initial velocity', () => {
      const count = 100;
      const data = SPH_PRESETS.droplet.generator(count, DEFAULT_CONFIG);

      for (let i = 0; i < count; i++) {
        expect(data.velocities[i * 4 + 1]).toBeLessThan(0); // vy should be negative
      }
    });

    it('should position particles in upper region', () => {
      const count = 200;
      const config = { ...DEFAULT_CONFIG };
      const data = SPH_PRESETS.droplet.generator(count, config);
      const centerY = config.boxSize[1] * 0.5;

      // Most particles should be above center
      let aboveCenter = 0;
      for (let i = 0; i < count; i++) {
        const y = data.positions[i * 4 + 1];
        if (y > centerY) aboveCenter++;
      }

      expect(aboveCenter).toBeGreaterThan(count * 0.5);
    });
  });

  describe('Double Dam Preset', () => {
    it('should generate correct number of particles', () => {
      const count = 500;
      const data = SPH_PRESETS.doubleDam.generator(count, DEFAULT_CONFIG);

      expect(data.positions.length).toBe(count * 4);
      expect(data.velocities.length).toBe(count * 4);
    });

    it('should have particles on both sides', () => {
      const count = 500;
      const data = SPH_PRESETS.doubleDam.generator(count, DEFAULT_CONFIG);

      let leftCount = 0;
      let rightCount = 0;

      for (let i = 0; i < count; i++) {
        const x = data.positions[i * 4];
        if (x < 0) leftCount++;
        else rightCount++;
      }

      // Both sides should have particles
      expect(leftCount).toBeGreaterThan(count * 0.2);
      expect(rightCount).toBeGreaterThan(count * 0.2);
    });

    it('should have zero initial velocities', () => {
      const count = 100;
      const data = SPH_PRESETS.doubleDam.generator(count, DEFAULT_CONFIG);

      for (let i = 0; i < count; i++) {
        expect(data.velocities[i * 4]).toBe(0);
        expect(data.velocities[i * 4 + 1]).toBe(0);
        expect(data.velocities[i * 4 + 2]).toBe(0);
      }
    });
  });

  describe('Waterfall Preset', () => {
    it('should generate correct number of particles', () => {
      const count = 300;
      const data = SPH_PRESETS.waterfall.generator(count, DEFAULT_CONFIG);

      expect(data.positions.length).toBe(count * 4);
      expect(data.velocities.length).toBe(count * 4);
    });

    it('should have downward initial velocity', () => {
      const count = 100;
      const data = SPH_PRESETS.waterfall.generator(count, DEFAULT_CONFIG);

      for (let i = 0; i < count; i++) {
        expect(data.velocities[i * 4 + 1]).toBeLessThan(0);
      }
    });
  });

  describe('Cube Preset', () => {
    it('should generate correct number of particles', () => {
      const count = 200;
      const data = SPH_PRESETS.cube.generator(count, DEFAULT_CONFIG);

      expect(data.positions.length).toBe(count * 4);
      expect(data.velocities.length).toBe(count * 4);
    });

    it('should have zero initial velocities', () => {
      const count = 100;
      const data = SPH_PRESETS.cube.generator(count, DEFAULT_CONFIG);

      for (let i = 0; i < count; i++) {
        expect(data.velocities[i * 4]).toBe(0);
        expect(data.velocities[i * 4 + 1]).toBe(0);
        expect(data.velocities[i * 4 + 2]).toBe(0);
      }
    });

    it('should center particles around origin in xz plane', () => {
      const count = 500;
      const data = SPH_PRESETS.cube.generator(count, DEFAULT_CONFIG);

      // Average position should be near origin in xz
      let avgX = 0, avgZ = 0;
      for (let i = 0; i < count; i++) {
        avgX += data.positions[i * 4];
        avgZ += data.positions[i * 4 + 2];
      }
      avgX /= count;
      avgZ /= count;

      expect(Math.abs(avgX)).toBeLessThan(0.5);
      expect(Math.abs(avgZ)).toBeLessThan(0.5);
    });
  });

  describe('Wave Pool Preset', () => {
    it('should generate correct number of particles', () => {
      const count = 500;
      const data = SPH_PRESETS.wave.generator(count, DEFAULT_CONFIG);

      expect(data.positions.length).toBe(count * 4);
      expect(data.velocities.length).toBe(count * 4);
    });

    it('should have some non-zero horizontal velocities', () => {
      const count = 500;
      const data = SPH_PRESETS.wave.generator(count, DEFAULT_CONFIG);

      let hasHorizontalVelocity = 0;
      for (let i = 0; i < count; i++) {
        const vx = data.velocities[i * 4];
        if (Math.abs(vx) > 0.1) hasHorizontalVelocity++;
      }

      expect(hasHorizontalVelocity).toBeGreaterThan(count * 0.3);
    });

    it('should position particles near floor', () => {
      const count = 500;
      const config = { ...DEFAULT_CONFIG };
      const data = SPH_PRESETS.wave.generator(count, config);

      // All particles should be in lower half
      for (let i = 0; i < count; i++) {
        const y = data.positions[i * 4 + 1];
        expect(y).toBeLessThan(config.boxSize[1] * 0.5);
      }
    });
  });

  describe('All Presets', () => {
    it('should generate finite positions for all presets', () => {
      const count = 200;

      Object.keys(SPH_PRESETS).forEach((presetKey) => {
        const preset = SPH_PRESETS[presetKey];
        const data = preset.generator(count, DEFAULT_CONFIG);

        for (let i = 0; i < count; i++) {
          expect(isFinite(data.positions[i * 4])).toBe(true);
          expect(isFinite(data.positions[i * 4 + 1])).toBe(true);
          expect(isFinite(data.positions[i * 4 + 2])).toBe(true);
          expect(isFinite(data.positions[i * 4 + 3])).toBe(true);
        }
      });
    });

    it('should generate finite velocities for all presets', () => {
      const count = 200;

      Object.keys(SPH_PRESETS).forEach((presetKey) => {
        const preset = SPH_PRESETS[presetKey];
        const data = preset.generator(count, DEFAULT_CONFIG);

        for (let i = 0; i < count; i++) {
          expect(isFinite(data.velocities[i * 4])).toBe(true);
          expect(isFinite(data.velocities[i * 4 + 1])).toBe(true);
          expect(isFinite(data.velocities[i * 4 + 2])).toBe(true);
        }
      });
    });

    it('should have name and description for all presets', () => {
      Object.keys(SPH_PRESETS).forEach((presetKey) => {
        const preset = SPH_PRESETS[presetKey];
        expect(typeof preset.name).toBe('string');
        expect(preset.name.length).toBeGreaterThan(0);
        expect(typeof preset.description).toBe('string');
        expect(preset.description.length).toBeGreaterThan(0);
      });
    });

    it('should generate particles within box bounds', () => {
      const count = 500;
      const config = { ...DEFAULT_CONFIG };
      const halfX = config.boxSize[0] / 2;
      const halfZ = config.boxSize[2] / 2;

      Object.keys(SPH_PRESETS).forEach((presetKey) => {
        const preset = SPH_PRESETS[presetKey];
        const data = preset.generator(count, config);

        for (let i = 0; i < count; i++) {
          const x = data.positions[i * 4];
          const y = data.positions[i * 4 + 1];
          const z = data.positions[i * 4 + 2];

          // Allow some tolerance for particles near edges
          expect(x).toBeGreaterThanOrEqual(-halfX - 0.5);
          expect(x).toBeLessThanOrEqual(halfX + 0.5);
          expect(y).toBeGreaterThanOrEqual(-0.5);
          expect(y).toBeLessThanOrEqual(config.boxSize[1] + 0.5);
          expect(z).toBeGreaterThanOrEqual(-halfZ - 0.5);
          expect(z).toBeLessThanOrEqual(halfZ + 0.5);
        }
      });
    });
  });
});
