/**
 * TPMS Ray Marching Shader
 *
 * Enhanced version with all 14 microgen surface types and morphing support.
 */

export const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

export const QUALITY_TIERS = {
  low:    { volSteps: 48, surfSteps: 48, label: 'Low (Mobile)' },
  medium: { volSteps: 96, surfSteps: 96, label: 'Medium' },
  high:   { volSteps: 128, surfSteps: 128, label: 'High' },
} as const;

export type QualityTier = keyof typeof QUALITY_TIERS;

export function getFragmentShader(volSteps = 96, surfSteps = 96): string {
  return `
precision highp float;
varying vec2 vUv;

uniform vec2 uResolution;
uniform float uTime;
uniform float uFov;
uniform float uFrequency;
uniform float uScale;
uniform float uThickness;
uniform float uIso;
uniform float uRotation;
uniform float uLightIntensity;
uniform float uAmbient;
uniform float uContrast;
uniform float uSpecular;
uniform float uShininess;
uniform float uFieldRange;
uniform float uSurfaceType;
uniform float uMorphTarget;
uniform float uMorphFactor;
uniform float uRenderMode;
uniform float uFog;
uniform float uAoStrength;
uniform float uColormap;
uniform float uProjection;
uniform float uOrthoScale;
uniform float uPhaseX;
uniform float uPhaseY;
uniform float uPhaseZ;
uniform vec3 uCamPos;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec3 uCamForward;

const int VOL_STEPS = ${volSteps};
const int SURF_STEPS = ${surfSteps};
const float MAX_DIST = 12.0;
const vec3 BOX_SIZE = vec3(0.5);
const float PI = 3.14159265359;

// ============================================================================
// TPMS Surface Functions (all 14 types from microgen)
// ============================================================================

float gyroid(vec3 p) {
  return sin(p.x) * cos(p.y) + sin(p.y) * cos(p.z) + sin(p.z) * cos(p.x);
}

float schwarzP(vec3 p) {
  return cos(p.x) + cos(p.y) + cos(p.z);
}

float schwarzD(vec3 p) {
  return sin(p.x) * sin(p.y) * sin(p.z)
       + sin(p.x) * cos(p.y) * cos(p.z)
       + cos(p.x) * sin(p.y) * cos(p.z)
       + cos(p.x) * cos(p.y) * sin(p.z);
}

float neovius(vec3 p) {
  return 3.0 * (cos(p.x) + cos(p.y) + cos(p.z))
       + 4.0 * cos(p.x) * cos(p.y) * cos(p.z);
}

float schoenIWP(vec3 p) {
  return 2.0 * (cos(p.x) * cos(p.y) + cos(p.y) * cos(p.z) + cos(p.z) * cos(p.x))
       - (cos(2.0 * p.x) + cos(2.0 * p.y) + cos(2.0 * p.z));
}

float schoenFRD(vec3 p) {
  return 4.0 * cos(p.x) * cos(p.y) * cos(p.z)
       - (cos(2.0 * p.x) * cos(2.0 * p.y)
        + cos(2.0 * p.y) * cos(2.0 * p.z)
        + cos(2.0 * p.z) * cos(2.0 * p.x));
}

float fischerKochS(vec3 p) {
  return cos(2.0 * p.x) * sin(p.y) * cos(p.z)
       + cos(p.x) * cos(2.0 * p.y) * sin(p.z)
       + sin(p.x) * cos(p.y) * cos(2.0 * p.z);
}

float lidinoid(vec3 p) {
  return 0.5 * (sin(2.0 * p.x) * cos(p.y) * sin(p.z)
              + sin(2.0 * p.y) * cos(p.z) * sin(p.x)
              + sin(2.0 * p.z) * cos(p.x) * sin(p.y))
       - 0.5 * (cos(2.0 * p.x) * cos(2.0 * p.y)
              + cos(2.0 * p.y) * cos(2.0 * p.z)
              + cos(2.0 * p.z) * cos(2.0 * p.x))
       + 0.15;
}

float splitP(vec3 p) {
  return 1.1 * (sin(2.0 * p.x) * cos(p.y) * sin(p.z)
              + sin(2.0 * p.y) * cos(p.z) * sin(p.x)
              + sin(2.0 * p.z) * cos(p.x) * sin(p.y))
       - 0.2 * (cos(2.0 * p.x) * cos(2.0 * p.y)
              + cos(2.0 * p.y) * cos(2.0 * p.z)
              + cos(2.0 * p.z) * cos(2.0 * p.x))
       - 0.4 * (cos(2.0 * p.x) + cos(2.0 * p.y) + cos(2.0 * p.z));
}

float pmy(vec3 p) {
  return 2.0 * cos(p.x) * cos(p.y) * cos(p.z)
       + sin(2.0 * p.x) * sin(p.y)
       + sin(p.x) * sin(2.0 * p.z)
       + sin(2.0 * p.y) * sin(p.z);
}

// Honeycomb variants (absolute value)
float honeycombGyroid(vec3 p) {
  return abs(gyroid(p));
}

float honeycombSchwarzP(vec3 p) {
  return abs(schwarzP(p));
}

float honeycombSchwarzD(vec3 p) {
  return abs(schwarzD(p));
}

float honeycombIWP(vec3 p) {
  return abs(schoenIWP(p));
}

// Surface selector
float evaluateSurface(float surfaceType, vec3 p) {
  float t = floor(surfaceType + 0.5);
  if (t < 0.5) return gyroid(p);
  if (t < 1.5) return schwarzP(p);
  if (t < 2.5) return schwarzD(p);
  if (t < 3.5) return neovius(p);
  if (t < 4.5) return schoenIWP(p);
  if (t < 5.5) return schoenFRD(p);
  if (t < 6.5) return fischerKochS(p);
  if (t < 7.5) return lidinoid(p);
  if (t < 8.5) return splitP(p);
  if (t < 9.5) return pmy(p);
  if (t < 10.5) return honeycombGyroid(p);
  if (t < 11.5) return honeycombSchwarzP(p);
  if (t < 12.5) return honeycombSchwarzD(p);
  return honeycombIWP(p);
}

// ============================================================================
// Field Evaluation with Morphing
// ============================================================================

vec3 rotateY(vec3 p, float a) {
  float s = sin(a);
  float c = cos(a);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

float field(vec3 p) {
  vec3 q = rotateY(p, uRotation) * uFrequency;
  q += vec3(uPhaseX, uPhaseY, uPhaseZ);

  float base = evaluateSurface(uSurfaceType, q);

  // Apply morphing if factor > 0
  if (uMorphFactor > 0.001) {
    float target = evaluateSurface(uMorphTarget, q);
    base = mix(base, target, uMorphFactor);
  }

  return base - uIso;
}

float densityFromField(float f) {
  float d = abs(f);
  return smoothstep(uThickness, 0.0, d);
}

float fieldWorld(vec3 p) {
  return field(p * uScale);
}

// ============================================================================
// Colormaps
// ============================================================================

vec3 ramp5(float t, vec3 a, vec3 b, vec3 c, vec3 d, vec3 e) {
  float u = clamp(t, 0.0, 1.0);
  float x = u * 4.0;
  if (x < 1.0) return mix(a, b, x);
  if (x < 2.0) return mix(b, c, x - 1.0);
  if (x < 3.0) return mix(c, d, x - 2.0);
  return mix(d, e, x - 3.0);
}

vec3 colormap(float t) {
  float m = floor(uColormap + 0.5);
  if (m < 0.5) {
    // Blue-White-Red
    vec3 negCol = vec3(0.1, 0.35, 0.9);
    vec3 posCol = vec3(0.9, 0.2, 0.1);
    vec3 midCol = vec3(1.0);
    return t < 0.5
      ? mix(negCol, midCol, smoothstep(0.0, 0.5, t))
      : mix(midCol, posCol, smoothstep(0.5, 1.0, t));
  }
  if (m < 1.5) {
    // Viridis
    return ramp5(t,
      vec3(0.267, 0.004, 0.329),
      vec3(0.283, 0.141, 0.458),
      vec3(0.127, 0.566, 0.551),
      vec3(0.369, 0.789, 0.383),
      vec3(0.993, 0.906, 0.144));
  }
  if (m < 2.5) {
    // Plasma
    return ramp5(t,
      vec3(0.050, 0.030, 0.528),
      vec3(0.417, 0.031, 0.595),
      vec3(0.742, 0.215, 0.483),
      vec3(0.940, 0.501, 0.274),
      vec3(0.940, 0.975, 0.131));
  }
  if (m < 3.5) {
    // Magma
    return ramp5(t,
      vec3(0.001, 0.000, 0.013),
      vec3(0.270, 0.047, 0.407),
      vec3(0.673, 0.165, 0.294),
      vec3(0.956, 0.468, 0.268),
      vec3(0.987, 0.991, 0.750));
  }
  if (m < 4.5) {
    // Inferno
    return ramp5(t,
      vec3(0.001, 0.000, 0.014),
      vec3(0.258, 0.038, 0.406),
      vec3(0.578, 0.148, 0.404),
      vec3(0.894, 0.383, 0.201),
      vec3(0.988, 0.998, 0.645));
  }
  if (m < 5.5) {
    // Turbo
    return ramp5(t,
      vec3(0.189, 0.071, 0.232),
      vec3(0.163, 0.471, 0.884),
      vec3(0.315, 0.870, 0.469),
      vec3(0.928, 0.736, 0.110),
      vec3(0.645, 0.107, 0.043));
  }
  // Gray
  return vec3(t);
}

// ============================================================================
// Ambient Occlusion
// ============================================================================

float aoSample(vec3 p, vec3 n) {
  float occ = 0.0;
  float sca = 1.0;
  for (int i = 1; i <= 5; i++) {
    float h = 0.03 * float(i);
    float d = abs(field((p + n * h) * uScale));
    float a = smoothstep(0.0, uThickness, d);
    occ += (1.0 - a) * sca;
    sca *= 0.7;
  }
  return clamp(1.0 - occ * uAoStrength, 0.0, 1.0);
}

// ============================================================================
// Ray-Box Intersection
// ============================================================================

vec2 intersectBox(vec3 ro, vec3 rd, vec3 boxSize) {
  vec3 tMin = (-boxSize - ro) / rd;
  vec3 tMax = (boxSize - ro) / rd;
  vec3 t1 = min(tMin, tMax);
  vec3 t2 = max(tMin, tMax);
  float tNear = max(max(t1.x, t1.y), t1.z);
  float tFar = min(min(t2.x, t2.y), t2.z);
  return vec2(tNear, tFar);
}

vec3 boxNormal(vec3 p) {
  vec3 ap = abs(p);
  if (ap.x > ap.y && ap.x > ap.z) return vec3(sign(p.x), 0.0, 0.0);
  if (ap.y > ap.z) return vec3(0.0, sign(p.y), 0.0);
  return vec3(0.0, 0.0, sign(p.z));
}

// ============================================================================
// Main
// ============================================================================

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
  uv *= 2.0;

  vec3 ro = uCamPos;
  vec3 rd;
  if (uProjection > 0.5) {
    ro += (uCamRight * uv.x + uCamUp * uv.y) * uOrthoScale;
    rd = normalize(uCamForward);
  } else {
    float fovScale = tan(uFov * 0.5);
    rd = normalize(
      uCamForward +
      uv.x * uCamRight * fovScale +
      uv.y * uCamUp * fovScale
    );
  }

  vec2 bounds = intersectBox(ro, rd, BOX_SIZE);
  float tNear = bounds.x;
  float tFar = bounds.y;
  if (tNear > tFar || tFar < 0.0) {
    gl_FragColor = vec4(0.05, 0.05, 0.07, 1.0);
    return;
  }

  vec3 bg = vec3(0.05, 0.05, 0.07);
  float t0 = max(tNear, 0.0);
  float t1 = min(tFar, MAX_DIST);

  vec3 keyDir = normalize(-uCamForward + 0.5 * uCamRight + 0.4 * uCamUp);
  vec3 fillDir = normalize(-uCamForward - 0.6 * uCamRight + 0.1 * uCamUp);
  vec3 rimDir = normalize(-uCamForward - 0.2 * uCamRight - 0.7 * uCamUp);
  vec3 eps = vec3(0.003, 0.0, 0.0);

  // Volume rendering mode
  if (uRenderMode < 0.5) {
    float stepSize = (t1 - t0) / float(VOL_STEPS);
    vec3 acc = vec3(0.0);
    float alpha = 0.0;

    for (int i = 0; i < VOL_STEPS; i++) {
      float tStep = t0 + (float(i) + 0.5) * stepSize;
      vec3 p = ro + rd * tStep;
      float f = field(p * uScale);
      float density = densityFromField(f);
      if (density > 0.001) {
        float fx = field((p + eps.xyy) * uScale) - field((p - eps.xyy) * uScale);
        float fy = field((p + eps.yxy) * uScale) - field((p - eps.yxy) * uScale);
        float fz = field((p + eps.yyx) * uScale) - field((p - eps.yyx) * uScale);
        vec3 n = normalize(vec3(fx, fy, fz));
        float diffKey = max(dot(n, keyDir), 0.0);
        float diffFill = max(dot(n, fillDir), 0.0) * 0.5;
        float diffRim = max(dot(n, rimDir), 0.0) * 0.35;
        float diff = diffKey + diffFill + diffRim;
        float diffBoost = pow(diff, max(uContrast, 0.01));
        float ambientBoost = uAmbient * (1.0 / max(uContrast, 0.25));
        vec3 viewDir = normalize(-rd);
        vec3 halfKey = normalize(keyDir + viewDir);
        float spec = pow(max(dot(n, halfKey), 0.0), uShininess) * uSpecular;
        float fieldT = clamp(f / uFieldRange, -1.0, 1.0);
        vec3 base = colormap(0.5 * (fieldT + 1.0));
        float ao = aoSample(p, n);
        vec3 sampleCol = base * (ambientBoost + diffBoost * uLightIntensity) * ao + vec3(spec) * ao;
        float opacity = clamp(density * 2.0, 0.0, 1.0);
        acc += (1.0 - alpha) * sampleCol * opacity;
        alpha += (1.0 - alpha) * opacity;
        if (alpha > 0.98) break;
      }
    }

    vec3 volCol = mix(bg, acc, alpha);
    float fog = exp(-uFog * t1);
    gl_FragColor = vec4(mix(bg, volCol, fog), 1.0);
    return;
  }

  // Surface rendering mode
  bool capHit = false;
  float tHit = t0;
  vec3 capNormal = vec3(0.0);
  if (tNear > 0.0) {
    vec3 pEntry = ro + rd * t0;
    float gEntry = abs(fieldWorld(pEntry)) - uThickness;
    if (gEntry < 0.0) {
      capHit = true;
      capNormal = boxNormal(pEntry);
    }
  }

  float tSurf = t0;
  float gPrev = abs(fieldWorld(ro + rd * tSurf)) - uThickness;
  bool hit = capHit;

  if (!capHit) {
    for (int i = 1; i <= SURF_STEPS; i++) {
      float tCurr = mix(t0, t1, float(i) / float(SURF_STEPS));
      float gCurr = abs(fieldWorld(ro + rd * tCurr)) - uThickness;
      if (gPrev == 0.0 || (gPrev > 0.0) != (gCurr > 0.0)) {
        float a = tSurf;
        float b = tCurr;
        float ga = gPrev;
        float gb = gCurr;
        for (int j = 0; j < 10; j++) {
          float m = 0.5 * (a + b);
          float gm = abs(fieldWorld(ro + rd * m)) - uThickness;
          if ((ga > 0.0) != (gm > 0.0)) {
            b = m;
            gb = gm;
          } else {
            a = m;
            ga = gm;
          }
        }
        tHit = 0.5 * (a + b);
        hit = true;
        break;
      }
      tSurf = tCurr;
      gPrev = gCurr;
    }
  }

  if (!hit) {
    gl_FragColor = vec4(bg, 1.0);
    return;
  }

  vec3 p = ro + rd * tHit;
  vec3 viewDir = normalize(-rd);
  vec3 n = capHit ? capNormal : normalize(vec3(
    fieldWorld(p + eps.xyy) - fieldWorld(p - eps.xyy),
    fieldWorld(p + eps.yxy) - fieldWorld(p - eps.yxy),
    fieldWorld(p + eps.yyx) - fieldWorld(p - eps.yyx)
  ));
  if (!capHit) {
    float s = fieldWorld(p) < 0.0 ? -1.0 : 1.0;
    n = normalize(n * s);
  }
  if (dot(n, viewDir) < 0.0) {
    n = -n;
  }

  float diffKey = max(dot(n, keyDir), 0.0);
  float diffFill = max(dot(n, fillDir), 0.0) * 0.5;
  float diffRim = max(dot(n, rimDir), 0.0) * 0.35;
  float diff = diffKey + diffFill + diffRim;
  float diffBoost = pow(diff, max(uContrast, 0.01));
  float ambientBoost = uAmbient * (1.0 / max(uContrast, 0.25));
  vec3 halfKey = normalize(keyDir + viewDir);
  vec3 halfFill = normalize(fillDir + viewDir);
  vec3 halfRim = normalize(rimDir + viewDir);
  float spec = (
    pow(max(dot(n, halfKey), 0.0), uShininess) +
    0.5 * pow(max(dot(n, halfFill), 0.0), uShininess) +
    0.25 * pow(max(dot(n, halfRim), 0.0), uShininess)
  ) * uSpecular;
  float fieldT = clamp(fieldWorld(p) / uFieldRange, -1.0, 1.0);
  vec3 base = colormap(0.5 * (fieldT + 1.0));
  float ao = aoSample(p, n);
  vec3 surfCol = base * (ambientBoost + diffBoost * uLightIntensity) * ao + vec3(spec) * ao;
  gl_FragColor = vec4(surfCol, 1.0);
}
`;
}

