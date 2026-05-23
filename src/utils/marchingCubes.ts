/**
 * Marching Cubes Implementation for Fluid Surface Extraction
 *
 * Converts particle-based fluid data into a mesh by:
 * 1. Computing a density field on a 3D grid
 * 2. Computing a velocity field on the same grid
 * 3. Extracting an isosurface using marching cubes
 * 4. Computing smooth normals from density gradients
 * 5. Interpolating velocity to vertices for coloring
 */

// Edge table: for each of 256 cube configurations, which edges are intersected
// prettier-ignore
const EDGE_TABLE = [
  0x0, 0x109, 0x203, 0x30a, 0x406, 0x50f, 0x605, 0x70c,
  0x80c, 0x905, 0xa0f, 0xb06, 0xc0a, 0xd03, 0xe09, 0xf00,
  0x190, 0x99, 0x393, 0x29a, 0x596, 0x49f, 0x795, 0x69c,
  0x99c, 0x895, 0xb9f, 0xa96, 0xd9a, 0xc93, 0xf99, 0xe90,
  0x230, 0x339, 0x33, 0x13a, 0x636, 0x73f, 0x435, 0x53c,
  0xa3c, 0xb35, 0x83f, 0x936, 0xe3a, 0xf33, 0xc39, 0xd30,
  0x3a0, 0x2a9, 0x1a3, 0xaa, 0x7a6, 0x6af, 0x5a5, 0x4ac,
  0xbac, 0xaa5, 0x9af, 0x8a6, 0xfaa, 0xea3, 0xda9, 0xca0,
  0x460, 0x569, 0x663, 0x76a, 0x66, 0x16f, 0x265, 0x36c,
  0xc6c, 0xd65, 0xe6f, 0xf66, 0x86a, 0x963, 0xa69, 0xb60,
  0x5f0, 0x4f9, 0x7f3, 0x6fa, 0x1f6, 0xff, 0x3f5, 0x2fc,
  0xdfc, 0xcf5, 0xfff, 0xef6, 0x9fa, 0x8f3, 0xbf9, 0xaf0,
  0x650, 0x759, 0x453, 0x55a, 0x256, 0x35f, 0x55, 0x15c,
  0xe5c, 0xf55, 0xc5f, 0xd56, 0xa5a, 0xb53, 0x859, 0x950,
  0x7c0, 0x6c9, 0x5c3, 0x4ca, 0x3c6, 0x2cf, 0x1c5, 0xcc,
  0xfcc, 0xec5, 0xdcf, 0xcc6, 0xbca, 0xac3, 0x9c9, 0x8c0,
  0x8c0, 0x9c9, 0xac3, 0xbca, 0xcc6, 0xdcf, 0xec5, 0xfcc,
  0xcc, 0x1c5, 0x2cf, 0x3c6, 0x4ca, 0x5c3, 0x6c9, 0x7c0,
  0x950, 0x859, 0xb53, 0xa5a, 0xd56, 0xc5f, 0xf55, 0xe5c,
  0x15c, 0x55, 0x35f, 0x256, 0x55a, 0x453, 0x759, 0x650,
  0xaf0, 0xbf9, 0x8f3, 0x9fa, 0xef6, 0xfff, 0xcf5, 0xdfc,
  0x2fc, 0x3f5, 0xff, 0x1f6, 0x6fa, 0x7f3, 0x4f9, 0x5f0,
  0xb60, 0xa69, 0x963, 0x86a, 0xf66, 0xe6f, 0xd65, 0xc6c,
  0x36c, 0x265, 0x16f, 0x66, 0x76a, 0x663, 0x569, 0x460,
  0xca0, 0xda9, 0xea3, 0xfaa, 0x8a6, 0x9af, 0xaa5, 0xbac,
  0x4ac, 0x5a5, 0x6af, 0x7a6, 0xaa, 0x1a3, 0x2a9, 0x3a0,
  0xd30, 0xc39, 0xf33, 0xe3a, 0x936, 0x83f, 0xb35, 0xa3c,
  0x53c, 0x435, 0x73f, 0x636, 0x13a, 0x33, 0x339, 0x230,
  0xe90, 0xf99, 0xc93, 0xd9a, 0xa96, 0xb9f, 0x895, 0x99c,
  0x69c, 0x795, 0x49f, 0x596, 0x29a, 0x393, 0x99, 0x190,
  0xf00, 0xe09, 0xd03, 0xc0a, 0xb06, 0xa0f, 0x905, 0x80c,
  0x70c, 0x605, 0x50f, 0x406, 0x30a, 0x203, 0x109, 0x0
];

