// N-Body shader source (imported as string)
export const nbodyShader = /* wgsl */ `
/**
 * N-Body Gravitational Simulation Compute Shader
 *
 * Implements direct O(N²) gravitational force summation with softening,
 * particle collisions, and Leapfrog integration for stable long-term evolution.
 */

// Simulation parameters
struct NBodyParams {
    particle_count: u32,     // Number of particles
    G: f32,                  // Gravitational constant
    softening: f32,          // Softening parameter (eps²)
    dt: f32,                 // Timestep
    bounds: f32,             // Boundary box half-size (0 = no bounds)
    damping: f32,            // Velocity damping at boundaries
    collision_radius: f32,   // Particle radius for collisions (0 = no collisions)
    collision_stiffness: f32, // Collision spring constant
    collision_damping: f32,  // Collision velocity damping (0-1)
    padding0: f32,
    padding1: f32,
    padding2: f32,
};

// Buffer bindings
@group(0) @binding(0) var<uniform> params: NBodyParams;
@group(0) @binding(1) var<storage, read> positions_in: array<vec4f>;
@group(0) @binding(2) var<storage, read> velocities_in: array<vec4f>;
@group(0) @binding(3) var<storage, read_write> positions_out: array<vec4f>;
@group(0) @binding(4) var<storage, read_write> velocities_out: array<vec4f>;
@group(0) @binding(5) var<storage, read_write> forces: array<vec4f>;

// Workgroup size
const WORKGROUP_SIZE: u32 = 256u;

/**
 * Compute gravitational forces and collision forces using direct summation
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn computeForces(@builtin(global_invocation_id) global_id: vec3u) {
    let i = global_id.x;
    if (i >= params.particle_count) {
        return;
    }

    let pos_i = positions_in[i].xyz;
    let vel_i = velocities_in[i].xyz;
    let mass_i = positions_in[i].w;

    var acceleration = vec3f(0.0);

    // Combined radius for collision detection (both particles have same radius)
    let collision_dist = params.collision_radius * 2.0;

    // Direct summation over all particles
    for (var j = 0u; j < params.particle_count; j++) {
        if (i == j) {
            continue;
        }

        let pos_j = positions_in[j].xyz;
        let vel_j = velocities_in[j].xyz;
        let mass_j = positions_in[j].w;

        // Vector from i to j
        let r = pos_j - pos_i;
        let dist_sq = dot(r, r);
        let dist = sqrt(dist_sq);

        // Gravitational acceleration with softening
        let r2_soft = dist_sq + params.softening;
        let inv_r3 = 1.0 / (r2_soft * sqrt(r2_soft));
        acceleration += params.G * mass_j * r * inv_r3;

        // Collision handling (when collision_radius > 0)
        if (params.collision_radius > 0.0 && dist < collision_dist && dist > 0.0001) {
            // Overlap amount
            let overlap = collision_dist - dist;

            // Normalized direction from i to j
            let n = r / dist;

            // Relative velocity (j relative to i)
            let rel_vel = vel_j - vel_i;
            let rel_vel_normal = dot(rel_vel, n);

            // Only apply if particles are approaching (rel_vel_normal < 0)
            // or always apply a spring force to separate them

            // Spring force (Hooke's law): F = -k * overlap
            // Applied as repulsive acceleration (away from j, so negative direction)
            let spring_accel = -params.collision_stiffness * overlap * n / mass_i;

            // Damping force: opposes relative motion along collision normal
            let damping_accel = -params.collision_damping * rel_vel_normal * n / mass_i;

            acceleration += spring_accel + damping_accel;
        }
    }

    forces[i] = vec4f(acceleration, 0.0);
}

/**
 * Leapfrog integration
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn integrate(@builtin(global_invocation_id) global_id: vec3u) {
    let i = global_id.x;
    if (i >= params.particle_count) {
        return;
    }

    let pos = positions_in[i];
    var vel = velocities_in[i].xyz;
    let acc = forces[i].xyz;

    // Update velocity (kick)
    vel += acc * params.dt;

    // Update position (drift)
    var new_pos = pos.xyz + vel * params.dt;

    // Apply boundary conditions if bounds > 0
    if (params.bounds > 0.0) {
        for (var axis = 0u; axis < 3u; axis++) {
            if (new_pos[axis] > params.bounds) {
                new_pos[axis] = params.bounds;
                vel[axis] = -vel[axis] * params.damping;
            } else if (new_pos[axis] < -params.bounds) {
                new_pos[axis] = -params.bounds;
                vel[axis] = -vel[axis] * params.damping;
            }
        }
    }

    positions_out[i] = vec4f(new_pos, pos.w);
    velocities_out[i] = vec4f(vel, 0.0);
}
`;

// Byte size of NBodyParams struct (12 floats = 48 bytes, aligned to 16)
export const NBODY_PARAMS_SIZE = 48;

// Create params buffer data
export function createNBodyParamsBuffer(
  particleCount: number,
  G: number,
  softening: number,
  dt: number,
  bounds: number,
  damping: number,
  collisionRadius: number = 0,
  collisionStiffness: number = 100,
  collisionDamping: number = 10
): ArrayBuffer {
  const buffer = new ArrayBuffer(NBODY_PARAMS_SIZE);
  const view = new DataView(buffer);

  view.setUint32(0, particleCount, true);    // particle_count
  view.setFloat32(4, G, true);               // G
  view.setFloat32(8, softening, true);       // softening
  view.setFloat32(12, dt, true);             // dt
  view.setFloat32(16, bounds, true);         // bounds
  view.setFloat32(20, damping, true);        // damping
  view.setFloat32(24, collisionRadius, true); // collision_radius
  view.setFloat32(28, collisionStiffness, true); // collision_stiffness
  view.setFloat32(32, collisionDamping, true); // collision_damping
  view.setFloat32(36, 0, true);              // padding0
  view.setFloat32(40, 0, true);              // padding1
  view.setFloat32(44, 0, true);              // padding2

  return buffer;
}
