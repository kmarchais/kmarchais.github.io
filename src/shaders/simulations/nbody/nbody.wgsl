/**
 * N-Body Gravitational Simulation Compute Shader
 *
 * Implements direct O(N²) gravitational force summation with softening
 * and Leapfrog integration for stable long-term evolution.
 */

// Simulation parameters
struct NBodyParams {
    particle_count: u32,     // Number of particles
    G: f32,                  // Gravitational constant
    softening: f32,          // Softening parameter (eps²)
    dt: f32,                 // Timestep
    bounds: f32,             // Boundary box half-size (0 = no bounds)
    damping: f32,            // Velocity damping at boundaries
    padding0: f32,
    padding1: f32,
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
 * Compute gravitational forces using direct summation
 *
 * For each particle i, sum forces from all other particles j:
 * F_ij = G * m_i * m_j * (r_j - r_i) / (|r_j - r_i|² + ε²)^(3/2)
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn computeForces(@builtin(global_invocation_id) global_id: vec3u) {
    let i = global_id.x;
    if (i >= params.particle_count) {
        return;
    }

    let pos_i = positions_in[i].xyz;
    let mass_i = positions_in[i].w;

    var acceleration = vec3f(0.0);

    // Direct summation over all particles
    for (var j = 0u; j < params.particle_count; j++) {
        if (i == j) {
            continue;
        }

        let pos_j = positions_in[j].xyz;
        let mass_j = positions_in[j].w;

        // Vector from i to j
        let r = pos_j - pos_i;

        // Distance squared with softening
        let r2 = dot(r, r) + params.softening;

        // Inverse distance cubed
        let inv_r3 = 1.0 / (r2 * sqrt(r2));

        // Gravitational acceleration: a = G * m_j * r / |r|³
        acceleration += params.G * mass_j * r * inv_r3;
    }

    // Store acceleration (will be used in integration)
    forces[i] = vec4f(acceleration, 0.0);
}

/**
 * Leapfrog integration
 *
 * v(t + dt/2) = v(t - dt/2) + a(t) * dt
 * x(t + dt) = x(t) + v(t + dt/2) * dt
 *
 * This is a symplectic integrator that conserves energy well.
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
        // Reflect off boundaries with damping
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

    // Store results (mass preserved in w component)
    positions_out[i] = vec4f(new_pos, pos.w);
    velocities_out[i] = vec4f(vel, 0.0);
}
