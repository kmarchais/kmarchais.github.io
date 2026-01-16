/**
 * Lattice Ray Marching Shader
 *
 * GLSL shader for real-time visualization of strut-based lattice structures
 * using signed distance field (SDF) ray marching.
 */

export const vertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

export const fragmentShader = /* glsl */ `
precision highp float;

// Uniforms
uniform vec2 uResolution;
uniform float uTime;
uniform float uFov;

// Lattice parameters
uniform int uLatticeType;
uniform float uStrutRadius;
uniform float uNodeRadius;
uniform float uNodeSmoothing;
uniform float uCellSize;
uniform vec3 uRepeatCount;
uniform float uRotation;

// Rendering
uniform int uColormap;
uniform bool uParallelProjection;
uniform float uOrthoScale;

// Lighting
uniform float uLightIntensity;
uniform float uAmbient;
uniform float uContrast;
uniform float uSpecular;
uniform float uShininess;
uniform float uAoStrength;
uniform float uFog;

// Camera vectors (computed on CPU)
uniform vec3 uCamPos;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec3 uCamForward;

varying vec2 vUv;

// Constants
const int MAX_STEPS = 128;
const float MAX_DIST = 20.0;
const float SURF_DIST = 0.001;
const float PI = 3.14159265359;

// ============================================
// SDF Primitives
// ============================================

// Capsule (strut between two points)
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a;
  vec3 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

// Sphere (node)
float sdSphere(vec3 p, vec3 c, float r) {
  return length(p - c) - r;
}

// Smooth minimum (for blending nodes)
float smin(float a, float b, float k) {
  if (k <= 0.0) return min(a, b);
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}

// Box SDF for clipping
float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

// ============================================
// Lattice Unit Cells
// ============================================

// Simple Cubic: struts along cube edges
// Uses smin between struts for natural fillets at intersections
float latticeCubic(vec3 p, float sr, float nr, float sm) {
  float d = 1e10;

  // 12 edge struts with smooth blending
  // X-aligned edges
  d = smin(d, sdCapsule(p, vec3(0.0, 0.0, 0.0), vec3(1.0, 0.0, 0.0), sr), sm);
  d = smin(d, sdCapsule(p, vec3(0.0, 1.0, 0.0), vec3(1.0, 1.0, 0.0), sr), sm);
  d = smin(d, sdCapsule(p, vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 1.0), sr), sm);
  d = smin(d, sdCapsule(p, vec3(0.0, 1.0, 1.0), vec3(1.0, 1.0, 1.0), sr), sm);

  // Y-aligned edges
  d = smin(d, sdCapsule(p, vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0), sr), sm);
  d = smin(d, sdCapsule(p, vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 0.0), sr), sm);
  d = smin(d, sdCapsule(p, vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 1.0), sr), sm);
  d = smin(d, sdCapsule(p, vec3(1.0, 0.0, 1.0), vec3(1.0, 1.0, 1.0), sr), sm);

  // Z-aligned edges
  d = smin(d, sdCapsule(p, vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0), sr), sm);
  d = smin(d, sdCapsule(p, vec3(1.0, 0.0, 0.0), vec3(1.0, 0.0, 1.0), sr), sm);
  d = smin(d, sdCapsule(p, vec3(0.0, 1.0, 0.0), vec3(0.0, 1.0, 1.0), sr), sm);
  d = smin(d, sdCapsule(p, vec3(1.0, 1.0, 0.0), vec3(1.0, 1.0, 1.0), sr), sm);

  return d;
}

// BCC: Body-Centered Cubic - struts from corners to center
float latticeBCC(vec3 p, float sr, float nr, float sm) {
  float d = 1e10;
  vec3 center = vec3(0.5);

  // 8 struts from corners to center with smooth blending
  d = smin(d, sdCapsule(p, vec3(0.0, 0.0, 0.0), center, sr), sm);
  d = smin(d, sdCapsule(p, vec3(1.0, 0.0, 0.0), center, sr), sm);
  d = smin(d, sdCapsule(p, vec3(0.0, 1.0, 0.0), center, sr), sm);
  d = smin(d, sdCapsule(p, vec3(1.0, 1.0, 0.0), center, sr), sm);
  d = smin(d, sdCapsule(p, vec3(0.0, 0.0, 1.0), center, sr), sm);
  d = smin(d, sdCapsule(p, vec3(1.0, 0.0, 1.0), center, sr), sm);
  d = smin(d, sdCapsule(p, vec3(0.0, 1.0, 1.0), center, sr), sm);
  d = smin(d, sdCapsule(p, vec3(1.0, 1.0, 1.0), center, sr), sm);

  return d;
}

// FCC: Face-Centered Cubic - face diagonal struts
// Different from Octet: struts along face diagonals + edges
float latticeFCC(vec3 p, float sr, float nr, float sm) {
  float d = 1e10;

  // Cube edges (12 struts) - same as Simple Cubic
  // X-aligned
  d = smin(d, sdCapsule(p, vec3(0.0, 0.0, 0.0), vec3(1.0, 0.0, 0.0), sr), sm);
  d = smin(d, sdCapsule(p, vec3(0.0, 1.0, 0.0), vec3(1.0, 1.0, 0.0), sr), sm);
  d = smin(d, sdCapsule(p, vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 1.0), sr), sm);
  d = smin(d, sdCapsule(p, vec3(0.0, 1.0, 1.0), vec3(1.0, 1.0, 1.0), sr), sm);
  // Y-aligned
  d = smin(d, sdCapsule(p, vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0), sr), sm);
  d = smin(d, sdCapsule(p, vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 0.0), sr), sm);
  d = smin(d, sdCapsule(p, vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 1.0), sr), sm);
  d = smin(d, sdCapsule(p, vec3(1.0, 0.0, 1.0), vec3(1.0, 1.0, 1.0), sr), sm);
  // Z-aligned
  d = smin(d, sdCapsule(p, vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0), sr), sm);
  d = smin(d, sdCapsule(p, vec3(1.0, 0.0, 0.0), vec3(1.0, 0.0, 1.0), sr), sm);
  d = smin(d, sdCapsule(p, vec3(0.0, 1.0, 0.0), vec3(0.0, 1.0, 1.0), sr), sm);
  d = smin(d, sdCapsule(p, vec3(1.0, 1.0, 0.0), vec3(1.0, 1.0, 1.0), sr), sm);

  // Face diagonals (6 struts - one diagonal per face)
  // XY faces (z=0 and z=1)
  d = smin(d, sdCapsule(p, vec3(0.0, 0.0, 0.0), vec3(1.0, 1.0, 0.0), sr), sm);
  d = smin(d, sdCapsule(p, vec3(0.0, 0.0, 1.0), vec3(1.0, 1.0, 1.0), sr), sm);
  // XZ faces (y=0 and y=1)
  d = smin(d, sdCapsule(p, vec3(0.0, 0.0, 0.0), vec3(1.0, 0.0, 1.0), sr), sm);
  d = smin(d, sdCapsule(p, vec3(0.0, 1.0, 0.0), vec3(1.0, 1.0, 1.0), sr), sm);
  // YZ faces (x=0 and x=1)
  d = smin(d, sdCapsule(p, vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 1.0), sr), sm);
  d = smin(d, sdCapsule(p, vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 1.0), sr), sm);

  return d;
}

// Octet Truss: tetrahedra + octahedra combination
float latticeOctet(vec3 p, float sr, float nr, float sm) {
  float d = 1e10;

  // Corners and face centers
  vec3 c000 = vec3(0.0, 0.0, 0.0);
  vec3 c100 = vec3(1.0, 0.0, 0.0);
  vec3 c010 = vec3(0.0, 1.0, 0.0);
  vec3 c110 = vec3(1.0, 1.0, 0.0);
  vec3 c001 = vec3(0.0, 0.0, 1.0);
  vec3 c101 = vec3(1.0, 0.0, 1.0);
  vec3 c011 = vec3(0.0, 1.0, 1.0);
  vec3 c111 = vec3(1.0, 1.0, 1.0);

  vec3 fx0 = vec3(0.0, 0.5, 0.5);
  vec3 fx1 = vec3(1.0, 0.5, 0.5);
  vec3 fy0 = vec3(0.5, 0.0, 0.5);
  vec3 fy1 = vec3(0.5, 1.0, 0.5);
  vec3 fz0 = vec3(0.5, 0.5, 0.0);
  vec3 fz1 = vec3(0.5, 0.5, 1.0);

  // Struts from corners to adjacent face centers (24 total) with smooth blending
  // Corner (0,0,0)
  d = smin(d, sdCapsule(p, c000, fx0, sr), sm);
  d = smin(d, sdCapsule(p, c000, fy0, sr), sm);
  d = smin(d, sdCapsule(p, c000, fz0, sr), sm);

  // Corner (1,0,0)
  d = smin(d, sdCapsule(p, c100, fx1, sr), sm);
  d = smin(d, sdCapsule(p, c100, fy0, sr), sm);
  d = smin(d, sdCapsule(p, c100, fz0, sr), sm);

  // Corner (0,1,0)
  d = smin(d, sdCapsule(p, c010, fx0, sr), sm);
  d = smin(d, sdCapsule(p, c010, fy1, sr), sm);
  d = smin(d, sdCapsule(p, c010, fz0, sr), sm);

  // Corner (1,1,0)
  d = smin(d, sdCapsule(p, c110, fx1, sr), sm);
  d = smin(d, sdCapsule(p, c110, fy1, sr), sm);
  d = smin(d, sdCapsule(p, c110, fz0, sr), sm);

  // Corner (0,0,1)
  d = smin(d, sdCapsule(p, c001, fx0, sr), sm);
  d = smin(d, sdCapsule(p, c001, fy0, sr), sm);
  d = smin(d, sdCapsule(p, c001, fz1, sr), sm);

  // Corner (1,0,1)
  d = smin(d, sdCapsule(p, c101, fx1, sr), sm);
  d = smin(d, sdCapsule(p, c101, fy0, sr), sm);
  d = smin(d, sdCapsule(p, c101, fz1, sr), sm);

  // Corner (0,1,1)
  d = smin(d, sdCapsule(p, c011, fx0, sr), sm);
  d = smin(d, sdCapsule(p, c011, fy1, sr), sm);
  d = smin(d, sdCapsule(p, c011, fz1, sr), sm);

  // Corner (1,1,1)
  d = smin(d, sdCapsule(p, c111, fx1, sr), sm);
  d = smin(d, sdCapsule(p, c111, fy1, sr), sm);
  d = smin(d, sdCapsule(p, c111, fz1, sr), sm);

  return d;
}

// Diamond Cubic: tetrahedral coordination (each atom bonds to 4 neighbors)
float latticeDiamond(vec3 p, float sr, float nr, float sm) {
  float d = 1e10;

  // Diamond structure: 8 atoms per unit cell
  // 4 at FCC positions, 4 offset by (0.25, 0.25, 0.25)
  // Each atom has exactly 4 tetrahedral bonds

  // FCC positions (corners + face centers mapped to [0,1))
  vec3 a1 = vec3(0.0, 0.0, 0.0);
  vec3 a2 = vec3(0.0, 0.5, 0.5);
  vec3 a3 = vec3(0.5, 0.0, 0.5);
  vec3 a4 = vec3(0.5, 0.5, 0.0);

  // Offset positions (tetrahedral interstitials)
  vec3 b1 = vec3(0.25, 0.25, 0.25);
  vec3 b2 = vec3(0.25, 0.75, 0.75);
  vec3 b3 = vec3(0.75, 0.25, 0.75);
  vec3 b4 = vec3(0.75, 0.75, 0.25);

  // Each 'b' atom bonds to 4 'a' atoms (tetrahedral) with smooth blending
  // b1 (0.25, 0.25, 0.25) bonds to: a1, a2, a3, a4
  d = smin(d, sdCapsule(p, b1, a1, sr), sm);
  d = smin(d, sdCapsule(p, b1, a2, sr), sm);
  d = smin(d, sdCapsule(p, b1, a3, sr), sm);
  d = smin(d, sdCapsule(p, b1, a4, sr), sm);

  // b2 (0.25, 0.75, 0.75) bonds to: a2, and 3 in neighboring cells
  d = smin(d, sdCapsule(p, b2, a2, sr), sm);
  d = smin(d, sdCapsule(p, b2, vec3(0.0, 1.0, 1.0), sr), sm);  // a1 + (0,1,1)
  d = smin(d, sdCapsule(p, b2, vec3(0.5, 0.5, 1.0), sr), sm);  // a4 + (0,0,1)
  d = smin(d, sdCapsule(p, b2, vec3(0.5, 1.0, 0.5), sr), sm);  // a3 + (0,1,0)

  // b3 (0.75, 0.25, 0.75) bonds to: a3, and 3 in neighboring cells
  d = smin(d, sdCapsule(p, b3, a3, sr), sm);
  d = smin(d, sdCapsule(p, b3, vec3(1.0, 0.0, 1.0), sr), sm);  // a1 + (1,0,1)
  d = smin(d, sdCapsule(p, b3, vec3(1.0, 0.5, 0.5), sr), sm);  // a2 + (1,0,0)
  d = smin(d, sdCapsule(p, b3, vec3(0.5, 0.5, 1.0), sr), sm);  // a4 + (0,0,1)

  // b4 (0.75, 0.75, 0.25) bonds to: a4, and 3 in neighboring cells
  d = smin(d, sdCapsule(p, b4, a4, sr), sm);
  d = smin(d, sdCapsule(p, b4, vec3(1.0, 1.0, 0.0), sr), sm);  // a1 + (1,1,0)
  d = smin(d, sdCapsule(p, b4, vec3(1.0, 0.5, 0.5), sr), sm);  // a2 + (1,0,0)
  d = smin(d, sdCapsule(p, b4, vec3(0.5, 1.0, 0.5), sr), sm);  // a3 + (0,1,0)

  return d;
}

// Kelvin Cell (Tetrakaidecahedron): space-filling with 14 faces
float latticeKelvin(vec3 p, float sr, float nr, float sm) {
  float d = 1e10;

  // Kelvin cell vertices (scaled to unit cell)
  // The shape has 24 vertices forming a truncated octahedron
  float a = 0.25;
  float b = 0.5;

  // Square face vertices (6 squares, 4 vertices each = 24 but shared)
  vec3 v1 = vec3(0.0, a, b);
  vec3 v2 = vec3(0.0, b, a);
  vec3 v3 = vec3(0.0, 1.0-a, b);
  vec3 v4 = vec3(0.0, b, 1.0-a);

  vec3 v5 = vec3(1.0, a, b);
  vec3 v6 = vec3(1.0, b, a);
  vec3 v7 = vec3(1.0, 1.0-a, b);
  vec3 v8 = vec3(1.0, b, 1.0-a);

  vec3 v9 = vec3(a, 0.0, b);
  vec3 v10 = vec3(b, 0.0, a);
  vec3 v11 = vec3(1.0-a, 0.0, b);
  vec3 v12 = vec3(b, 0.0, 1.0-a);

  vec3 v13 = vec3(a, 1.0, b);
  vec3 v14 = vec3(b, 1.0, a);
  vec3 v15 = vec3(1.0-a, 1.0, b);
  vec3 v16 = vec3(b, 1.0, 1.0-a);

  vec3 v17 = vec3(a, b, 0.0);
  vec3 v18 = vec3(b, a, 0.0);
  vec3 v19 = vec3(1.0-a, b, 0.0);
  vec3 v20 = vec3(b, 1.0-a, 0.0);

  vec3 v21 = vec3(a, b, 1.0);
  vec3 v22 = vec3(b, a, 1.0);
  vec3 v23 = vec3(1.0-a, b, 1.0);
  vec3 v24 = vec3(b, 1.0-a, 1.0);

  // Square edges on X faces
  d = smin(d, sdCapsule(p, v1, v2, sr), sm);
  d = smin(d, sdCapsule(p, v2, v3, sr), sm);
  d = smin(d, sdCapsule(p, v3, v4, sr), sm);
  d = smin(d, sdCapsule(p, v4, v1, sr), sm);

  d = smin(d, sdCapsule(p, v5, v6, sr), sm);
  d = smin(d, sdCapsule(p, v6, v7, sr), sm);
  d = smin(d, sdCapsule(p, v7, v8, sr), sm);
  d = smin(d, sdCapsule(p, v8, v5, sr), sm);

  // Square edges on Y faces
  d = smin(d, sdCapsule(p, v9, v10, sr), sm);
  d = smin(d, sdCapsule(p, v10, v11, sr), sm);
  d = smin(d, sdCapsule(p, v11, v12, sr), sm);
  d = smin(d, sdCapsule(p, v12, v9, sr), sm);

  d = smin(d, sdCapsule(p, v13, v14, sr), sm);
  d = smin(d, sdCapsule(p, v14, v15, sr), sm);
  d = smin(d, sdCapsule(p, v15, v16, sr), sm);
  d = smin(d, sdCapsule(p, v16, v13, sr), sm);

  // Square edges on Z faces
  d = smin(d, sdCapsule(p, v17, v18, sr), sm);
  d = smin(d, sdCapsule(p, v18, v19, sr), sm);
  d = smin(d, sdCapsule(p, v19, v20, sr), sm);
  d = smin(d, sdCapsule(p, v20, v17, sr), sm);

  d = smin(d, sdCapsule(p, v21, v22, sr), sm);
  d = smin(d, sdCapsule(p, v22, v23, sr), sm);
  d = smin(d, sdCapsule(p, v23, v24, sr), sm);
  d = smin(d, sdCapsule(p, v24, v21, sr), sm);

  // Hexagonal face edges (connecting squares)
  d = smin(d, sdCapsule(p, v1, v9, sr), sm);
  d = smin(d, sdCapsule(p, v2, v17, sr), sm);
  d = smin(d, sdCapsule(p, v4, v21, sr), sm);
  d = smin(d, sdCapsule(p, v3, v13, sr), sm);

  d = smin(d, sdCapsule(p, v5, v11, sr), sm);
  d = smin(d, sdCapsule(p, v6, v19, sr), sm);
  d = smin(d, sdCapsule(p, v8, v23, sr), sm);
  d = smin(d, sdCapsule(p, v7, v15, sr), sm);

  d = smin(d, sdCapsule(p, v10, v18, sr), sm);
  d = smin(d, sdCapsule(p, v12, v22, sr), sm);
  d = smin(d, sdCapsule(p, v14, v20, sr), sm);
  d = smin(d, sdCapsule(p, v16, v24, sr), sm);

  return d;
}

// ============================================
// Lattice SDF with Repetition
// ============================================

// Evaluate single cell lattice SDF
float evalCell(vec3 cellP) {
  if (uLatticeType == 0) {
    return latticeCubic(cellP, uStrutRadius, uNodeRadius, uNodeSmoothing);
  } else if (uLatticeType == 1) {
    return latticeBCC(cellP, uStrutRadius, uNodeRadius, uNodeSmoothing);
  } else if (uLatticeType == 2) {
    return latticeFCC(cellP, uStrutRadius, uNodeRadius, uNodeSmoothing);
  } else if (uLatticeType == 3) {
    return latticeOctet(cellP, uStrutRadius, uNodeRadius, uNodeSmoothing);
  } else if (uLatticeType == 4) {
    return latticeDiamond(cellP, uStrutRadius, uNodeRadius, uNodeSmoothing);
  } else {
    return latticeKelvin(cellP, uStrutRadius, uNodeRadius, uNodeSmoothing);
  }
}

float evaluateLattice(vec3 p) {
  // Scale to cell coordinates
  vec3 scaled = p / uCellSize;

  // Get cell index and local position
  vec3 cellIdx = floor(scaled);
  vec3 localP = scaled - cellIdx;

  // Check if we're within the repeat bounds
  vec3 halfCount = uRepeatCount * 0.5;

  float d = 1e10;

  // Evaluate current cell and neighbors to handle boundary struts
  // Use smin to smoothly blend struts across cell boundaries
  for (int dx = -1; dx <= 1; dx++) {
    for (int dy = -1; dy <= 1; dy++) {
      for (int dz = -1; dz <= 1; dz++) {
        vec3 offset = vec3(float(dx), float(dy), float(dz));
        vec3 neighborIdx = cellIdx + offset;

        // Check if neighbor cell is within bounds
        if (all(greaterThanEqual(neighborIdx, -halfCount)) &&
            all(lessThan(neighborIdx, halfCount))) {
          // Evaluate lattice at offset position
          vec3 evalP = localP - offset;
          d = smin(d, evalCell(evalP), uNodeSmoothing);
        }
      }
    }
  }

  // Scale distance by cell size
  return d * uCellSize;
}

// Scene SDF with bounding box
float sceneSDF(vec3 p) {
  // Rotation around Y axis
  float c = cos(uRotation);
  float s = sin(uRotation);
  p = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);

  // Bounding box - slightly smaller to avoid edge artifacts
  vec3 halfExtent = uRepeatCount * uCellSize * 0.5;
  float boxDist = sdBox(p, halfExtent);

  // Early exit optimization for rays far from the geometry
  if (boxDist > 0.5) {
    return boxDist;
  }

  // Proper intersection: clip lattice to bounding box
  // max() creates a proper CSG intersection that cleanly cuts struts at boundaries
  float latticeDist = evaluateLattice(p);
  return max(boxDist, latticeDist);
}

// ============================================
// Ray Marching
// ============================================

vec3 calcNormal(vec3 p) {
  const float eps = 0.001;
  vec2 h = vec2(eps, 0.0);
  return normalize(vec3(
    sceneSDF(p + h.xyy) - sceneSDF(p - h.xyy),
    sceneSDF(p + h.yxy) - sceneSDF(p - h.yxy),
    sceneSDF(p + h.yyx) - sceneSDF(p - h.yyx)
  ));
}

float rayMarch(vec3 ro, vec3 rd) {
  float t = 0.0;

  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 p = ro + rd * t;
    float d = sceneSDF(p);

    if (d < SURF_DIST) {
      return t;
    }

    if (t > MAX_DIST) {
      break;
    }

    t += d * 0.8; // Slightly conservative step
  }

  return -1.0;
}

// ============================================
// Colormaps
// ============================================

vec3 viridis(float t) {
  const vec3 c0 = vec3(0.267, 0.005, 0.329);
  const vec3 c1 = vec3(0.283, 0.141, 0.458);
  const vec3 c2 = vec3(0.254, 0.265, 0.530);
  const vec3 c3 = vec3(0.163, 0.471, 0.558);
  const vec3 c4 = vec3(0.135, 0.659, 0.518);
  const vec3 c5 = vec3(0.478, 0.821, 0.318);
  const vec3 c6 = vec3(0.993, 0.906, 0.144);

  t = clamp(t, 0.0, 1.0);
  float idx = t * 6.0;
  int i = int(floor(idx));
  float f = fract(idx);

  if (i >= 6) return c6;
  if (i == 0) return mix(c0, c1, f);
  if (i == 1) return mix(c1, c2, f);
  if (i == 2) return mix(c2, c3, f);
  if (i == 3) return mix(c3, c4, f);
  if (i == 4) return mix(c4, c5, f);
  return mix(c5, c6, f);
}

vec3 plasma(float t) {
  const vec3 c0 = vec3(0.050, 0.030, 0.528);
  const vec3 c1 = vec3(0.418, 0.001, 0.654);
  const vec3 c2 = vec3(0.693, 0.165, 0.565);
  const vec3 c3 = vec3(0.881, 0.393, 0.383);
  const vec3 c4 = vec3(0.988, 0.652, 0.211);
  const vec3 c5 = vec3(0.940, 0.975, 0.131);

  t = clamp(t, 0.0, 1.0);
  float idx = t * 5.0;
  int i = int(floor(idx));
  float f = fract(idx);

  if (i >= 5) return c5;
  if (i == 0) return mix(c0, c1, f);
  if (i == 1) return mix(c1, c2, f);
  if (i == 2) return mix(c2, c3, f);
  if (i == 3) return mix(c3, c4, f);
  return mix(c4, c5, f);
}

vec3 turbo(float t) {
  const vec3 c0 = vec3(0.190, 0.072, 0.232);
  const vec3 c1 = vec3(0.276, 0.421, 0.819);
  const vec3 c2 = vec3(0.124, 0.712, 0.697);
  const vec3 c3 = vec3(0.493, 0.901, 0.332);
  const vec3 c4 = vec3(0.950, 0.879, 0.286);
  const vec3 c5 = vec3(0.960, 0.413, 0.056);

  t = clamp(t, 0.0, 1.0);
  float idx = t * 5.0;
  int i = int(floor(idx));
  float f = fract(idx);

  if (i >= 5) return c5;
  if (i == 0) return mix(c0, c1, f);
  if (i == 1) return mix(c1, c2, f);
  if (i == 2) return mix(c2, c3, f);
  if (i == 3) return mix(c3, c4, f);
  return mix(c4, c5, f);
}

vec3 getColormap(float t) {
  if (uColormap == 0) return vec3(1.0); // White
  if (uColormap == 1) return viridis(t);
  if (uColormap == 2) return plasma(t);
  if (uColormap == 3) return turbo(t);
  return vec3(0.8, 0.85, 0.9); // Gray
}

// ============================================
// Lighting
// ============================================

float calcAO(vec3 p, vec3 n) {
  float ao = 0.0;
  float scale = 1.0;

  for (int i = 1; i <= 5; i++) {
    float dist = 0.02 * float(i);
    float d = sceneSDF(p + n * dist);
    ao += (dist - d) * scale;
    scale *= 0.5;
  }

  return 1.0 - clamp(ao * uAoStrength, 0.0, 1.0);
}

vec3 shade(vec3 p, vec3 n, vec3 rd) {
  // Light directions
  vec3 light1 = normalize(vec3(0.8, 1.0, 0.6));
  vec3 light2 = normalize(vec3(-0.5, 0.3, -0.8));
  vec3 light3 = normalize(vec3(0.0, -1.0, 0.0));

  // Diffuse
  float diff1 = max(dot(n, light1), 0.0);
  float diff2 = max(dot(n, light2), 0.0) * 0.5;
  float diff3 = max(dot(n, -light3), 0.0) * 0.35;

  float diffuse = diff1 + diff2 + diff3;

  // Specular
  vec3 h = normalize(light1 - rd);
  float spec = pow(max(dot(n, h), 0.0), uShininess) * uSpecular;

  // AO
  float ao = calcAO(p, n);

  // Height-based color
  vec3 halfExtent = uRepeatCount * uCellSize * 0.5;
  float heightNorm = (p.y + halfExtent.y) / (2.0 * halfExtent.y);
  vec3 baseColor = getColormap(heightNorm);

  // Combine
  vec3 color = baseColor * (uAmbient + diffuse * uLightIntensity) * ao;
  color += vec3(1.0) * spec;

  // Contrast
  color = pow(color, vec3(uContrast));

  return color;
}

// ============================================
// Main
// ============================================

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;

  vec3 ro, rd;

  if (uParallelProjection) {
    // Orthographic
    ro = uCamPos + uCamRight * uv.x * uOrthoScale + uCamUp * uv.y * uOrthoScale;
    rd = uCamForward;
  } else {
    // Perspective (uFov is already in radians)
    float scale = tan(uFov * 0.5);
    rd = normalize(uCamForward + uCamRight * uv.x * scale + uCamUp * uv.y * scale);
    ro = uCamPos;
  }

  // Ray march
  float t = rayMarch(ro, rd);

  vec3 color;

  if (t > 0.0) {
    vec3 p = ro + rd * t;
    vec3 n = calcNormal(p);
    color = shade(p, n, rd);

    // Distance fog
    float fog = exp(-t * uFog * 0.05);
    vec3 bgColor = vec3(0.02, 0.02, 0.04);
    color = mix(bgColor, color, fog);
  } else {
    // Background gradient
    color = vec3(0.02, 0.02, 0.04) + uv.y * 0.02;
  }

  // Gamma correction
  color = pow(color, vec3(1.0 / 2.2));

  gl_FragColor = vec4(color, 1.0);
}
`;

// Lattice type index mapping
export const LATTICE_INDEX: Record<string, number> = {
  'Simple Cubic': 0,
  'BCC (Body-Centered)': 1,
  'FCC (Face-Centered)': 2,
  'Octet Truss': 3,
  'Diamond Cubic': 4,
  'Kelvin Cell': 5,
};

export const LATTICE_NAMES = Object.keys(LATTICE_INDEX);

// Colormap index mapping
export const COLORMAP_INDEX: Record<string, number> = {
  'White': 0,
  'Viridis': 1,
  'Plasma': 2,
  'Turbo': 3,
  'Gray': 4,
};

export const COLORMAP_NAMES = Object.keys(COLORMAP_INDEX);