// Triangle table: for each cube configuration, list of edge indices forming triangles
// Each row has up to 15 values (5 triangles max), terminated by -1
// prettier-ignore
const TRI_TABLE = [
  [-1],
  [0, 8, 3, -1],
  [0, 1, 9, -1],
  [1, 8, 3, 9, 8, 1, -1],
  [1, 2, 10, -1],
  [0, 8, 3, 1, 2, 10, -1],
  [9, 2, 10, 0, 2, 9, -1],
  [2, 8, 3, 2, 10, 8, 10, 9, 8, -1],
  [3, 11, 2, -1],
  [0, 11, 2, 8, 11, 0, -1],
  [1, 9, 0, 2, 3, 11, -1],
  [1, 11, 2, 1, 9, 11, 9, 8, 11, -1],
  [3, 10, 1, 11, 10, 3, -1],
  [0, 10, 1, 0, 8, 10, 8, 11, 10, -1],
  [3, 9, 0, 3, 11, 9, 11, 10, 9, -1],
  [9, 8, 10, 10, 8, 11, -1],
  [4, 7, 8, -1],
  [4, 3, 0, 7, 3, 4, -1],
  [0, 1, 9, 8, 4, 7, -1],
  [4, 1, 9, 4, 7, 1, 7, 3, 1, -1],
  [1, 2, 10, 8, 4, 7, -1],
  [3, 4, 7, 3, 0, 4, 1, 2, 10, -1],
  [9, 2, 10, 9, 0, 2, 8, 4, 7, -1],
  [2, 10, 9, 2, 9, 7, 2, 7, 3, 7, 9, 4, -1],
  [8, 4, 7, 3, 11, 2, -1],
  [11, 4, 7, 11, 2, 4, 2, 0, 4, -1],
  [9, 0, 1, 8, 4, 7, 2, 3, 11, -1],
  [4, 7, 11, 9, 4, 11, 9, 11, 2, 9, 2, 1, -1],
  [3, 10, 1, 3, 11, 10, 7, 8, 4, -1],
  [1, 11, 10, 1, 4, 11, 1, 0, 4, 7, 11, 4, -1],
  [4, 7, 8, 9, 0, 11, 9, 11, 10, 11, 0, 3, -1],
  [4, 7, 11, 4, 11, 9, 9, 11, 10, -1],
  [9, 5, 4, -1],
  [9, 5, 4, 0, 8, 3, -1],
  [0, 5, 4, 1, 5, 0, -1],
  [8, 5, 4, 8, 3, 5, 3, 1, 5, -1],
  [1, 2, 10, 9, 5, 4, -1],
  [3, 0, 8, 1, 2, 10, 4, 9, 5, -1],
  [5, 2, 10, 5, 4, 2, 4, 0, 2, -1],
  [2, 10, 5, 3, 2, 5, 3, 5, 4, 3, 4, 8, -1],
  [9, 5, 4, 2, 3, 11, -1],
  [0, 11, 2, 0, 8, 11, 4, 9, 5, -1],
  [0, 5, 4, 0, 1, 5, 2, 3, 11, -1],
  [2, 1, 5, 2, 5, 8, 2, 8, 11, 4, 8, 5, -1],
  [10, 3, 11, 10, 1, 3, 9, 5, 4, -1],
  [4, 9, 5, 0, 8, 1, 8, 10, 1, 8, 11, 10, -1],
  [5, 4, 0, 5, 0, 11, 5, 11, 10, 11, 0, 3, -1],
  [5, 4, 8, 5, 8, 10, 10, 8, 11, -1],
  [9, 7, 8, 5, 7, 9, -1],
  [9, 3, 0, 9, 5, 3, 5, 7, 3, -1],
  [0, 7, 8, 0, 1, 7, 1, 5, 7, -1],
  [1, 5, 3, 3, 5, 7, -1],
  [9, 7, 8, 9, 5, 7, 10, 1, 2, -1],
  [10, 1, 2, 9, 5, 0, 5, 3, 0, 5, 7, 3, -1],
  [8, 0, 2, 8, 2, 5, 8, 5, 7, 10, 5, 2, -1],
  [2, 10, 5, 2, 5, 3, 3, 5, 7, -1],
  [7, 9, 5, 7, 8, 9, 3, 11, 2, -1],
  [9, 5, 7, 9, 7, 2, 9, 2, 0, 2, 7, 11, -1],
  [2, 3, 11, 0, 1, 8, 1, 7, 8, 1, 5, 7, -1],
  [11, 2, 1, 11, 1, 7, 7, 1, 5, -1],
  [9, 5, 8, 8, 5, 7, 10, 1, 3, 10, 3, 11, -1],
  [5, 7, 0, 5, 0, 9, 7, 11, 0, 1, 0, 10, 11, 10, 0, -1],
  [11, 10, 0, 11, 0, 3, 10, 5, 0, 8, 0, 7, 5, 7, 0, -1],
  [11, 10, 5, 7, 11, 5, -1],
  [10, 6, 5, -1],
  [0, 8, 3, 5, 10, 6, -1],
  [9, 0, 1, 5, 10, 6, -1],
  [1, 8, 3, 1, 9, 8, 5, 10, 6, -1],
  [1, 6, 5, 2, 6, 1, -1],
  [1, 6, 5, 1, 2, 6, 3, 0, 8, -1],
  [9, 6, 5, 9, 0, 6, 0, 2, 6, -1],
  [5, 9, 8, 5, 8, 2, 5, 2, 6, 3, 2, 8, -1],
  [2, 3, 11, 10, 6, 5, -1],
  [11, 0, 8, 11, 2, 0, 10, 6, 5, -1],
  [0, 1, 9, 2, 3, 11, 5, 10, 6, -1],
  [5, 10, 6, 1, 9, 2, 9, 11, 2, 9, 8, 11, -1],
  [6, 3, 11, 6, 5, 3, 5, 1, 3, -1],
  [0, 8, 11, 0, 11, 5, 0, 5, 1, 5, 11, 6, -1],
  [3, 11, 6, 0, 3, 6, 0, 6, 5, 0, 5, 9, -1],
  [6, 5, 9, 6, 9, 11, 11, 9, 8, -1],
  [5, 10, 6, 4, 7, 8, -1],
  [4, 3, 0, 4, 7, 3, 6, 5, 10, -1],
  [1, 9, 0, 5, 10, 6, 8, 4, 7, -1],
  [10, 6, 5, 1, 9, 7, 1, 7, 3, 7, 9, 4, -1],
  [6, 1, 2, 6, 5, 1, 4, 7, 8, -1],
  [1, 2, 5, 5, 2, 6, 3, 0, 4, 3, 4, 7, -1],
  [8, 4, 7, 9, 0, 5, 0, 6, 5, 0, 2, 6, -1],
  [7, 3, 9, 7, 9, 4, 3, 2, 9, 5, 9, 6, 2, 6, 9, -1],
  [3, 11, 2, 7, 8, 4, 10, 6, 5, -1],
  [5, 10, 6, 4, 7, 2, 4, 2, 0, 2, 7, 11, -1],
  [0, 1, 9, 4, 7, 8, 2, 3, 11, 5, 10, 6, -1],
  [9, 2, 1, 9, 11, 2, 9, 4, 11, 7, 11, 4, 5, 10, 6, -1],
  [8, 4, 7, 3, 11, 5, 3, 5, 1, 5, 11, 6, -1],
  [5, 1, 11, 5, 11, 6, 1, 0, 11, 7, 11, 4, 0, 4, 11, -1],
  [0, 5, 9, 0, 6, 5, 0, 3, 6, 11, 6, 3, 8, 4, 7, -1],
  [6, 5, 9, 6, 9, 11, 4, 7, 9, 7, 11, 9, -1],
  [10, 4, 9, 6, 4, 10, -1],
  [4, 10, 6, 4, 9, 10, 0, 8, 3, -1],
  [10, 0, 1, 10, 6, 0, 6, 4, 0, -1],
  [8, 3, 1, 8, 1, 6, 8, 6, 4, 6, 1, 10, -1],
  [1, 4, 9, 1, 2, 4, 2, 6, 4, -1],
  [3, 0, 8, 1, 2, 9, 2, 4, 9, 2, 6, 4, -1],
  [0, 2, 4, 4, 2, 6, -1],
  [8, 3, 2, 8, 2, 4, 4, 2, 6, -1],
  [10, 4, 9, 10, 6, 4, 11, 2, 3, -1],
  [0, 8, 2, 2, 8, 11, 4, 9, 10, 4, 10, 6, -1],
  [3, 11, 2, 0, 1, 6, 0, 6, 4, 6, 1, 10, -1],
  [6, 4, 1, 6, 1, 10, 4, 8, 1, 2, 1, 11, 8, 11, 1, -1],
  [9, 6, 4, 9, 3, 6, 9, 1, 3, 11, 6, 3, -1],
  [8, 11, 1, 8, 1, 0, 11, 6, 1, 9, 1, 4, 6, 4, 1, -1],
  [3, 11, 6, 3, 6, 0, 0, 6, 4, -1],
  [6, 4, 8, 11, 6, 8, -1],
  [7, 10, 6, 7, 8, 10, 8, 9, 10, -1],
  [0, 7, 3, 0, 10, 7, 0, 9, 10, 6, 7, 10, -1],
  [10, 6, 7, 1, 10, 7, 1, 7, 8, 1, 8, 0, -1],
  [10, 6, 7, 10, 7, 1, 1, 7, 3, -1],
  [1, 2, 6, 1, 6, 8, 1, 8, 9, 8, 6, 7, -1],
  [2, 6, 9, 2, 9, 1, 6, 7, 9, 0, 9, 3, 7, 3, 9, -1],
  [7, 8, 0, 7, 0, 6, 6, 0, 2, -1],
  [7, 3, 2, 6, 7, 2, -1],
  [2, 3, 11, 10, 6, 8, 10, 8, 9, 8, 6, 7, -1],
  [2, 0, 7, 2, 7, 11, 0, 9, 7, 6, 7, 10, 9, 10, 7, -1],
  [1, 8, 0, 1, 7, 8, 1, 10, 7, 6, 7, 10, 2, 3, 11, -1],
  [11, 2, 1, 11, 1, 7, 10, 6, 1, 6, 7, 1, -1],
  [8, 9, 6, 8, 6, 7, 9, 1, 6, 11, 6, 3, 1, 3, 6, -1],
  [0, 9, 1, 11, 6, 7, -1],
  [7, 8, 0, 7, 0, 6, 3, 11, 0, 11, 6, 0, -1],
  [7, 11, 6, -1],
  [7, 6, 11, -1],
  [3, 0, 8, 11, 7, 6, -1],
  [0, 1, 9, 11, 7, 6, -1],
  [8, 1, 9, 8, 3, 1, 11, 7, 6, -1],
  [10, 1, 2, 6, 11, 7, -1],
  [1, 2, 10, 3, 0, 8, 6, 11, 7, -1],
  [2, 9, 0, 2, 10, 9, 6, 11, 7, -1],
  [6, 11, 7, 2, 10, 3, 10, 8, 3, 10, 9, 8, -1],
  [7, 2, 3, 6, 2, 7, -1],
  [7, 0, 8, 7, 6, 0, 6, 2, 0, -1],
  [2, 7, 6, 2, 3, 7, 0, 1, 9, -1],
  [1, 6, 2, 1, 8, 6, 1, 9, 8, 8, 7, 6, -1],
  [10, 7, 6, 10, 1, 7, 1, 3, 7, -1],
  [10, 7, 6, 1, 7, 10, 1, 8, 7, 1, 0, 8, -1],
  [0, 3, 7, 0, 7, 10, 0, 10, 9, 6, 10, 7, -1],
  [7, 6, 10, 7, 10, 8, 8, 10, 9, -1],
  [6, 8, 4, 11, 8, 6, -1],
  [3, 6, 11, 3, 0, 6, 0, 4, 6, -1],
  [8, 6, 11, 8, 4, 6, 9, 0, 1, -1],
  [9, 4, 6, 9, 6, 3, 9, 3, 1, 11, 3, 6, -1],
  [6, 8, 4, 6, 11, 8, 2, 10, 1, -1],
  [1, 2, 10, 3, 0, 11, 0, 6, 11, 0, 4, 6, -1],
  [4, 11, 8, 4, 6, 11, 0, 2, 9, 2, 10, 9, -1],
  [10, 9, 3, 10, 3, 2, 9, 4, 3, 11, 3, 6, 4, 6, 3, -1],
  [8, 2, 3, 8, 4, 2, 4, 6, 2, -1],
  [0, 4, 2, 4, 6, 2, -1],
  [1, 9, 0, 2, 3, 4, 2, 4, 6, 4, 3, 8, -1],
  [1, 9, 4, 1, 4, 2, 2, 4, 6, -1],
  [8, 1, 3, 8, 6, 1, 8, 4, 6, 6, 10, 1, -1],
  [10, 1, 0, 10, 0, 6, 6, 0, 4, -1],
  [4, 6, 3, 4, 3, 8, 6, 10, 3, 0, 3, 9, 10, 9, 3, -1],
  [10, 9, 4, 6, 10, 4, -1],
  [4, 9, 5, 7, 6, 11, -1],
  [0, 8, 3, 4, 9, 5, 11, 7, 6, -1],
  [5, 0, 1, 5, 4, 0, 7, 6, 11, -1],
  [11, 7, 6, 8, 3, 4, 3, 5, 4, 3, 1, 5, -1],
  [9, 5, 4, 10, 1, 2, 7, 6, 11, -1],
  [6, 11, 7, 1, 2, 10, 0, 8, 3, 4, 9, 5, -1],
  [7, 6, 11, 5, 4, 10, 4, 2, 10, 4, 0, 2, -1],
  [3, 4, 8, 3, 5, 4, 3, 2, 5, 10, 5, 2, 11, 7, 6, -1],
  [7, 2, 3, 7, 6, 2, 5, 4, 9, -1],
  [9, 5, 4, 0, 8, 6, 0, 6, 2, 6, 8, 7, -1],
  [3, 6, 2, 3, 7, 6, 1, 5, 0, 5, 4, 0, -1],
  [6, 2, 8, 6, 8, 7, 2, 1, 8, 4, 8, 5, 1, 5, 8, -1],
  [9, 5, 4, 10, 1, 6, 1, 7, 6, 1, 3, 7, -1],
  [1, 6, 10, 1, 7, 6, 1, 0, 7, 8, 7, 0, 9, 5, 4, -1],
  [4, 0, 10, 4, 10, 5, 0, 3, 10, 6, 10, 7, 3, 7, 10, -1],
  [7, 6, 10, 7, 10, 8, 5, 4, 10, 4, 8, 10, -1],
  [6, 9, 5, 6, 11, 9, 11, 8, 9, -1],
  [3, 6, 11, 0, 6, 3, 0, 5, 6, 0, 9, 5, -1],
  [0, 11, 8, 0, 5, 11, 0, 1, 5, 5, 6, 11, -1],
  [6, 11, 3, 6, 3, 5, 5, 3, 1, -1],
  [1, 2, 10, 9, 5, 11, 9, 11, 8, 11, 5, 6, -1],
  [0, 11, 3, 0, 6, 11, 0, 9, 6, 5, 6, 9, 1, 2, 10, -1],
  [11, 8, 5, 11, 5, 6, 8, 0, 5, 10, 5, 2, 0, 2, 5, -1],
  [6, 11, 3, 6, 3, 5, 2, 10, 3, 10, 5, 3, -1],
  [5, 8, 9, 5, 2, 8, 5, 6, 2, 3, 8, 2, -1],
  [9, 5, 6, 9, 6, 0, 0, 6, 2, -1],
  [1, 5, 8, 1, 8, 0, 5, 6, 8, 3, 8, 2, 6, 2, 8, -1],
  [1, 5, 6, 2, 1, 6, -1],
  [1, 3, 6, 1, 6, 10, 3, 8, 6, 5, 6, 9, 8, 9, 6, -1],
  [10, 1, 0, 10, 0, 6, 9, 5, 0, 5, 6, 0, -1],
  [0, 3, 8, 5, 6, 10, -1],
  [10, 5, 6, -1],
  [11, 5, 10, 7, 5, 11, -1],
  [11, 5, 10, 11, 7, 5, 8, 3, 0, -1],
  [5, 11, 7, 5, 10, 11, 1, 9, 0, -1],
  [10, 7, 5, 10, 11, 7, 9, 8, 1, 8, 3, 1, -1],
  [11, 1, 2, 11, 7, 1, 7, 5, 1, -1],
  [0, 8, 3, 1, 2, 7, 1, 7, 5, 7, 2, 11, -1],
  [9, 7, 5, 9, 2, 7, 9, 0, 2, 2, 11, 7, -1],
  [7, 5, 2, 7, 2, 11, 5, 9, 2, 3, 2, 8, 9, 8, 2, -1],
  [2, 5, 10, 2, 3, 5, 3, 7, 5, -1],
  [8, 2, 0, 8, 5, 2, 8, 7, 5, 10, 2, 5, -1],
  [9, 0, 1, 5, 10, 3, 5, 3, 7, 3, 10, 2, -1],
  [9, 8, 2, 9, 2, 1, 8, 7, 2, 10, 2, 5, 7, 5, 2, -1],
  [1, 3, 5, 3, 7, 5, -1],
  [0, 8, 7, 0, 7, 1, 1, 7, 5, -1],
  [9, 0, 3, 9, 3, 5, 5, 3, 7, -1],
  [9, 8, 7, 5, 9, 7, -1],
  [5, 8, 4, 5, 10, 8, 10, 11, 8, -1],
  [5, 0, 4, 5, 11, 0, 5, 10, 11, 11, 3, 0, -1],
  [0, 1, 9, 8, 4, 10, 8, 10, 11, 10, 4, 5, -1],
  [10, 11, 4, 10, 4, 5, 11, 3, 4, 9, 4, 1, 3, 1, 4, -1],
  [2, 5, 1, 2, 8, 5, 2, 11, 8, 4, 5, 8, -1],
  [0, 4, 11, 0, 11, 3, 4, 5, 11, 2, 11, 1, 5, 1, 11, -1],
  [0, 2, 5, 0, 5, 9, 2, 11, 5, 4, 5, 8, 11, 8, 5, -1],
  [9, 4, 5, 2, 11, 3, -1],
  [2, 5, 10, 3, 5, 2, 3, 4, 5, 3, 8, 4, -1],
  [5, 10, 2, 5, 2, 4, 4, 2, 0, -1],
  [3, 10, 2, 3, 5, 10, 3, 8, 5, 4, 5, 8, 0, 1, 9, -1],
  [5, 10, 2, 5, 2, 4, 1, 9, 2, 9, 4, 2, -1],
  [8, 4, 5, 8, 5, 3, 3, 5, 1, -1],
  [0, 4, 5, 1, 0, 5, -1],
  [8, 4, 5, 8, 5, 3, 9, 0, 5, 0, 3, 5, -1],
  [9, 4, 5, -1],
  [4, 11, 7, 4, 9, 11, 9, 10, 11, -1],
  [0, 8, 3, 4, 9, 7, 9, 11, 7, 9, 10, 11, -1],
  [1, 10, 11, 1, 11, 4, 1, 4, 0, 7, 4, 11, -1],
  [3, 1, 4, 3, 4, 8, 1, 10, 4, 7, 4, 11, 10, 11, 4, -1],
  [4, 11, 7, 9, 11, 4, 9, 2, 11, 9, 1, 2, -1],
  [9, 7, 4, 9, 11, 7, 9, 1, 11, 2, 11, 1, 0, 8, 3, -1],
  [11, 7, 4, 11, 4, 2, 2, 4, 0, -1],
  [11, 7, 4, 11, 4, 2, 8, 3, 4, 3, 2, 4, -1],
  [2, 9, 10, 2, 7, 9, 2, 3, 7, 7, 4, 9, -1],
  [9, 10, 7, 9, 7, 4, 10, 2, 7, 8, 7, 0, 2, 0, 7, -1],
  [3, 7, 10, 3, 10, 2, 7, 4, 10, 1, 10, 0, 4, 0, 10, -1],
  [1, 10, 2, 8, 7, 4, -1],
  [4, 9, 1, 4, 1, 7, 7, 1, 3, -1],
  [4, 9, 1, 4, 1, 7, 0, 8, 1, 8, 7, 1, -1],
  [4, 0, 3, 7, 4, 3, -1],
  [4, 8, 7, -1],
  [9, 10, 8, 10, 11, 8, -1],
  [3, 0, 9, 3, 9, 11, 11, 9, 10, -1],
  [0, 1, 10, 0, 10, 8, 8, 10, 11, -1],
  [3, 1, 10, 11, 3, 10, -1],
  [1, 2, 11, 1, 11, 9, 9, 11, 8, -1],
  [3, 0, 9, 3, 9, 11, 1, 2, 9, 2, 11, 9, -1],
  [0, 2, 11, 8, 0, 11, -1],
  [3, 2, 11, -1],
  [2, 3, 8, 2, 8, 10, 10, 8, 9, -1],
  [9, 10, 2, 0, 9, 2, -1],
  [2, 3, 8, 2, 8, 10, 0, 1, 8, 1, 10, 8, -1],
  [1, 10, 2, -1],
  [1, 3, 8, 9, 1, 8, -1],
  [0, 9, 1, -1],
  [0, 3, 8, -1],
  [-1]
];

