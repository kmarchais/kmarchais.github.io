/**
 * GPU Marching Cubes Compute Shader
 *
 * Generates triangulated mesh from 3D scalar field.
 * Two-pass approach:
 *   Pass 1: Count triangles per cell
 *   Pass 2: Generate vertices and indices
 */

struct MCParams {
    resolution: u32,          // Grid resolution
    isolevel: f32,            // Isosurface level (usually 0)
    padding1: u32,
    padding2: u32,
};

// Buffers
@group(0) @binding(0) var<uniform> params: MCParams;
@group(0) @binding(1) var<storage> grid_values: array<f32>;
@group(0) @binding(2) var<storage> edge_table: array<u32>;
@group(0) @binding(3) var<storage> tri_table: array<i32>;
@group(0) @binding(4) var<storage, read_write> vertices: array<f32>;
@group(0) @binding(5) var<storage, read_write> triangle_count: array<atomic<u32>>;
@group(0) @binding(6) var<storage, read_write> vertex_count: array<atomic<u32>>;

// ============================================================================
// Helper Functions
// ============================================================================

fn get_grid_value(x: u32, y: u32, z: u32) -> f32 {
    let res = params.resolution;
    let idx = x + y * res + z * res * res;
    return grid_values[idx];
}

fn grid_to_world(ix: u32, iy: u32, iz: u32) -> vec3f {
    let res = f32(params.resolution - 1u);
    return vec3f(f32(ix) / res, f32(iy) / res, f32(iz) / res) - 0.5;
}

fn interpolate_vertex(p1: vec3f, p2: vec3f, v1: f32, v2: f32) -> vec3f {
    let iso = params.isolevel;

    if (abs(iso - v1) < 0.00001) { return p1; }
    if (abs(iso - v2) < 0.00001) { return p2; }
    if (abs(v1 - v2) < 0.00001) { return p1; }

    let t = (iso - v1) / (v2 - v1);
    return p1 + t * (p2 - p1);
}

// ============================================================================
// Pass 1: Count Triangles
// ============================================================================

@compute @workgroup_size(8, 8, 8)
fn count_triangles(@builtin(global_invocation_id) id: vec3u) {
    let res = params.resolution;

    // Process cells (one less than grid points in each dimension)
    if (id.x >= res - 1u || id.y >= res - 1u || id.z >= res - 1u) {
        return;
    }

    // Get 8 corner values
    let v0 = get_grid_value(id.x,     id.y,     id.z);
    let v1 = get_grid_value(id.x + 1, id.y,     id.z);
    let v2 = get_grid_value(id.x + 1, id.y + 1, id.z);
    let v3 = get_grid_value(id.x,     id.y + 1, id.z);
    let v4 = get_grid_value(id.x,     id.y,     id.z + 1);
    let v5 = get_grid_value(id.x + 1, id.y,     id.z + 1);
    let v6 = get_grid_value(id.x + 1, id.y + 1, id.z + 1);
    let v7 = get_grid_value(id.x,     id.y + 1, id.z + 1);

    let iso = params.isolevel;

    // Build cube index
    var cube_index = 0u;
    if (v0 < iso) { cube_index |= 1u; }
    if (v1 < iso) { cube_index |= 2u; }
    if (v2 < iso) { cube_index |= 4u; }
    if (v3 < iso) { cube_index |= 8u; }
    if (v4 < iso) { cube_index |= 16u; }
    if (v5 < iso) { cube_index |= 32u; }
    if (v6 < iso) { cube_index |= 64u; }
    if (v7 < iso) { cube_index |= 128u; }

    // Skip if no triangles in this cell
    if (edge_table[cube_index] == 0u) {
        return;
    }

    // Count triangles by iterating tri_table
    var num_triangles = 0u;
    let base = i32(cube_index) * 16;
    for (var i = 0; i < 16; i += 3) {
        if (tri_table[base + i] < 0) { break; }
        num_triangles += 1u;
    }

    // Atomically add to total count
    atomicAdd(&triangle_count[0], num_triangles);
}

// ============================================================================
// Pass 2: Generate Vertices
// ============================================================================

