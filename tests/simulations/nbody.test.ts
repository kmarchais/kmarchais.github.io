/**
 * N-Body Simulation Tests
 *
 * Tests for force calculation accuracy, softening, energy conservation,
 * and parameter buffer creation.
 */

import { describe, it, expect } from 'vitest';
import {
  NBODY_PARAMS_SIZE,
  createNBodyParamsBuffer,
} from '../../src/shaders/simulations/nbody';

/**
 * Reference implementation of gravitational force calculation
 * Mirrors the WGSL shader logic for testing
 */
function computeGravitationalAcceleration(
  positions: Float32Array,
  particleIndex: number,
  particleCount: number,
  G: number,
  softening: number
): [number, number, number] {
  const i = particleIndex;
  const posI = {
    x: positions[i * 4],
    y: positions[i * 4 + 1],
    z: positions[i * 4 + 2],
  };

  let ax = 0;
  let ay = 0;
  let az = 0;

  for (let j = 0; j < particleCount; j++) {
    if (i === j) continue;

    const posJ = {
      x: positions[j * 4],
      y: positions[j * 4 + 1],
      z: positions[j * 4 + 2],
    };
    const massJ = positions[j * 4 + 3];

    // Vector from i to j
    const rx = posJ.x - posI.x;
    const ry = posJ.y - posI.y;
    const rz = posJ.z - posI.z;

    // Distance squared with softening
    const r2 = rx * rx + ry * ry + rz * rz + softening;

    // Inverse distance cubed
    const invR3 = 1.0 / (r2 * Math.sqrt(r2));

    // Gravitational acceleration
    ax += G * massJ * rx * invR3;
    ay += G * massJ * ry * invR3;
    az += G * massJ * rz * invR3;
  }

  return [ax, ay, az];
}

/**
 * Reference implementation of Leapfrog integration
 */
function integrateLeapfrog(
  position: [number, number, number, number],
  velocity: [number, number, number],
  acceleration: [number, number, number],
  dt: number,
  bounds: number,
  damping: number
): { position: [number, number, number, number]; velocity: [number, number, number] } {
  // Kick: update velocity
  let vx = velocity[0] + acceleration[0] * dt;
  let vy = velocity[1] + acceleration[1] * dt;
  let vz = velocity[2] + acceleration[2] * dt;

  // Drift: update position
  let px = position[0] + vx * dt;
  let py = position[1] + vy * dt;
  let pz = position[2] + vz * dt;

  // Apply boundary conditions
  if (bounds > 0) {
    if (px > bounds) {
      px = bounds;
      vx = -vx * damping;
    } else if (px < -bounds) {
      px = -bounds;
      vx = -vx * damping;
    }

    if (py > bounds) {
      py = bounds;
      vy = -vy * damping;
    } else if (py < -bounds) {
      py = -bounds;
      vy = -vy * damping;
    }

    if (pz > bounds) {
      pz = bounds;
      vz = -vz * damping;
    } else if (pz < -bounds) {
      pz = -bounds;
      vz = -vz * damping;
    }
  }

  return {
    position: [px, py, pz, position[3]],
    velocity: [vx, vy, vz],
  };
}

/**
 * Calculate total kinetic energy
 */
function kineticEnergy(velocities: Float32Array, masses: Float32Array): number {
  let ke = 0;
  const count = velocities.length / 4;
  for (let i = 0; i < count; i++) {
    const vx = velocities[i * 4];
    const vy = velocities[i * 4 + 1];
    const vz = velocities[i * 4 + 2];
    const v2 = vx * vx + vy * vy + vz * vz;
    ke += 0.5 * masses[i] * v2;
  }
  return ke;
}

/**
 * Calculate total potential energy
 */
function potentialEnergy(
  positions: Float32Array,
  G: number,
  softening: number
): number {
  let pe = 0;
  const count = positions.length / 4;
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const rx = positions[j * 4] - positions[i * 4];
      const ry = positions[j * 4 + 1] - positions[i * 4 + 1];
      const rz = positions[j * 4 + 2] - positions[i * 4 + 2];
      const mi = positions[i * 4 + 3];
      const mj = positions[j * 4 + 3];
      const r = Math.sqrt(rx * rx + ry * ry + rz * rz + softening);
      pe -= G * mi * mj / r;
    }
  }
  return pe;
}