// Edge vertices: which two vertices each edge connects
// prettier-ignore
const EDGE_VERTICES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 0],  // bottom face
  [4, 5], [5, 6], [6, 7], [7, 4],  // top face
  [0, 4], [1, 5], [2, 6], [3, 7],  // vertical edges
];

// Corner offsets for the 8 vertices of a cube
// prettier-ignore
const CORNER_OFFSETS: [number, number, number][] = [
  [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],  // bottom face
  [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1],  // top face
];

export interface MarchingCubesResult {
  positions: Float32Array;
  normals: Float32Array;
  /** Field value at each vertex (for coloring) */
  fieldValues: Float32Array;
  /** Min field value in the mesh */
  fieldMin: number;
  /** Max field value in the mesh */
  fieldMax: number;
  vertexCount: number;
}

/** Field types for mesh coloring */
export type MeshFieldType = 'velocity' | 'height' | 'density';

/**
 * SPH Kernel for density estimation (Poly6 kernel)
 */
function poly6Kernel(r: number, h: number): number {
  if (r >= h) return 0;
  const h2 = h * h;
  const r2 = r * r;
  const diff = h2 - r2;
  const coeff = 315 / (64 * Math.PI * Math.pow(h, 9));
  return coeff * diff * diff * diff;
}

export interface GridFields {
  density: Float32Array;
  velocityX: Float32Array;
  velocityY: Float32Array;
  velocityZ: Float32Array;
}