@compute @workgroup_size(8, 8, 8)
fn generate_vertices(@builtin(global_invocation_id) id: vec3u) {
    let res = params.resolution;

    if (id.x >= res - 1u || id.y >= res - 1u || id.z >= res - 1u) {
        return;
    }

    // Get corner positions
    let p0 = grid_to_world(id.x,     id.y,     id.z);
    let p1 = grid_to_world(id.x + 1, id.y,     id.z);
    let p2 = grid_to_world(id.x + 1, id.y + 1, id.z);
    let p3 = grid_to_world(id.x,     id.y + 1, id.z);
    let p4 = grid_to_world(id.x,     id.y,     id.z + 1);
    let p5 = grid_to_world(id.x + 1, id.y,     id.z + 1);
    let p6 = grid_to_world(id.x + 1, id.y + 1, id.z + 1);
    let p7 = grid_to_world(id.x,     id.y + 1, id.z + 1);

    // Get corner values
    let v0 = get_grid_value(id.x,     id.y,     id.z);
    let v1 = get_grid_value(id.x + 1, id.y,     id.z);
    let v2 = get_grid_value(id.x + 1, id.y + 1, id.z);
    let v3 = get_grid_value(id.x,     id.y + 1, id.z);
    let v4 = get_grid_value(id.x,     id.y,     id.z + 1);
    let v5 = get_grid_value(id.x + 1, id.y,     id.z + 1);
    let v6 = get_grid_value(id.x + 1, id.y + 1, id.z + 1);
    let v7 = get_grid_value(id.x,     id.y + 1, id.z + 1);

    let iso = params.isolevel;

    // Build cube index
    var cube_index = 0u;
    if (v0 < iso) { cube_index |= 1u; }
    if (v1 < iso) { cube_index |= 2u; }
    if (v2 < iso) { cube_index |= 4u; }
    if (v3 < iso) { cube_index |= 8u; }
    if (v4 < iso) { cube_index |= 16u; }
    if (v5 < iso) { cube_index |= 32u; }
    if (v6 < iso) { cube_index |= 64u; }
    if (v7 < iso) { cube_index |= 128u; }

    let edges = edge_table[cube_index];
    if (edges == 0u) {
        return;
    }

    // Compute edge vertices
    var vert_list: array<vec3f, 12>;

    if ((edges & 1u) != 0u) { vert_list[0] = interpolate_vertex(p0, p1, v0, v1); }
    if ((edges & 2u) != 0u) { vert_list[1] = interpolate_vertex(p1, p2, v1, v2); }
    if ((edges & 4u) != 0u) { vert_list[2] = interpolate_vertex(p2, p3, v2, v3); }
    if ((edges & 8u) != 0u) { vert_list[3] = interpolate_vertex(p3, p0, v3, v0); }
    if ((edges & 16u) != 0u) { vert_list[4] = interpolate_vertex(p4, p5, v4, v5); }
    if ((edges & 32u) != 0u) { vert_list[5] = interpolate_vertex(p5, p6, v5, v6); }
    if ((edges & 64u) != 0u) { vert_list[6] = interpolate_vertex(p6, p7, v6, v7); }
    if ((edges & 128u) != 0u) { vert_list[7] = interpolate_vertex(p7, p4, v7, v4); }
    if ((edges & 256u) != 0u) { vert_list[8] = interpolate_vertex(p0, p4, v0, v4); }
    if ((edges & 512u) != 0u) { vert_list[9] = interpolate_vertex(p1, p5, v1, v5); }
    if ((edges & 1024u) != 0u) { vert_list[10] = interpolate_vertex(p2, p6, v2, v6); }
    if ((edges & 2048u) != 0u) { vert_list[11] = interpolate_vertex(p3, p7, v3, v7); }

    // Generate triangles
    let base = i32(cube_index) * 16;
    for (var i = 0; i < 16; i += 3) {
        let e0 = tri_table[base + i];
        if (e0 < 0) { break; }

        let e1 = tri_table[base + i + 1];
        let e2 = tri_table[base + i + 2];

        // Get vertex positions
        let pos0 = vert_list[e0];
        let pos1 = vert_list[e1];
        let pos2 = vert_list[e2];

        // Compute normal (face normal)
        let edge1 = pos1 - pos0;
        let edge2 = pos2 - pos0;
        let normal = normalize(cross(edge1, edge2));

        // Allocate vertex slots (6 floats per vertex: pos + normal)
        let vertex_idx = atomicAdd(&vertex_count[0], 3u);
        let base_idx = vertex_idx * 6u;

        // Write vertex 0
        vertices[base_idx + 0] = pos0.x;
        vertices[base_idx + 1] = pos0.y;
        vertices[base_idx + 2] = pos0.z;
        vertices[base_idx + 3] = normal.x;
        vertices[base_idx + 4] = normal.y;
        vertices[base_idx + 5] = normal.z;

        // Write vertex 1
        vertices[base_idx + 6] = pos1.x;
        vertices[base_idx + 7] = pos1.y;
        vertices[base_idx + 8] = pos1.z;
        vertices[base_idx + 9] = normal.x;
        vertices[base_idx + 10] = normal.y;
        vertices[base_idx + 11] = normal.z;

        // Write vertex 2
        vertices[base_idx + 12] = pos2.x;
        vertices[base_idx + 13] = pos2.y;
        vertices[base_idx + 14] = pos2.z;
        vertices[base_idx + 15] = normal.x;
        vertices[base_idx + 16] = normal.y;
        vertices[base_idx + 17] = normal.z;
    }
}
