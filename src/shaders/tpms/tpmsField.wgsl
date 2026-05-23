/**
 * TPMS Field Evaluation Compute Shader
 *
 * Evaluates TPMS implicit functions on a 3D grid.
 * Supports all microgen surface types with morphing capability.
 */

const PI: f32 = 3.14159265359;

struct TPMSParams {
    // Surface selection
    surface_type: u32,        // Primary surface (0-13)
    morph_target: u32,        // Target surface for morphing
    morph_factor: f32,        // Interpolation factor (0-1)

    // Geometry parameters
    offset: f32,              // Isovalue offset (controls thickness)
    cell_size: f32,           // Unit cell size in world units
    scale: f32,               // Overall scale factor

    // Phase shifts for animation/variation
    phase_x: f32,
    phase_y: f32,
    phase_z: f32,

    // Grid parameters
    resolution: u32,          // Grid resolution (same for all axes)
    padding: u32,             // Padding for alignment
};

@group(0) @binding(0) var<uniform> params: TPMSParams;
@group(0) @binding(1) var<storage, read_write> grid_values: array<f32>;

// ============================================================================
// TPMS Surface Functions
// ============================================================================

fn gyroid(p: vec3f) -> f32 {
    return sin(p.x) * cos(p.y) + sin(p.y) * cos(p.z) + sin(p.z) * cos(p.x);
}

fn schwarz_p(p: vec3f) -> f32 {
    return cos(p.x) + cos(p.y) + cos(p.z);
}

fn schwarz_d(p: vec3f) -> f32 {
    return sin(p.x) * sin(p.y) * sin(p.z)
         + sin(p.x) * cos(p.y) * cos(p.z)
         + cos(p.x) * sin(p.y) * cos(p.z)
         + cos(p.x) * cos(p.y) * sin(p.z);
}

fn neovius(p: vec3f) -> f32 {
    return 3.0 * (cos(p.x) + cos(p.y) + cos(p.z))
         + 4.0 * cos(p.x) * cos(p.y) * cos(p.z);
}

fn schoen_iwp(p: vec3f) -> f32 {
    return 2.0 * (cos(p.x) * cos(p.y) + cos(p.y) * cos(p.z) + cos(p.z) * cos(p.x))
         - (cos(2.0 * p.x) + cos(2.0 * p.y) + cos(2.0 * p.z));
}

fn schoen_frd(p: vec3f) -> f32 {
    return 4.0 * cos(p.x) * cos(p.y) * cos(p.z)
         - (cos(2.0 * p.x) * cos(2.0 * p.y)
          + cos(2.0 * p.y) * cos(2.0 * p.z)
          + cos(2.0 * p.z) * cos(2.0 * p.x));
}

fn fischer_koch_s(p: vec3f) -> f32 {
    return cos(2.0 * p.x) * sin(p.y) * cos(p.z)
         + cos(p.x) * cos(2.0 * p.y) * sin(p.z)
         + sin(p.x) * cos(p.y) * cos(2.0 * p.z);
}

fn lidinoid(p: vec3f) -> f32 {
    return 0.5 * (sin(2.0 * p.x) * cos(p.y) * sin(p.z)
                + sin(2.0 * p.y) * cos(p.z) * sin(p.x)
                + sin(2.0 * p.z) * cos(p.x) * sin(p.y))
         - 0.5 * (cos(2.0 * p.x) * cos(2.0 * p.y)
                + cos(2.0 * p.y) * cos(2.0 * p.z)
                + cos(2.0 * p.z) * cos(2.0 * p.x))
         + 0.15;
}

fn split_p(p: vec3f) -> f32 {
    return 1.1 * (sin(2.0 * p.x) * cos(p.y) * sin(p.z)
                + sin(2.0 * p.y) * cos(p.z) * sin(p.x)
                + sin(2.0 * p.z) * cos(p.x) * sin(p.y))
         - 0.2 * (cos(2.0 * p.x) * cos(2.0 * p.y)
                + cos(2.0 * p.y) * cos(2.0 * p.z)
                + cos(2.0 * p.z) * cos(2.0 * p.x))
         - 0.4 * (cos(2.0 * p.x) + cos(2.0 * p.y) + cos(2.0 * p.z));
}

fn pmy(p: vec3f) -> f32 {
    return 2.0 * cos(p.x) * cos(p.y) * cos(p.z)
         + sin(2.0 * p.x) * sin(p.y)
         + sin(p.x) * sin(2.0 * p.z)
         + sin(2.0 * p.y) * sin(p.z);
}

// Honeycomb variants (using absolute value)
fn honeycomb_gyroid(p: vec3f) -> f32 {
    return abs(gyroid(p));
}

fn honeycomb_schwarz_p(p: vec3f) -> f32 {
    return abs(schwarz_p(p));
}

fn honeycomb_schwarz_d(p: vec3f) -> f32 {
    return abs(schwarz_d(p));
}

fn honeycomb_iwp(p: vec3f) -> f32 {
    return abs(schoen_iwp(p));
}

// ============================================================================
// Surface Selection
// ============================================================================

fn evaluate_surface(surface_type: u32, p: vec3f) -> f32 {
    switch surface_type {
        case 0u: { return gyroid(p); }
        case 1u: { return schwarz_p(p); }
        case 2u: { return schwarz_d(p); }
        case 3u: { return neovius(p); }
        case 4u: { return schoen_iwp(p); }
        case 5u: { return schoen_frd(p); }
        case 6u: { return fischer_koch_s(p); }
        case 7u: { return lidinoid(p); }
        case 8u: { return split_p(p); }
        case 9u: { return pmy(p); }
        case 10u: { return honeycomb_gyroid(p); }
        case 11u: { return honeycomb_schwarz_p(p); }
        case 12u: { return honeycomb_schwarz_d(p); }
        case 13u: { return honeycomb_iwp(p); }
        default: { return gyroid(p); }
    }
}

// ============================================================================
// Main Compute Shader
// ============================================================================

@compute @workgroup_size(8, 8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
    let res = params.resolution;

    // Check bounds
    if (id.x >= res || id.y >= res || id.z >= res) {
        return;
    }

    // Convert grid index to normalized [0, 1] position
    let grid_pos = vec3f(f32(id.x), f32(id.y), f32(id.z)) / f32(res - 1u);

    // Map to world coordinates [-0.5, 0.5] then scale
    let world_pos = (grid_pos - 0.5) * params.cell_size;

    // Apply scale and convert to TPMS coordinates (multiply by 2π for periodicity)
    let tpms_pos = world_pos * params.scale * 2.0 * PI;

    // Apply phase shifts
    let p = tpms_pos + vec3f(params.phase_x, params.phase_y, params.phase_z);

    // Evaluate primary surface
    var value = evaluate_surface(params.surface_type, p);

    // Apply morphing if factor > 0
    if (params.morph_factor > 0.0 && params.morph_target != params.surface_type) {
        let target_value = evaluate_surface(params.morph_target, p);
        value = mix(value, target_value, params.morph_factor);
    }

    // Apply offset (controls isosurface level)
    value = value - params.offset;

    // Store result
    let index = id.x + id.y * res + id.z * res * res;
    grid_values[index] = value;
}