/**
 * Compute density and velocity fields from particle data
 */
export function computeFields(
  positions: Float32Array,
  velocities: Float32Array | null,
  gridSize: number,
  bounds: { min: [number, number, number]; max: [number, number, number] },
  smoothingRadius: number
): GridFields {
  const numCells = gridSize * gridSize * gridSize;
  const density = new Float32Array(numCells);
  const velocityX = new Float32Array(numCells);
  const velocityY = new Float32Array(numCells);
  const velocityZ = new Float32Array(numCells);
  const weights = new Float32Array(numCells);

  const particleCount = positions.length / 4;

  const [minX, minY, minZ] = bounds.min;
  const [maxX, maxY, maxZ] = bounds.max;
  const scaleX = (gridSize - 1) / (maxX - minX);
  const scaleY = (gridSize - 1) / (maxY - minY);
  const scaleZ = (gridSize - 1) / (maxZ - minZ);
  const cellSizeX = (maxX - minX) / (gridSize - 1);
  const cellSizeY = (maxY - minY) / (gridSize - 1);
  const cellSizeZ = (maxZ - minZ) / (gridSize - 1);

  const radius = smoothingRadius;
  const radiusCells = Math.ceil(radius / Math.min(cellSizeX, cellSizeY, cellSizeZ));

  for (let p = 0; p < particleCount; p++) {
    const px = positions[p * 4];
    const py = positions[p * 4 + 1];
    const pz = positions[p * 4 + 2];

    // Get particle velocity
    const vx = velocities ? velocities[p * 4] : 0;
    const vy = velocities ? velocities[p * 4 + 1] : 0;
    const vz = velocities ? velocities[p * 4 + 2] : 0;

    const gx = Math.floor((px - minX) * scaleX);
    const gy = Math.floor((py - minY) * scaleY);
    const gz = Math.floor((pz - minZ) * scaleZ);

    for (let dz = -radiusCells; dz <= radiusCells; dz++) {
      for (let dy = -radiusCells; dy <= radiusCells; dy++) {
        for (let dx = -radiusCells; dx <= radiusCells; dx++) {
          const cx = gx + dx;
          const cy = gy + dy;
          const cz = gz + dz;

          if (cx < 0 || cx >= gridSize || cy < 0 || cy >= gridSize || cz < 0 || cz >= gridSize) {
            continue;
          }

          const wx = minX + cx * cellSizeX;
          const wy = minY + cy * cellSizeY;
          const wz = minZ + cz * cellSizeZ;

          const distX = wx - px;
          const distY = wy - py;
          const distZ = wz - pz;
          const dist = Math.sqrt(distX * distX + distY * distY + distZ * distZ);

          const w = poly6Kernel(dist, radius);
          if (w > 0) {
            const idx = cx + cy * gridSize + cz * gridSize * gridSize;
            density[idx] += w;
            weights[idx] += w;
            velocityX[idx] += vx * w;
            velocityY[idx] += vy * w;
            velocityZ[idx] += vz * w;
          }
        }
      }
    }
  }

  // Normalize velocities by weights
  for (let i = 0; i < numCells; i++) {
    if (weights[i] > 0) {
      velocityX[i] /= weights[i];
      velocityY[i] /= weights[i];
      velocityZ[i] /= weights[i];
    }
  }

  return { density, velocityX, velocityY, velocityZ };
}