// Backward-compatible default
export const fragmentShader = getFragmentShader();

/**
 * Default uniform values
 */
export const defaultUniforms = {
  uResolution: [1920, 1080],
  uTime: 0,
  uFov: Math.PI / 4,
  uFrequency: 2.0,
  uScale: 3.0,
  uThickness: 1.0,
  uIso: 0.0,
  uRotation: 0.0,
  uLightIntensity: 1.15,
  uAmbient: 0.6,
  uContrast: 0.9,
  uSpecular: 1.0,
  uShininess: 20.0,
  uFieldRange: 0.2,
  uSurfaceType: 0.0,
  uMorphTarget: 1.0,
  uMorphFactor: 0.0,
  uRenderMode: 1.0,
  uFog: 0.8,
  uAoStrength: 0.1,
  uColormap: 0.0,
  uProjection: 0.0,
  uOrthoScale: 1.0,
  uPhaseX: 0.0,
  uPhaseY: 0.0,
  uPhaseZ: 0.0,
};

/**
 * Surface type to index mapping
 */
export const SURFACE_INDEX: Record<string, number> = {
  'Gyroid': 0,
  'Schwarz P': 1,
  'Schwarz D': 2,
  'Neovius': 3,
  'Schoen IWP': 4,
  'Schoen FRD': 5,
  'Fischer-Koch S': 6,
  'Lidinoid': 7,
  'Split-P': 8,
  'PMY': 9,
  'Honeycomb Gyroid': 10,
  'Honeycomb Schwarz P': 11,
  'Honeycomb Schwarz D': 12,
  'Honeycomb IWP': 13,
};

/**
 * All surface names for UI
 */
export const SURFACE_NAMES = Object.keys(SURFACE_INDEX);

/**
 * Colormap to index mapping
 */
export const COLORMAP_INDEX: Record<string, number> = {
  'Blue-White-Red': 0,
  'Viridis': 1,
  'Plasma': 2,
  'Magma': 3,
  'Inferno': 4,
  'Turbo': 5,
  'Gray': 6,
};

export const COLORMAP_NAMES = Object.keys(COLORMAP_INDEX);
