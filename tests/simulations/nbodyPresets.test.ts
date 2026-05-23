/**
 * N-Body Presets Tests
 *
 * Tests for initial condition generators.
 */

import { describe, it, expect } from 'vitest';
import {
  NBODY_PRESETS,
  PRESET_OPTIONS,
} from '../../src/components/projects/simulations/nbody/nbodyPresets';

describe('N-Body Presets', () => {
  describe('NBODY_PRESETS', () => {
    it('should have all expected presets', () => {
      expect(NBODY_PRESETS).toHaveProperty('uniform');
      expect(NBODY_PRESETS).toHaveProperty('disk');
      expect(NBODY_PRESETS).toHaveProperty('plummer');
      expect(NBODY_PRESETS).toHaveProperty('collision');
      expect(NBODY_PRESETS).toHaveProperty('solar');
      expect(NBODY_PRESETS).toHaveProperty('shell');
    });

    it('should have matching PRESET_OPTIONS', () => {
      expect(PRESET_OPTIONS).toEqual(Object.keys(NBODY_PRESETS));
    });
  });

  describe('Uniform Cube Preset', () => {
    it('should generate correct number of particles', () => {
      const count = 100;
      const data = NBODY_PRESETS.uniform.generator(count);

      expect(data.positions.length).toBe(count * 4); // vec4 per particle
      expect(data.velocities.length).toBe(count * 4);
    });

    it('should have zero initial velocities', () => {
      const count = 50;
      const data = NBODY_PRESETS.uniform.generator(count);

      for (let i = 0; i < count; i++) {
        expect(data.velocities[i * 4]).toBe(0);     // vx
        expect(data.velocities[i * 4 + 1]).toBe(0); // vy
        expect(data.velocities[i * 4 + 2]).toBe(0); // vz
      }
    });

    it('should have mass of 1.0 for all particles', () => {
      const count = 50;
      const data = NBODY_PRESETS.uniform.generator(count);

      for (let i = 0; i < count; i++) {
        expect(data.positions[i * 4 + 3]).toBe(1.0); // mass in w component
      }
    });

    it('should generate positions within bounds', () => {
      const count = 1000;
      const data = NBODY_PRESETS.uniform.generator(count);
      const halfSize = 5;

      for (let i = 0; i < count; i++) {
        const x = data.positions[i * 4];
        const y = data.positions[i * 4 + 1];
        const z = data.positions[i * 4 + 2];

        expect(x).toBeGreaterThanOrEqual(-halfSize);
        expect(x).toBeLessThanOrEqual(halfSize);
        expect(y).toBeGreaterThanOrEqual(-halfSize);
        expect(y).toBeLessThanOrEqual(halfSize);
        expect(z).toBeGreaterThanOrEqual(-halfSize);
        expect(z).toBeLessThanOrEqual(halfSize);
      }
    });
  });

  describe('Disk Preset', () => {
    it('should generate correct number of particles', () => {
      const count = 100;
      const data = NBODY_PRESETS.disk.generator(count);

      expect(data.positions.length).toBe(count * 4);
      expect(data.velocities.length).toBe(count * 4);
    });

    it('should have mostly planar positions (small z)', () => {
      const count = 500;
      const data = NBODY_PRESETS.disk.generator(count);
      const thickness = 0.5;

      for (let i = 0; i < count; i++) {
        const z = data.positions[i * 4 + 2];
        expect(Math.abs(z)).toBeLessThanOrEqual(thickness);
      }
    });

    it('should have tangential velocities', () => {
      const count = 100;
      const data = NBODY_PRESETS.disk.generator(count);

      // Most particles should have some velocity
      let hasVelocity = 0;
      for (let i = 0; i < count; i++) {
        const vx = data.velocities[i * 4];
        const vy = data.velocities[i * 4 + 1];
        const vMag = Math.sqrt(vx * vx + vy * vy);
        if (vMag > 0.01) hasVelocity++;
      }

      expect(hasVelocity).toBeGreaterThan(count * 0.5);
    });
  });

  describe('Plummer Sphere Preset', () => {
    it('should generate correct number of particles', () => {
      const count = 100;
      const data = NBODY_PRESETS.plummer.generator(count);

      expect(data.positions.length).toBe(count * 4);
      expect(data.velocities.length).toBe(count * 4);
    });

    it('should generate finite positions', () => {
      const count = 500;
      const data = NBODY_PRESETS.plummer.generator(count);

      for (let i = 0; i < count; i++) {
        expect(isFinite(data.positions[i * 4])).toBe(true);
        expect(isFinite(data.positions[i * 4 + 1])).toBe(true);
        expect(isFinite(data.positions[i * 4 + 2])).toBe(true);
      }
    });
  });

  describe('Two-Body Collision Preset', () => {
    it('should generate two clusters', () => {
      const count = 100;
      const data = NBODY_PRESETS.collision.generator(count);

      // Check that particles are in two groups
      let leftCount = 0;
      let rightCount = 0;

      for (let i = 0; i < count; i++) {
        const x = data.positions[i * 4];
        if (x < 0) leftCount++;
        else rightCount++;
      }

      // Both clusters should have particles
      expect(leftCount).toBeGreaterThan(0);
      expect(rightCount).toBeGreaterThan(0);
    });

    it('should have opposing velocities', () => {
      const count = 100;
      const data = NBODY_PRESETS.collision.generator(count);
      const halfCount = Math.floor(count / 2);

      // First cluster moves right (positive vx)
      let firstClusterVx = 0;
      for (let i = 0; i < halfCount; i++) {
        firstClusterVx += data.velocities[i * 4];
      }
      expect(firstClusterVx).toBeGreaterThan(0);

      // Second cluster moves left (negative vx)
      let secondClusterVx = 0;
      for (let i = halfCount; i < count; i++) {
        secondClusterVx += data.velocities[i * 4];
      }
      expect(secondClusterVx).toBeLessThan(0);
    });
  });

  describe('Solar System Preset', () => {
    it('should have a central massive body', () => {
      const count = 100;
      const data = NBODY_PRESETS.solar.generator(count);

      // First particle should have much larger mass
      const centralMass = data.positions[3]; // w component of first particle
      expect(centralMass).toBeGreaterThan(100);
    });

    it('should have central body at origin', () => {
      const count = 100;
      const data = NBODY_PRESETS.solar.generator(count);

      expect(data.positions[0]).toBe(0);
      expect(data.positions[1]).toBe(0);
      expect(data.positions[2]).toBe(0);
    });

    it('should have central body stationary', () => {
      const count = 100;
      const data = NBODY_PRESETS.solar.generator(count);

      expect(data.velocities[0]).toBe(0);
      expect(data.velocities[1]).toBe(0);
      expect(data.velocities[2]).toBe(0);
    });
  });

  describe('Expanding Shell Preset', () => {
    it('should have radial outward velocities', () => {
      const count = 100;
      const data = NBODY_PRESETS.shell.generator(count);

      for (let i = 0; i < count; i++) {
        const x = data.positions[i * 4];
        const y = data.positions[i * 4 + 1];
        const z = data.positions[i * 4 + 2];
        const vx = data.velocities[i * 4];
        const vy = data.velocities[i * 4 + 1];
        const vz = data.velocities[i * 4 + 2];

        // Velocity should point in same direction as position (outward)
        const posDotVel = x * vx + y * vy + z * vz;
        expect(posDotVel).toBeGreaterThan(0);
      }
    });
  });
});