/**
 * Compute density field from particle positions (legacy, for backward compat)
 */
export function computeDensityField(
  positions: Float32Array,
  gridSize: number,
  bounds: { min: [number, number, number]; max: [number, number, number] },
  smoothingRadius: number
): Float32Array {
  return computeFields(positions, null, gridSize, bounds, smoothingRadius).density;
}

/**
 * Main marching cubes algorithm with smooth normals and field interpolation
 */
export function marchingCubes(
  fields: GridFields,
  gridSize: number,
  bounds: { min: [number, number, number]; max: [number, number, number] },
  isoLevel: number,
  fieldType: MeshFieldType = 'velocity'
): MarchingCubesResult {
  const vertices: number[] = [];
  const normals: number[] = [];
  const fieldValues: number[] = [];

  const { density, velocityX, velocityY, velocityZ } = fields;

  const [minX, minY, minZ] = bounds.min;
  const [maxX, maxY, maxZ] = bounds.max;
  const cellSizeX = (maxX - minX) / (gridSize - 1);
  const cellSizeY = (maxY - minY) / (gridSize - 1);
  const cellSizeZ = (maxZ - minZ) / (gridSize - 1);

  // Helper to get field value at grid point
  const getGridField = (field: Float32Array, x: number, y: number, z: number): number => {
    if (x < 0 || x >= gridSize || y < 0 || y >= gridSize || z < 0 || z >= gridSize) {
      return 0;
    }
    return field[x + y * gridSize + z * gridSize * gridSize];
  };

  // Compute gradient (for smooth normals)
  const getGradient = (x: number, y: number, z: number): [number, number, number] => {
    const dx = getGridField(density, x + 1, y, z) - getGridField(density, x - 1, y, z);
    const dy = getGridField(density, x, y + 1, z) - getGridField(density, x, y - 1, z);
    const dz = getGridField(density, x, y, z + 1) - getGridField(density, x, y, z - 1);
    return [dx, dy, dz];
  };

  // Get coloring field value at grid point based on field type
  const getColorField = (x: number, y: number, z: number, worldY: number): number => {
    switch (fieldType) {
      case 'velocity': {
        const vx = getGridField(velocityX, x, y, z);
        const vy = getGridField(velocityY, x, y, z);
        const vz = getGridField(velocityZ, x, y, z);
        return Math.sqrt(vx * vx + vy * vy + vz * vz);
      }
      case 'height':
        return worldY;
      case 'density':
        return getGridField(density, x, y, z);
      default:
        return 0;
    }
  };

  // Interpolate vertex with normal and field value
  const interpolateVertexFull = (
    p1: [number, number, number], p2: [number, number, number],
    v1: number, v2: number,
    g1: [number, number, number], g2: [number, number, number],
    f1: number, f2: number
  ): { pos: [number, number, number]; normal: [number, number, number]; field: number } => {
    let t = 0.5;
    if (Math.abs(v1 - v2) > 1e-10) {
      t = (isoLevel - v1) / (v2 - v1);
    }
    t = Math.max(0, Math.min(1, t));

    const pos: [number, number, number] = [
      p1[0] + t * (p2[0] - p1[0]),
      p1[1] + t * (p2[1] - p1[1]),
      p1[2] + t * (p2[2] - p1[2]),
    ];

    // Interpolate gradient for smooth normal
    let nx = g1[0] + t * (g2[0] - g1[0]);
    let ny = g1[1] + t * (g2[1] - g1[1]);
    let nz = g1[2] + t * (g2[2] - g1[2]);
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 1e-10) {
      // Gradient points toward increasing density, we want outward normal
      nx = -nx / len;
      ny = -ny / len;
      nz = -nz / len;
    } else {
      nx = 0; ny = 1; nz = 0;
    }

    // Interpolate field value (for height, use actual interpolated Y position)
    const field = fieldType === 'height' ? pos[1] : f1 + t * (f2 - f1);

    return { pos, normal: [nx, ny, nz], field };
  };

  let fieldMin = Infinity;
  let fieldMax = -Infinity;

  // Process each cell
  for (let z = 0; z < gridSize - 1; z++) {
    for (let y = 0; y < gridSize - 1; y++) {
      for (let x = 0; x < gridSize - 1; x++) {
        // Get values at 8 corners
        const cornerDensities: number[] = [];
        const cornerPositions: [number, number, number][] = [];
        const cornerGradients: [number, number, number][] = [];
        const cornerFields: number[] = [];

        for (let i = 0; i < 8; i++) {
          const [ox, oy, oz] = CORNER_OFFSETS[i];
          const cx = x + ox;
          const cy = y + oy;
          const cz = z + oz;
          const worldY = minY + cy * cellSizeY;
          cornerDensities.push(getGridField(density, cx, cy, cz));
          cornerPositions.push([
            minX + cx * cellSizeX,
            worldY,
            minZ + cz * cellSizeZ,
          ]);
          cornerGradients.push(getGradient(cx, cy, cz));
          cornerFields.push(getColorField(cx, cy, cz, worldY));
        }

        // Determine cube configuration
        let cubeIndex = 0;
        for (let i = 0; i < 8; i++) {
          if (cornerDensities[i] >= isoLevel) {
            cubeIndex |= 1 << i;
          }
        }

        if (EDGE_TABLE[cubeIndex] === 0) continue;

        // Compute edge vertices with normals and field values
        const edgeData: ({ pos: [number, number, number]; normal: [number, number, number]; field: number } | null)[] = new Array(12).fill(null);
        const edgeTable = EDGE_TABLE[cubeIndex];

        for (let i = 0; i < 12; i++) {
          if (edgeTable & (1 << i)) {
            const [i1, i2] = EDGE_VERTICES[i];
            edgeData[i] = interpolateVertexFull(
              cornerPositions[i1], cornerPositions[i2],
              cornerDensities[i1], cornerDensities[i2],
              cornerGradients[i1], cornerGradients[i2],
              cornerFields[i1], cornerFields[i2]
            );
          }
        }

        // Generate triangles
        const triTable = TRI_TABLE[cubeIndex];
        for (let i = 0; triTable[i] !== -1; i += 3) {
          const d0 = edgeData[triTable[i]];
          const d1 = edgeData[triTable[i + 1]];
          const d2 = edgeData[triTable[i + 2]];

          if (d0 && d1 && d2) {
            vertices.push(d0.pos[0], d0.pos[1], d0.pos[2]);
            vertices.push(d1.pos[0], d1.pos[1], d1.pos[2]);
            vertices.push(d2.pos[0], d2.pos[1], d2.pos[2]);

            normals.push(d0.normal[0], d0.normal[1], d0.normal[2]);
            normals.push(d1.normal[0], d1.normal[1], d1.normal[2]);
            normals.push(d2.normal[0], d2.normal[1], d2.normal[2]);

            fieldValues.push(d0.field, d1.field, d2.field);

            fieldMin = Math.min(fieldMin, d0.field, d1.field, d2.field);
            fieldMax = Math.max(fieldMax, d0.field, d1.field, d2.field);
          }
        }
      }
    }
  }

  if (!isFinite(fieldMin)) fieldMin = 0;
  if (!isFinite(fieldMax)) fieldMax = 1;

  return {
    positions: new Float32Array(vertices),
    normals: new Float32Array(normals),
    fieldValues: new Float32Array(fieldValues),
    fieldMin,
    fieldMax,
    vertexCount: vertices.length / 3,
  };
}