describe('N-Body Simulation', () => {
  describe('createNBodyParamsBuffer', () => {
    it('should create buffer with correct size', () => {
      const buffer = createNBodyParamsBuffer(1000, 0.5, 0.1, 0.01, 10, 0.8);
      expect(buffer.byteLength).toBe(NBODY_PARAMS_SIZE);
    });

    it('should pack parameters correctly', () => {
      const particleCount = 1234;
      const G = 0.5;
      const softening = 0.1;
      const dt = 0.01;
      const bounds = 10;
      const damping = 0.8;

      const buffer = createNBodyParamsBuffer(
        particleCount,
        G,
        softening,
        dt,
        bounds,
        damping
      );

      const view = new DataView(buffer);

      expect(view.getUint32(0, true)).toBe(particleCount);
      expect(view.getFloat32(4, true)).toBeCloseTo(G, 5);
      expect(view.getFloat32(8, true)).toBeCloseTo(softening, 5);
      expect(view.getFloat32(12, true)).toBeCloseTo(dt, 5);
      expect(view.getFloat32(16, true)).toBeCloseTo(bounds, 5);
      expect(view.getFloat32(20, true)).toBeCloseTo(damping, 5);
    });

    it('should handle edge case parameters', () => {
      // Zero bounds (unbounded)
      const buffer1 = createNBodyParamsBuffer(100, 1.0, 0.01, 0.001, 0, 1.0);
      const view1 = new DataView(buffer1);
      expect(view1.getFloat32(16, true)).toBe(0);

      // Very small softening
      const buffer2 = createNBodyParamsBuffer(100, 1.0, 0.0001, 0.01, 10, 0.5);
      const view2 = new DataView(buffer2);
      expect(view2.getFloat32(8, true)).toBeCloseTo(0.0001, 6);
    });
  });

  describe('Force Calculation', () => {
    it('should compute zero force for single particle', () => {
      const positions = new Float32Array([0, 0, 0, 1]); // Single particle at origin
      const [ax, ay, az] = computeGravitationalAcceleration(
        positions,
        0,
        1,
        1.0,
        0.01
      );

      expect(ax).toBe(0);
      expect(ay).toBe(0);
      expect(az).toBe(0);
    });

    it('should compute correct force for two-body system', () => {
      // Two particles on x-axis
      const positions = new Float32Array([
        -1, 0, 0, 1, // Particle 0 at (-1, 0, 0), mass 1
        1, 0, 0, 1, // Particle 1 at (1, 0, 0), mass 1
      ]);

      const G = 1.0;
      const softening = 0; // No softening for exact calculation

      // Force on particle 0 from particle 1
      const [ax0, ay0, az0] = computeGravitationalAcceleration(
        positions,
        0,
        2,
        G,
        softening
      );

      // Distance is 2, so r² = 4, r³ = 8
      // Acceleration should be G * m * r / r³ = 1 * 1 * 2 / 8 = 0.25
      expect(ax0).toBeCloseTo(0.25, 5);
      expect(ay0).toBeCloseTo(0, 5);
      expect(az0).toBeCloseTo(0, 5);

      // Force on particle 1 should be equal and opposite
      const [ax1, ay1, az1] = computeGravitationalAcceleration(
        positions,
        1,
        2,
        G,
        softening
      );

      expect(ax1).toBeCloseTo(-0.25, 5);
      expect(ay1).toBeCloseTo(0, 5);
      expect(az1).toBeCloseTo(0, 5);
    });

    it('should scale with gravitational constant', () => {
      const positions = new Float32Array([
        0, 0, 0, 1,
        1, 0, 0, 1,
      ]);

      const [ax1] = computeGravitationalAcceleration(positions, 0, 2, 1.0, 0);
      const [ax2] = computeGravitationalAcceleration(positions, 0, 2, 2.0, 0);

      expect(ax2).toBeCloseTo(ax1 * 2, 5);
    });

    it('should scale with mass', () => {
      const positions1 = new Float32Array([
        0, 0, 0, 1,
        1, 0, 0, 1, // Mass 1
      ]);

      const positions2 = new Float32Array([
        0, 0, 0, 1,
        1, 0, 0, 2, // Mass 2
      ]);

      const [ax1] = computeGravitationalAcceleration(positions1, 0, 2, 1.0, 0);
      const [ax2] = computeGravitationalAcceleration(positions2, 0, 2, 1.0, 0);

      expect(ax2).toBeCloseTo(ax1 * 2, 5);
    });

    it('should follow inverse square law', () => {
      const positions1 = new Float32Array([
        0, 0, 0, 1,
        1, 0, 0, 1, // Distance 1
      ]);

      const positions2 = new Float32Array([
        0, 0, 0, 1,
        2, 0, 0, 1, // Distance 2
      ]);

      const [ax1] = computeGravitationalAcceleration(positions1, 0, 2, 1.0, 0);
      const [ax2] = computeGravitationalAcceleration(positions2, 0, 2, 1.0, 0);

      // At double distance, force should be 1/4
      expect(ax2).toBeCloseTo(ax1 / 4, 5);
    });
  });

  describe('Softening', () => {
    it('should prevent singularity at zero distance', () => {
      // Two particles at same position (would be infinite force without softening)
      const positions = new Float32Array([
        0, 0, 0, 1,
        0, 0, 0, 1,
      ]);

      const softening = 0.1;
      const [ax, ay, az] = computeGravitationalAcceleration(
        positions,
        0,
        2,
        1.0,
        softening
      );

      // Should be finite, not NaN or Infinity
      expect(isFinite(ax)).toBe(true);
      expect(isFinite(ay)).toBe(true);
      expect(isFinite(az)).toBe(true);
    });

    it('should reduce force at small distances', () => {
      const positions = new Float32Array([
        0, 0, 0, 1,
        0.1, 0, 0, 1, // Very close
      ]);

      const noSoftening = computeGravitationalAcceleration(
        positions,
        0,
        2,
        1.0,
        0.0001
      );
      const withSoftening = computeGravitationalAcceleration(
        positions,
        0,
        2,
        1.0,
        0.1
      );

      // Force with softening should be smaller
      expect(Math.abs(withSoftening[0])).toBeLessThan(Math.abs(noSoftening[0]));
    });

    it('should have minimal effect at large distances', () => {
      const positions = new Float32Array([
        0, 0, 0, 1,
        10, 0, 0, 1, // Far away
      ]);

      const noSoftening = computeGravitationalAcceleration(
        positions,
        0,
        2,
        1.0,
        0
      );
      const withSoftening = computeGravitationalAcceleration(
        positions,
        0,
        2,
        1.0,
        0.01
      );

      // Forces should be nearly equal at large distances
      expect(withSoftening[0]).toBeCloseTo(noSoftening[0], 3);
    });
  });

  describe('Leapfrog Integration', () => {
    it('should update position based on velocity', () => {
      const position: [number, number, number, number] = [0, 0, 0, 1];
      const velocity: [number, number, number] = [1, 0, 0];
      const acceleration: [number, number, number] = [0, 0, 0];
      const dt = 0.1;

      const result = integrateLeapfrog(position, velocity, acceleration, dt, 0, 0);

      expect(result.position[0]).toBeCloseTo(0.1, 5);
      expect(result.position[1]).toBeCloseTo(0, 5);
      expect(result.position[2]).toBeCloseTo(0, 5);
      expect(result.position[3]).toBe(1); // Mass preserved
    });

    it('should update velocity based on acceleration', () => {
      const position: [number, number, number, number] = [0, 0, 0, 1];
      const velocity: [number, number, number] = [0, 0, 0];
      const acceleration: [number, number, number] = [1, 0, 0];
      const dt = 0.1;

      const result = integrateLeapfrog(position, velocity, acceleration, dt, 0, 0);

      expect(result.velocity[0]).toBeCloseTo(0.1, 5);
      expect(result.velocity[1]).toBeCloseTo(0, 5);
      expect(result.velocity[2]).toBeCloseTo(0, 5);
    });

    it('should reflect at boundaries with damping', () => {
      const position: [number, number, number, number] = [9.9, 0, 0, 1];
      const velocity: [number, number, number] = [2, 0, 0];
      const acceleration: [number, number, number] = [0, 0, 0];
      const dt = 0.1;
      const bounds = 10;
      const damping = 0.8;

      const result = integrateLeapfrog(
        position,
        velocity,
        acceleration,
        dt,
        bounds,
        damping
      );

      // Should be clamped to bounds
      expect(result.position[0]).toBe(bounds);
      // Velocity should be reversed and damped
      expect(result.velocity[0]).toBeLessThan(0);
      expect(Math.abs(result.velocity[0])).toBeCloseTo(2 * damping, 5);
    });

    it('should handle negative boundary correctly', () => {
      const position: [number, number, number, number] = [-9.9, 0, 0, 1];
      const velocity: [number, number, number] = [-2, 0, 0];
      const acceleration: [number, number, number] = [0, 0, 0];
      const dt = 0.1;
      const bounds = 10;
      const damping = 0.8;

      const result = integrateLeapfrog(
        position,
        velocity,
        acceleration,
        dt,
        bounds,
        damping
      );

      expect(result.position[0]).toBe(-bounds);
      expect(result.velocity[0]).toBeGreaterThan(0);
    });

    it('should not apply boundaries when bounds is 0', () => {
      const position: [number, number, number, number] = [100, 0, 0, 1];
      const velocity: [number, number, number] = [10, 0, 0];
      const acceleration: [number, number, number] = [0, 0, 0];
      const dt = 0.1;

      const result = integrateLeapfrog(position, velocity, acceleration, dt, 0, 0.8);

      // Should go beyond any boundary
      expect(result.position[0]).toBeCloseTo(101, 5);
      expect(result.velocity[0]).toBeCloseTo(10, 5);
    });
  });

  describe('Energy Conservation', () => {
    it('should compute kinetic energy correctly', () => {
      const velocities = new Float32Array([
        1, 0, 0, 0, // v = 1 in x
        0, 2, 0, 0, // v = 2 in y
      ]);
      const masses = new Float32Array([1, 1]);

      const ke = kineticEnergy(velocities, masses);

      // KE = 0.5 * m * v² = 0.5 * 1 * 1 + 0.5 * 1 * 4 = 2.5
      expect(ke).toBeCloseTo(2.5, 5);
    });

    it('should compute potential energy correctly', () => {
      const positions = new Float32Array([
        -1, 0, 0, 1,
        1, 0, 0, 1,
      ]);

      const pe = potentialEnergy(positions, 1.0, 0);

      // PE = -G * m1 * m2 / r = -1 * 1 * 1 / 2 = -0.5
      expect(pe).toBeCloseTo(-0.5, 5);
    });

    it('should approximately conserve energy in a two-body orbit', () => {
      // Simple two-body system with circular orbit initial conditions
      const G = 1.0;
      const softening = 0.001;
      const dt = 0.001;

      // Two equal masses at distance 2, with orbital velocities
      // For circular orbit: v = sqrt(G * M / r) where M is total mass
      const orbitalV = Math.sqrt(G * 1 / 2); // Reduced mass calculation

      let positions = new Float32Array([
        -1, 0, 0, 1,
        1, 0, 0, 1,
      ]);
      let velocities = new Float32Array([
        0, orbitalV, 0, 0,
        0, -orbitalV, 0, 0,
      ]);

      const masses = new Float32Array([positions[3], positions[7]]);
      const initialEnergy =
        kineticEnergy(velocities, masses) +
        potentialEnergy(positions, G, softening);

      // Simulate for a short time
      for (let step = 0; step < 100; step++) {
        // Compute accelerations
        const acc0 = computeGravitationalAcceleration(positions, 0, 2, G, softening);
        const acc1 = computeGravitationalAcceleration(positions, 1, 2, G, softening);

        // Integrate
        const result0 = integrateLeapfrog(
          [positions[0], positions[1], positions[2], positions[3]],
          [velocities[0], velocities[1], velocities[2]],
          acc0,
          dt,
          0,
          1
        );

        const result1 = integrateLeapfrog(
          [positions[4], positions[5], positions[6], positions[7]],
          [velocities[4], velocities[5], velocities[6]],
          acc1,
          dt,
          0,
          1
        );

        // Update arrays
        positions = new Float32Array([
          ...result0.position,
          ...result1.position,
        ]);
        velocities = new Float32Array([
          result0.velocity[0], result0.velocity[1], result0.velocity[2], 0,
          result1.velocity[0], result1.velocity[1], result1.velocity[2], 0,
        ]);
      }

      const finalEnergy =
        kineticEnergy(velocities, masses) +
        potentialEnergy(positions, G, softening);

      // Energy should be conserved within reasonable bounds for short simulations
      // Leapfrog integrator has some drift due to numerical precision
      const energyDrift = Math.abs(finalEnergy - initialEnergy) / Math.abs(initialEnergy);
      expect(energyDrift).toBeLessThan(0.15); // Less than 15% drift (acceptable for 100 steps)
    });
  });

  describe('Multi-Body Forces', () => {
    it('should sum forces from multiple particles', () => {
      // Particle 0 at origin, surrounded by 4 particles forming a square
      const positions = new Float32Array([
        0, 0, 0, 1, // Center particle
        1, 0, 0, 1, // Right
        -1, 0, 0, 1, // Left
        0, 1, 0, 1, // Top
        0, -1, 0, 1, // Bottom
      ]);

      const [ax, ay, az] = computeGravitationalAcceleration(
        positions,
        0,
        5,
        1.0,
        0
      );

      // Due to symmetry, net force should be zero
      expect(ax).toBeCloseTo(0, 5);
      expect(ay).toBeCloseTo(0, 5);
      expect(az).toBeCloseTo(0, 5);
    });

    it('should handle asymmetric mass distribution', () => {
      // Particle 0 at origin, one heavy particle to the right
      const positions = new Float32Array([
        0, 0, 0, 1,
        1, 0, 0, 10, // Heavy particle
        -1, 0, 0, 1, // Light particle
      ]);

      const [ax] = computeGravitationalAcceleration(
        positions,
        0,
        3,
        1.0,
        0
      );

      // Net force should be toward the heavy particle (positive x)
      expect(ax).toBeGreaterThan(0);
    });
  });
});