/**
 * Generate mesh from SPH particle positions and velocities (CPU computation)
 */
export function generateFluidMesh(
  positions: Float32Array,
  velocities: Float32Array | null,
  bounds: { min: [number, number, number]; max: [number, number, number] },
  smoothingRadius: number,
  gridResolution: number = 32,
  isoLevel?: number,
  fieldType: MeshFieldType = 'velocity'
): MarchingCubesResult {
  // Compute density and velocity fields
  const fields = computeFields(positions, velocities, gridResolution, bounds, smoothingRadius);

  // Auto-compute iso level if not provided (use average of non-zero densities)
  if (isoLevel === undefined) {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < fields.density.length; i++) {
      if (fields.density[i] > 0) {
        sum += fields.density[i];
        count++;
      }
    }
    isoLevel = count > 0 ? sum / count * 0.5 : 0.5;
  }

  // Run marching cubes with smooth normals and field interpolation
  return marchingCubes(fields, gridResolution, bounds, isoLevel, fieldType);
}

/**
 * Generate mesh from GPU-computed field data
 * This is much faster as the expensive field computation is done on GPU
 */
export function generateFluidMeshFromGPUFields(
  gpuFields: {
    density: Float32Array;
    velocityX: Float32Array;
    velocityY: Float32Array;
    velocityZ: Float32Array;
    gridResolution: number;
  },
  bounds: { min: [number, number, number]; max: [number, number, number] },
  isoLevel?: number,
  fieldType: MeshFieldType = 'velocity'
): MarchingCubesResult {
  const { density, velocityX, velocityY, velocityZ, gridResolution } = gpuFields;

  // Convert to GridFields format
  const fields: GridFields = {
    density,
    velocityX,
    velocityY,
    velocityZ,
  };

  // Auto-compute iso level if not provided
  if (isoLevel === undefined) {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < density.length; i++) {
      if (density[i] > 0) {
        sum += density[i];
        count++;
      }
    }
    isoLevel = count > 0 ? sum / count * 0.5 : 0.5;
  }

  // Run marching cubes with smooth normals and field interpolation
  return marchingCubes(fields, gridResolution, bounds, isoLevel, fieldType);
}

/**
 * Generate geometry from an SDF function using marching cubes
 * @param sdfFunc - Signed distance function that returns negative inside, positive outside
 * @param size - Size of the bounding cube
 * @param resolution - Number of cells per dimension
 * @returns Positions array and vertex count
 */
export function generateSDFGeometry(
  sdfFunc: (x: number, y: number, z: number) => number,
  size: number,
  resolution: number = 40
): { positions: Float32Array; vertexCount: number } {
  const step = size / resolution;
  const halfSize = size / 2;

  // Sample SDF on grid
  const values: number[][][] = [];
  for (let i = 0; i <= resolution; i++) {
    values[i] = [];
    for (let j = 0; j <= resolution; j++) {
      values[i][j] = [];
      for (let k = 0; k <= resolution; k++) {
        const x = -halfSize + i * step;
        const y = -halfSize + j * step;
        const z = -halfSize + k * step;
        values[i][j][k] = sdfFunc(x, y, z);
      }
    }
  }

  // Interpolate vertex on edge
  const interpolate = (p1: number[], p2: number[], v1: number, v2: number): number[] => {
    if (Math.abs(v1) < 1e-6) return p1;
    if (Math.abs(v2) < 1e-6) return p2;
    if (Math.abs(v1 - v2) < 1e-6) return p1;
    const t = -v1 / (v2 - v1);
    return [
      p1[0] + t * (p2[0] - p1[0]),
      p1[1] + t * (p2[1] - p1[1]),
      p1[2] + t * (p2[2] - p1[2])
    ];
  };

  const vertices: number[] = [];

  // Run marching cubes
  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      for (let k = 0; k < resolution; k++) {
        const x = -halfSize + i * step;
        const y = -halfSize + j * step;
        const z = -halfSize + k * step;

        // Get corner values
        const v = [
          values[i][j][k],
          values[i + 1][j][k],
          values[i + 1][j + 1][k],
          values[i][j + 1][k],
          values[i][j][k + 1],
          values[i + 1][j][k + 1],
          values[i + 1][j + 1][k + 1],
          values[i][j + 1][k + 1]
        ];

        // Calculate cube index (negative = inside)
        let cubeIndex = 0;
        if (v[0] < 0) cubeIndex |= 1;
        if (v[1] < 0) cubeIndex |= 2;
        if (v[2] < 0) cubeIndex |= 4;
        if (v[3] < 0) cubeIndex |= 8;
        if (v[4] < 0) cubeIndex |= 16;
        if (v[5] < 0) cubeIndex |= 32;
        if (v[6] < 0) cubeIndex |= 64;
        if (v[7] < 0) cubeIndex |= 128;

        if (EDGE_TABLE[cubeIndex] === 0) continue;

        // Corner positions
        const p = [
          [x, y, z],
          [x + step, y, z],
          [x + step, y + step, z],
          [x, y + step, z],
          [x, y, z + step],
          [x + step, y, z + step],
          [x + step, y + step, z + step],
          [x, y + step, z + step]
        ];

        // Calculate edge vertices
        const edgeVerts: (number[] | null)[] = new Array(12).fill(null);
        const edgeTable = EDGE_TABLE[cubeIndex];

        for (let e = 0; e < 12; e++) {
          if (edgeTable & (1 << e)) {
            const [i1, i2] = EDGE_VERTICES[e];
            edgeVerts[e] = interpolate(p[i1], p[i2], v[i1], v[i2]);
          }
        }

        // Generate triangles
        const tris = TRI_TABLE[cubeIndex];
        for (let t = 0; tris[t] !== -1; t += 3) {
          const v0 = edgeVerts[tris[t]];
          const v1 = edgeVerts[tris[t + 1]];
          const v2 = edgeVerts[tris[t + 2]];
          if (v0 && v1 && v2) {
            vertices.push(v0[0], v0[1], v0[2]);
            vertices.push(v1[0], v1[1], v1[2]);
            vertices.push(v2[0], v2[1], v2[2]);
          }
        }
      }
    }
  }

  return {
    positions: new Float32Array(vertices),
    vertexCount: vertices.length / 3
  };
}

/**
 * Generate thick-walled gyroid geometry
 * @param cubeSize - Size of the bounding cube
 * @param gyroidScale - Scale for the gyroid function (4π/size for 2 unit cells)
 * @param wallThickness - Thickness of the gyroid wall
 * @param resolution - Grid resolution for marching cubes
 */
export function generateGyroidGeometry(
  cubeSize: number,
  gyroidScale: number,
  wallThickness: number,
  resolution: number = 40
): { positions: Float32Array; vertexCount: number } {
  // Gyroid SDF: sin(x)cos(y) + sin(y)cos(z) + sin(z)cos(x)
  const gyroidSDF = (x: number, y: number, z: number): number => {
    const px = x * gyroidScale;
    const py = y * gyroidScale;
    const pz = z * gyroidScale;
    return Math.sin(px) * Math.cos(py) + Math.sin(py) * Math.cos(pz) + Math.sin(pz) * Math.cos(px);
  };

  // Thick-wall SDF: |gyroid| - thickness
  // Negative inside wall (solid), positive in void (empty)
  const thickWallSDF = (x: number, y: number, z: number): number => {
    return Math.abs(gyroidSDF(x, y, z)) - wallThickness;
  };

  return generateSDFGeometry(thickWallSDF, cubeSize, resolution);
}
