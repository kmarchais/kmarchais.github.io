import{j as i,b as t,F,C as vt,i as ht,f as gt,G as xt,e as yt,k as O,d as _}from"./vendor-r3f-b9e513d9.js";import{r as s}from"./vendor-react-11ad1bf9.js";import{m as T,c as g}from"./vendor-three-a8671fcb.js";import{L as bt,N as St}from"./index-5defc65d.js";import{B as Ct}from"./Breadcrumb-746ada9d.js";import"./vendor-ui-4807b111.js";const Lt=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`,w={low:{volSteps:48,surfSteps:48,label:"Low (Mobile)"},medium:{volSteps:96,surfSteps:96,label:"Medium"},high:{volSteps:128,surfSteps:128,label:"High"}};function zt(e=96,o=96){return`
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

const int VOL_STEPS = ${e};
const int SURF_STEPS = ${o};
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
`}const M={Gyroid:0,"Schwarz P":1,"Schwarz D":2,Neovius:3,"Schoen IWP":4,"Schoen FRD":5,"Fischer-Koch S":6,Lidinoid:7,"Split-P":8,PMY:9,"Honeycomb Gyroid":10,"Honeycomb Schwarz P":11,"Honeycomb Schwarz D":12,"Honeycomb IWP":13},W=Object.keys(M),D={"Blue-White-Red":0,Viridis:1,Plasma:2,Magma:3,Inferno:4,Turbo:5,Gray:6},Rt=Object.keys(D),Ft=[{id:0,name:"gyroid",displayName:"Gyroid",glsl:"sin(p.x) * cos(p.y) + sin(p.y) * cos(p.z) + sin(p.z) * cos(p.x)",description:"Discovered by Alan Schoen in 1970. Most common TPMS used in additive manufacturing.",category:"minimal",latex:"\\sin(x)\\cos(y) + \\sin(y)\\cos(z) + \\sin(z)\\cos(x)"},{id:1,name:"schwarzP",displayName:"Schwarz P",glsl:"cos(p.x) + cos(p.y) + cos(p.z)",description:"Primitive surface discovered by Karl Schwarz in 1865.",category:"minimal",latex:"\\cos(x) + \\cos(y) + \\cos(z)"},{id:2,name:"schwarzD",displayName:"Schwarz D",glsl:`sin(p.x) * sin(p.y) * sin(p.z)
         + sin(p.x) * cos(p.y) * cos(p.z)
         + cos(p.x) * sin(p.y) * cos(p.z)
         + cos(p.x) * cos(p.y) * sin(p.z)`,description:"Diamond surface by Karl Schwarz.",category:"minimal",latex:"\\sin x \\sin y \\sin z + \\sin x \\cos y \\cos z + \\cos x \\sin y \\cos z + \\cos x \\cos y \\sin z"},{id:3,name:"neovius",displayName:"Neovius",glsl:"3.0 * (cos(p.x) + cos(p.y) + cos(p.z)) + 4.0 * cos(p.x) * cos(p.y) * cos(p.z)",description:"Discovered by Edvard Neovius in 1883.",category:"minimal",latex:"3(\\cos x + \\cos y + \\cos z) + 4\\cos x \\cos y \\cos z"},{id:4,name:"schoenIWP",displayName:"Schoen IWP",glsl:`2.0 * (cos(p.x) * cos(p.y) + cos(p.y) * cos(p.z) + cos(p.z) * cos(p.x))
         - (cos(2.0 * p.x) + cos(2.0 * p.y) + cos(2.0 * p.z))`,description:"I-WP (Wrapped Package) surface by Alan Schoen.",category:"minimal",latex:"2(\\cos x \\cos y + \\cos y \\cos z + \\cos z \\cos x) - (\\cos 2x + \\cos 2y + \\cos 2z)"},{id:5,name:"schoenFRD",displayName:"Schoen FRD",glsl:`4.0 * cos(p.x) * cos(p.y) * cos(p.z)
         - (cos(2.0 * p.x) * cos(2.0 * p.y)
          + cos(2.0 * p.y) * cos(2.0 * p.z)
          + cos(2.0 * p.z) * cos(2.0 * p.x))`,description:"F-RD surface by Alan Schoen.",category:"minimal",latex:"4\\cos x \\cos y \\cos z - (\\cos 2x \\cos 2y + \\cos 2y \\cos 2z + \\cos 2z \\cos 2x)"},{id:6,name:"fischerKochS",displayName:"Fischer-Koch S",glsl:`cos(2.0 * p.x) * sin(p.y) * cos(p.z)
         + cos(p.x) * cos(2.0 * p.y) * sin(p.z)
         + sin(p.x) * cos(p.y) * cos(2.0 * p.z)`,description:"S surface discovered by Fischer and Koch.",category:"minimal",latex:"\\cos 2x \\sin y \\cos z + \\cos x \\cos 2y \\sin z + \\sin x \\cos y \\cos 2z"},{id:7,name:"lidinoid",displayName:"Lidinoid",glsl:`0.5 * (sin(2.0 * p.x) * cos(p.y) * sin(p.z)
              + sin(2.0 * p.y) * cos(p.z) * sin(p.x)
              + sin(2.0 * p.z) * cos(p.x) * sin(p.y))
         - 0.5 * (cos(2.0 * p.x) * cos(2.0 * p.y)
                + cos(2.0 * p.y) * cos(2.0 * p.z)
                + cos(2.0 * p.z) * cos(2.0 * p.x))
         + 0.15`,description:"Discovered by Sven Lidin in 1990.",category:"minimal"},{id:8,name:"splitP",displayName:"Split-P",glsl:`1.1 * (sin(2.0 * p.x) * cos(p.y) * sin(p.z)
              + sin(2.0 * p.y) * cos(p.z) * sin(p.x)
              + sin(2.0 * p.z) * cos(p.x) * sin(p.y))
         - 0.2 * (cos(2.0 * p.x) * cos(2.0 * p.y)
                + cos(2.0 * p.y) * cos(2.0 * p.z)
                + cos(2.0 * p.z) * cos(2.0 * p.x))
         - 0.4 * (cos(2.0 * p.x) + cos(2.0 * p.y) + cos(2.0 * p.z))`,description:"Split-P variation of the P surface.",category:"minimal"},{id:9,name:"pmy",displayName:"PMY",glsl:`2.0 * cos(p.x) * cos(p.y) * cos(p.z)
         + sin(2.0 * p.x) * sin(p.y)
         + sin(p.x) * sin(2.0 * p.z)
         + sin(2.0 * p.y) * sin(p.z)`,description:"PMY surface structure.",category:"minimal"},{id:10,name:"honeycombGyroid",displayName:"Honeycomb Gyroid",glsl:"abs(sin(p.x) * cos(p.y) + sin(p.y) * cos(p.z) + sin(p.z) * cos(p.x))",description:"Honeycomb variant of Gyroid using absolute value.",category:"honeycomb"},{id:11,name:"honeycombSchwarzP",displayName:"Honeycomb Schwarz P",glsl:"abs(cos(p.x) + cos(p.y) + cos(p.z))",description:"Honeycomb variant of Schwarz P.",category:"honeycomb"},{id:12,name:"honeycombSchwarzD",displayName:"Honeycomb Schwarz D",glsl:`abs(sin(p.x) * sin(p.y) * sin(p.z)
             + sin(p.x) * cos(p.y) * cos(p.z)
             + cos(p.x) * sin(p.y) * cos(p.z)
             + cos(p.x) * cos(p.y) * sin(p.z))`,description:"Honeycomb variant of Schwarz D.",category:"honeycomb"},{id:13,name:"honeycombIWP",displayName:"Honeycomb IWP",glsl:`abs(2.0 * (cos(p.x) * cos(p.y) + cos(p.y) * cos(p.z) + cos(p.z) * cos(p.x))
             - (cos(2.0 * p.x) + cos(2.0 * p.y) + cos(2.0 * p.z)))`,description:"Honeycomb variant of IWP surface.",category:"honeycomb"}],Mt=`
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`,Nt=`
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
uniform int uColorMode; // 0 = SDF, 1 = Height
uniform int uBlendMode; // 0 = None, 1 = Quadratic, 2 = Cubic, 3 = Exponential
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

// Distance to line segment (skeleton distance, no radius)
// This is the key primitive for smooth strut intersections
float sdLine(vec3 p, vec3 a, vec3 b) {
  vec3 pa = p - a;
  vec3 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

// Capsule (strut between two points) - kept for compatibility
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  return sdLine(p, a, b) - r;
}

// Sphere (node)
float sdSphere(vec3 p, vec3 c, float r) {
  return length(p - c) - r;
}

// ============================================
// Smooth Minimum Variants for Fillets
// ============================================

// Quadratic smooth min - classic smooth blend
float smin_quadratic(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}

// Cubic smooth min - tighter blending than quadratic
float smin_cubic(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * h * k / 6.0;
}

// Exponential smooth min - tightest blending profile
float smin_exp(float a, float b, float k) {
  float res = exp(-a / k) + exp(-b / k);
  return -k * log(max(res, 0.0001));
}

// Main smooth min function - selects based on blend mode
float smin(float a, float b, float k) {
  if (k <= 0.0001 || uBlendMode == 0) return min(a, b);

  if (uBlendMode == 1) {
    return smin_quadratic(a, b, k);
  } else if (uBlendMode == 2) {
    return smin_cubic(a, b, k);
  } else {
    return smin_exp(a, b, k);
  }
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
// sr = strut radius, sm = smooth blend factor for fillets
float latticeCubic(vec3 p, float sr, float sm) {
  float d = 1e10;

  // 12 edge struts - skeleton distances combined with smin for smooth fillets
  // X-aligned edges
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 0.0), vec3(1.0, 0.0, 0.0)), sm);
  d = smin(d, sdLine(p, vec3(0.0, 1.0, 0.0), vec3(1.0, 1.0, 0.0)), sm);
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 1.0)), sm);
  d = smin(d, sdLine(p, vec3(0.0, 1.0, 1.0), vec3(1.0, 1.0, 1.0)), sm);

  // Y-aligned edges
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0)), sm);
  d = smin(d, sdLine(p, vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 0.0)), sm);
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 1.0)), sm);
  d = smin(d, sdLine(p, vec3(1.0, 0.0, 1.0), vec3(1.0, 1.0, 1.0)), sm);

  // Z-aligned edges
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0)), sm);
  d = smin(d, sdLine(p, vec3(1.0, 0.0, 0.0), vec3(1.0, 0.0, 1.0)), sm);
  d = smin(d, sdLine(p, vec3(0.0, 1.0, 0.0), vec3(0.0, 1.0, 1.0)), sm);
  d = smin(d, sdLine(p, vec3(1.0, 1.0, 0.0), vec3(1.0, 1.0, 1.0)), sm);

  // Subtract strut radius to create the surface
  return d - sr;
}

// BCC: Body-Centered Cubic - struts from corners to center
float latticeBCC(vec3 p, float sr, float sm) {
  float d = 1e10;
  vec3 center = vec3(0.5);

  // 8 struts from corners to center - skeleton distances with smin for smooth fillets
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 0.0), center), sm);
  d = smin(d, sdLine(p, vec3(1.0, 0.0, 0.0), center), sm);
  d = smin(d, sdLine(p, vec3(0.0, 1.0, 0.0), center), sm);
  d = smin(d, sdLine(p, vec3(1.0, 1.0, 0.0), center), sm);
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 1.0), center), sm);
  d = smin(d, sdLine(p, vec3(1.0, 0.0, 1.0), center), sm);
  d = smin(d, sdLine(p, vec3(0.0, 1.0, 1.0), center), sm);
  d = smin(d, sdLine(p, vec3(1.0, 1.0, 1.0), center), sm);

  return d - sr;
}

// FCC: Face-Centered Cubic - face diagonal struts
// Different from Octet: struts along face diagonals + edges
float latticeFCC(vec3 p, float sr, float sm) {
  float d = 1e10;

  // Cube edges (12 struts) - skeleton distances with smin for smooth fillets
  // X-aligned
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 0.0), vec3(1.0, 0.0, 0.0)), sm);
  d = smin(d, sdLine(p, vec3(0.0, 1.0, 0.0), vec3(1.0, 1.0, 0.0)), sm);
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 1.0)), sm);
  d = smin(d, sdLine(p, vec3(0.0, 1.0, 1.0), vec3(1.0, 1.0, 1.0)), sm);
  // Y-aligned
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0)), sm);
  d = smin(d, sdLine(p, vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 0.0)), sm);
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 1.0)), sm);
  d = smin(d, sdLine(p, vec3(1.0, 0.0, 1.0), vec3(1.0, 1.0, 1.0)), sm);
  // Z-aligned
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0)), sm);
  d = smin(d, sdLine(p, vec3(1.0, 0.0, 0.0), vec3(1.0, 0.0, 1.0)), sm);
  d = smin(d, sdLine(p, vec3(0.0, 1.0, 0.0), vec3(0.0, 1.0, 1.0)), sm);
  d = smin(d, sdLine(p, vec3(1.0, 1.0, 0.0), vec3(1.0, 1.0, 1.0)), sm);

  // Face diagonals (6 struts - one diagonal per face)
  // XY faces (z=0 and z=1)
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 0.0), vec3(1.0, 1.0, 0.0)), sm);
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 1.0), vec3(1.0, 1.0, 1.0)), sm);
  // XZ faces (y=0 and y=1)
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 0.0), vec3(1.0, 0.0, 1.0)), sm);
  d = smin(d, sdLine(p, vec3(0.0, 1.0, 0.0), vec3(1.0, 1.0, 1.0)), sm);
  // YZ faces (x=0 and x=1)
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 1.0)), sm);
  d = smin(d, sdLine(p, vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 1.0)), sm);

  return d - sr;
}

// Octet Truss: tetrahedra + octahedra combination
float latticeOctet(vec3 p, float sr, float sm) {
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

  // Struts from corners to adjacent face centers (24 total) - with smin for smooth fillets
  // Corner (0,0,0)
  d = smin(d, sdLine(p, c000, fx0), sm);
  d = smin(d, sdLine(p, c000, fy0), sm);
  d = smin(d, sdLine(p, c000, fz0), sm);

  // Corner (1,0,0)
  d = smin(d, sdLine(p, c100, fx1), sm);
  d = smin(d, sdLine(p, c100, fy0), sm);
  d = smin(d, sdLine(p, c100, fz0), sm);

  // Corner (0,1,0)
  d = smin(d, sdLine(p, c010, fx0), sm);
  d = smin(d, sdLine(p, c010, fy1), sm);
  d = smin(d, sdLine(p, c010, fz0), sm);

  // Corner (1,1,0)
  d = smin(d, sdLine(p, c110, fx1), sm);
  d = smin(d, sdLine(p, c110, fy1), sm);
  d = smin(d, sdLine(p, c110, fz0), sm);

  // Corner (0,0,1)
  d = smin(d, sdLine(p, c001, fx0), sm);
  d = smin(d, sdLine(p, c001, fy0), sm);
  d = smin(d, sdLine(p, c001, fz1), sm);

  // Corner (1,0,1)
  d = smin(d, sdLine(p, c101, fx1), sm);
  d = smin(d, sdLine(p, c101, fy0), sm);
  d = smin(d, sdLine(p, c101, fz1), sm);

  // Corner (0,1,1)
  d = smin(d, sdLine(p, c011, fx0), sm);
  d = smin(d, sdLine(p, c011, fy1), sm);
  d = smin(d, sdLine(p, c011, fz1), sm);

  // Corner (1,1,1)
  d = smin(d, sdLine(p, c111, fx1), sm);
  d = smin(d, sdLine(p, c111, fy1), sm);
  d = smin(d, sdLine(p, c111, fz1), sm);

  return d - sr;
}

// Diamond Cubic: tetrahedral coordination (each atom bonds to 4 neighbors)
float latticeDiamond(vec3 p, float sr, float sm) {
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

  // Each 'b' atom bonds to 4 'a' atoms (tetrahedral) - with smin for smooth fillets
  // b1 (0.25, 0.25, 0.25) bonds to: a1, a2, a3, a4
  d = smin(d, sdLine(p, b1, a1), sm);
  d = smin(d, sdLine(p, b1, a2), sm);
  d = smin(d, sdLine(p, b1, a3), sm);
  d = smin(d, sdLine(p, b1, a4), sm);

  // b2 (0.25, 0.75, 0.75) bonds to: a2, and 3 in neighboring cells
  d = smin(d, sdLine(p, b2, a2), sm);
  d = smin(d, sdLine(p, b2, vec3(0.0, 1.0, 1.0)), sm);  // a1 + (0,1,1)
  d = smin(d, sdLine(p, b2, vec3(0.5, 0.5, 1.0)), sm);  // a4 + (0,0,1)
  d = smin(d, sdLine(p, b2, vec3(0.5, 1.0, 0.5)), sm);  // a3 + (0,1,0)

  // b3 (0.75, 0.25, 0.75) bonds to: a3, and 3 in neighboring cells
  d = smin(d, sdLine(p, b3, a3), sm);
  d = smin(d, sdLine(p, b3, vec3(1.0, 0.0, 1.0)), sm);  // a1 + (1,0,1)
  d = smin(d, sdLine(p, b3, vec3(1.0, 0.5, 0.5)), sm);  // a2 + (1,0,0)
  d = smin(d, sdLine(p, b3, vec3(0.5, 0.5, 1.0)), sm);  // a4 + (0,0,1)

  // b4 (0.75, 0.75, 0.25) bonds to: a4, and 3 in neighboring cells
  d = smin(d, sdLine(p, b4, a4), sm);
  d = smin(d, sdLine(p, b4, vec3(1.0, 1.0, 0.0)), sm);  // a1 + (1,1,0)
  d = smin(d, sdLine(p, b4, vec3(1.0, 0.5, 0.5)), sm);  // a2 + (1,0,0)
  d = smin(d, sdLine(p, b4, vec3(0.5, 1.0, 0.5)), sm);  // a3 + (0,1,0)

  return d - sr;
}

// Kelvin Cell (Tetrakaidecahedron): space-filling with 14 faces
float latticeKelvin(vec3 p, float sr, float sm) {
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

  // Square edges on X faces - with smin for smooth fillets
  d = smin(d, sdLine(p, v1, v2), sm);
  d = smin(d, sdLine(p, v2, v3), sm);
  d = smin(d, sdLine(p, v3, v4), sm);
  d = smin(d, sdLine(p, v4, v1), sm);

  d = smin(d, sdLine(p, v5, v6), sm);
  d = smin(d, sdLine(p, v6, v7), sm);
  d = smin(d, sdLine(p, v7, v8), sm);
  d = smin(d, sdLine(p, v8, v5), sm);

  // Square edges on Y faces
  d = smin(d, sdLine(p, v9, v10), sm);
  d = smin(d, sdLine(p, v10, v11), sm);
  d = smin(d, sdLine(p, v11, v12), sm);
  d = smin(d, sdLine(p, v12, v9), sm);

  d = smin(d, sdLine(p, v13, v14), sm);
  d = smin(d, sdLine(p, v14, v15), sm);
  d = smin(d, sdLine(p, v15, v16), sm);
  d = smin(d, sdLine(p, v16, v13), sm);

  // Square edges on Z faces
  d = smin(d, sdLine(p, v17, v18), sm);
  d = smin(d, sdLine(p, v18, v19), sm);
  d = smin(d, sdLine(p, v19, v20), sm);
  d = smin(d, sdLine(p, v20, v17), sm);

  d = smin(d, sdLine(p, v21, v22), sm);
  d = smin(d, sdLine(p, v22, v23), sm);
  d = smin(d, sdLine(p, v23, v24), sm);
  d = smin(d, sdLine(p, v24, v21), sm);

  // Hexagonal face edges (connecting squares)
  d = smin(d, sdLine(p, v1, v9), sm);
  d = smin(d, sdLine(p, v2, v17), sm);
  d = smin(d, sdLine(p, v4, v21), sm);
  d = smin(d, sdLine(p, v3, v13), sm);

  d = smin(d, sdLine(p, v5, v11), sm);
  d = smin(d, sdLine(p, v6, v19), sm);
  d = smin(d, sdLine(p, v8, v23), sm);
  d = smin(d, sdLine(p, v7, v15), sm);

  d = smin(d, sdLine(p, v10, v18), sm);
  d = smin(d, sdLine(p, v12, v22), sm);
  d = smin(d, sdLine(p, v14, v20), sm);
  d = smin(d, sdLine(p, v16, v24), sm);

  return d - sr;
}

// ============================================
// Lattice SDF with Repetition
// ============================================

// Evaluate single cell lattice SDF
// Passes smoothing parameter for smooth fillets at strut intersections
float evalCell(vec3 cellP) {
  if (uLatticeType == 0) {
    return latticeCubic(cellP, uStrutRadius, uNodeSmoothing);
  } else if (uLatticeType == 1) {
    return latticeBCC(cellP, uStrutRadius, uNodeSmoothing);
  } else if (uLatticeType == 2) {
    return latticeFCC(cellP, uStrutRadius, uNodeSmoothing);
  } else if (uLatticeType == 3) {
    return latticeOctet(cellP, uStrutRadius, uNodeSmoothing);
  } else if (uLatticeType == 4) {
    return latticeDiamond(cellP, uStrutRadius, uNodeSmoothing);
  } else {
    return latticeKelvin(cellP, uStrutRadius, uNodeSmoothing);
  }
}

float evaluateLattice(vec3 p) {
  // Offset to center the lattice at origin
  // This ensures unit cells are centered, not starting at origin
  vec3 offset = uRepeatCount * uCellSize * 0.5;
  vec3 centered = p + offset;

  // Scale to cell coordinates
  vec3 scaled = centered / uCellSize;

  // Get cell index and local position
  vec3 cellIdx = floor(scaled);
  vec3 localP = scaled - cellIdx;

  float d = 1e10;

  // Evaluate current cell and neighbors to handle boundary struts
  for (int dx = -1; dx <= 1; dx++) {
    for (int dy = -1; dy <= 1; dy++) {
      for (int dz = -1; dz <= 1; dz++) {
        vec3 cellOffset = vec3(float(dx), float(dy), float(dz));
        vec3 neighborIdx = cellIdx + cellOffset;

        // Check if neighbor cell is within bounds [0, repeatCount)
        if (all(greaterThanEqual(neighborIdx, vec3(0.0))) &&
            all(lessThan(neighborIdx, uRepeatCount))) {
          // Evaluate lattice at offset position
          vec3 evalP = localP - cellOffset;
          d = min(d, evalCell(evalP));
        }
      }
    }
  }

  // Scale distance by cell size
  // Note: smooth fillets are created by smin inside lattice functions
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

  // Color value based on mode
  float colorValue;
  if (uColorMode == 0) {
    // SDF-based color: use distance from surface
    float d = evaluateLattice(p);
    // Normalize SDF to [0, 1] range (strut radius as reference)
    colorValue = clamp(0.5 + d / (uStrutRadius * 4.0), 0.0, 1.0);
  } else {
    // Height-based color
    vec3 halfExtent = uRepeatCount * uCellSize * 0.5;
    colorValue = (p.y + halfExtent.y) / (2.0 * halfExtent.y);
  }
  vec3 baseColor = getColormap(colorValue);

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
`,k={"Simple Cubic":0,"BCC (Body-Centered)":1,"FCC (Face-Centered)":2,"Octet Truss":3,"Diamond Cubic":4,"Kelvin Cell":5},Pt=Object.keys(k),I={White:0,Viridis:1,Plasma:2,Turbo:3,Gray:4},Tt=Object.keys(I),E={SDF:0,Height:1},wt=Object.keys(E),A={"None (Sharp)":0,Quadratic:1,Cubic:2,Exponential:3},Dt=Object.keys(A),r=({label:e,value:o,min:n,max:c,step:a,onChange:p})=>i("div",{className:"flex flex-col gap-1",children:[i("div",{className:"flex justify-between text-xs",children:[t("span",{className:"text-secondary",children:e}),t("span",{className:"text-tertiary font-mono",children:o.toFixed(a<1?2:0)})]}),t("input",{type:"range",min:n,max:c,step:a,value:o,onChange:d=>p(parseFloat(d.target.value)),className:`w-full h-1.5 bg-surface rounded-lg appearance-none cursor-pointer
        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent
        [&::-webkit-slider-thumb]:hover:bg-accent-hover [&::-webkit-slider-thumb]:transition-colors`})]}),C=({label:e,value:o,options:n,onChange:c})=>i("div",{className:"flex flex-col gap-1",children:[t("span",{className:"text-xs text-secondary",children:e}),t("select",{value:o,onChange:a=>c(a.target.value),className:`w-full px-2 py-1.5 bg-surface text-tertiary text-sm rounded border border-surface
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-primary cursor-pointer`,children:n.map(a=>t("option",{value:a,children:a},a))})]}),H=({label:e,checked:o,onChange:n})=>i("label",{className:"flex items-center gap-2 cursor-pointer group",children:[t("input",{type:"checkbox",checked:o,onChange:c=>n(c.target.checked),className:"sr-only"}),t("div",{className:`w-4 h-4 rounded border ${o?"bg-accent border-accent":"bg-surface border-surface"}
      flex items-center justify-center transition-colors group-hover:border-accent`,children:o&&t("svg",{className:"w-3 h-3 text-primary",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",children:t("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:3,d:"M5 13l4 4L19 7"})})}),t("span",{className:"text-xs text-secondary",children:e})]}),b=({title:e,defaultOpen:o=!0,children:n})=>{const[c,a]=s.useState(o);return i("div",{className:"border-b border-surface last:border-b-0",children:[i("button",{onClick:()=>a(!c),className:"w-full flex items-center justify-between py-2 text-xs font-semibold text-tertiary uppercase tracking-wider hover:text-white transition-colors",children:[e,t("svg",{className:`w-4 h-4 transition-transform ${c?"rotate-180":""}`,fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",children:t("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M19 9l-7 7-7-7"})})]}),c&&t("div",{className:"pb-3 space-y-3",children:n})]})},kt=()=>i("div",{className:"absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm p-3 rounded-lg",children:[t("h3",{className:"text-sm font-semibold text-tertiary mb-1",children:"Controls"}),i("ul",{className:"text-xs text-secondary/80 space-y-0.5",children:[t("li",{children:"Left-click + drag: Rotate"}),t("li",{children:"Middle-click + drag: Pan"}),t("li",{children:"Scroll / Right-click: Zoom"})]})]}),It=({appName:e})=>i("section",{className:"h-screen flex items-center justify-center text-center px-8 text-secondary",children:["The ",e," requires a desktop browser for optimal performance."]}),Et=({params:e,fragmentShader:o})=>{const n=s.useRef(null),{size:c,camera:a,gl:p}=O(),d=s.useRef(c.width/c.height),y=p.domElement.width,h=p.domElement.height,l=s.useMemo(()=>({uResolution:{value:[y,h]},uTime:{value:0},uFov:{value:Math.PI/4},uFrequency:{value:e.frequency},uScale:{value:e.scale},uThickness:{value:e.thickness},uIso:{value:e.iso},uRotation:{value:e.rotation},uLightIntensity:{value:e.lightIntensity},uAmbient:{value:e.ambient},uContrast:{value:e.contrast},uSpecular:{value:e.specular},uShininess:{value:e.shininess},uFieldRange:{value:e.fieldRange},uSurfaceType:{value:M[e.surface]??0},uMorphTarget:{value:M[e.morphTarget]??1},uMorphFactor:{value:e.morphFactor},uRenderMode:{value:e.renderMode==="Surface"?1:0},uFog:{value:e.fog},uAoStrength:{value:e.aoStrength},uColormap:{value:D[e.colormap]??0},uProjection:{value:e.parallelProjection?1:0},uOrthoScale:{value:1},uPhaseX:{value:e.phaseX},uPhaseY:{value:e.phaseY},uPhaseZ:{value:e.phaseZ},uCamPos:{value:a.position.clone()},uCamRight:{value:new g(1,0,0)},uCamUp:{value:new g(0,1,0)},uCamForward:{value:new g(0,0,-1)}}),[y,h]);return s.useEffect(()=>{const m=p.domElement.width,f=p.domElement.height,v=m/f;l.uResolution.value=[m,f],Math.abs(v-d.current)>.001&&(a.aspect=v,a.updateProjectionMatrix(),d.current=v)},[a,c,l,p]),_(({clock:m})=>{if(!n.current)return;const f=a;n.current.uniforms.uTime.value=m.getElapsedTime(),n.current.uniforms.uFov.value=f.fov*Math.PI/180,n.current.uniforms.uProjection.value=e.parallelProjection?1:0;const v=a.position.length();n.current.uniforms.uOrthoScale.value=Math.max(v*Math.tan(f.fov*Math.PI/360),.001),n.current.uniforms.uCamPos.value.copy(a.position),a.updateMatrixWorld();const x=new g;a.getWorldDirection(x).normalize();const R=new g().crossVectors(x,a.up).normalize(),N=new g().crossVectors(R,x).normalize();n.current.uniforms.uCamRight.value.copy(R),n.current.uniforms.uCamUp.value.copy(N),n.current.uniforms.uCamForward.value.copy(x),n.current.uniforms.uFrequency.value=e.frequency,n.current.uniforms.uScale.value=e.scale,n.current.uniforms.uThickness.value=e.thickness,n.current.uniforms.uIso.value=e.iso,n.current.uniforms.uRotation.value=e.rotation,n.current.uniforms.uLightIntensity.value=e.lightIntensity,n.current.uniforms.uAmbient.value=e.ambient,n.current.uniforms.uContrast.value=e.contrast,n.current.uniforms.uSpecular.value=e.specular,n.current.uniforms.uShininess.value=e.shininess,n.current.uniforms.uFieldRange.value=e.fieldRange,n.current.uniforms.uFog.value=e.fog,n.current.uniforms.uAoStrength.value=e.aoStrength,n.current.uniforms.uSurfaceType.value=M[e.surface]??0,n.current.uniforms.uMorphTarget.value=M[e.morphTarget]??1,n.current.uniforms.uMorphFactor.value=e.morphFactor,n.current.uniforms.uRenderMode.value=e.renderMode==="Surface"?1:0,n.current.uniforms.uColormap.value=D[e.colormap]??0,n.current.uniforms.uPhaseX.value=e.phaseX,n.current.uniforms.uPhaseY.value=e.phaseY,n.current.uniforms.uPhaseZ.value=e.phaseZ}),i("mesh",{children:[t("planeGeometry",{args:[2,2]}),t("shaderMaterial",{ref:n,uniforms:l,vertexShader:Lt,fragmentShader:o})]})},At=({params:e})=>{const o=s.useRef(null),{size:n,camera:c,gl:a}=O(),p=s.useRef(n.width/n.height),d=a.domElement.width,y=a.domElement.height,h=s.useMemo(()=>({uResolution:{value:[d,y]},uTime:{value:0},uFov:{value:Math.PI/4},uLatticeType:{value:k[e.latticeType]??0},uStrutRadius:{value:e.strutRadius},uNodeRadius:{value:e.nodeRadius},uNodeSmoothing:{value:e.nodeSmoothing},uCellSize:{value:e.cellSize},uRepeatCount:{value:new g(e.repeatX,e.repeatY,e.repeatZ)},uRotation:{value:e.rotation},uColormap:{value:I[e.colormap]??1},uColorMode:{value:E[e.colorMode]??0},uBlendMode:{value:A[e.blendMode]??1},uParallelProjection:{value:e.parallelProjection},uOrthoScale:{value:1},uLightIntensity:{value:e.lightIntensity},uAmbient:{value:e.ambient},uContrast:{value:e.contrast},uSpecular:{value:e.specular},uShininess:{value:e.shininess},uAoStrength:{value:e.aoStrength},uFog:{value:e.fog},uCamPos:{value:c.position.clone()},uCamRight:{value:new g(1,0,0)},uCamUp:{value:new g(0,1,0)},uCamForward:{value:new g(0,0,-1)}}),[d,y]);return s.useEffect(()=>{const l=a.domElement.width,m=a.domElement.height,f=l/m;h.uResolution.value=[l,m],Math.abs(f-p.current)>.001&&(c.aspect=f,c.updateProjectionMatrix(),p.current=f)},[c,n,h,a]),_(({clock:l})=>{if(!o.current)return;const m=c;o.current.uniforms.uTime.value=l.getElapsedTime(),o.current.uniforms.uFov.value=m.fov*Math.PI/180,o.current.uniforms.uParallelProjection.value=e.parallelProjection;const f=c.position.length();o.current.uniforms.uOrthoScale.value=Math.max(f*Math.tan(m.fov*Math.PI/360),.001),o.current.uniforms.uCamPos.value.copy(c.position),c.updateMatrixWorld();const v=new g;c.getWorldDirection(v).normalize();const x=new g().crossVectors(v,c.up).normalize(),R=new g().crossVectors(x,v).normalize();o.current.uniforms.uCamRight.value.copy(x),o.current.uniforms.uCamUp.value.copy(R),o.current.uniforms.uCamForward.value.copy(v),o.current.uniforms.uLatticeType.value=k[e.latticeType]??0,o.current.uniforms.uStrutRadius.value=e.strutRadius,o.current.uniforms.uNodeRadius.value=e.nodeRadius,o.current.uniforms.uNodeSmoothing.value=e.nodeSmoothing,o.current.uniforms.uCellSize.value=e.cellSize,o.current.uniforms.uRepeatCount.value.set(e.repeatX,e.repeatY,e.repeatZ),o.current.uniforms.uRotation.value=e.rotation,o.current.uniforms.uColormap.value=I[e.colormap]??1,o.current.uniforms.uColorMode.value=E[e.colorMode]??0,o.current.uniforms.uBlendMode.value=A[e.blendMode]??1,o.current.uniforms.uLightIntensity.value=e.lightIntensity,o.current.uniforms.uAmbient.value=e.ambient,o.current.uniforms.uContrast.value=e.contrast,o.current.uniforms.uSpecular.value=e.specular,o.current.uniforms.uShininess.value=e.shininess,o.current.uniforms.uAoStrength.value=e.aoStrength,o.current.uniforms.uFog.value=e.fog}),i("mesh",{children:[t("planeGeometry",{args:[2,2]}),t("shaderMaterial",{ref:o,uniforms:h,vertexShader:Mt,fragmentShader:Nt})]})};function Ot(e,o,n,c){const a=Math.max(e,o,n),d=c*Math.PI/180/2,h=a*.85/Math.tan(d),l=1/Math.sqrt(3),m=h*l;return[m,m,m]}const _t=({onUpdate:e})=>{const{gl:o}=O(),n=s.useRef(0),c=s.useRef(performance.now()),a=s.useRef([]),p=s.useRef(null);return s.useEffect(()=>{const d=o.getContext().getExtension("WEBGL_debug_renderer_info");d&&(p.current=o.getContext().getParameter(d.UNMASKED_RENDERER_WEBGL))},[o]),_(()=>{const d=performance.now(),y=d-c.current;if(c.current=d,a.current.push(y),a.current.length>60&&a.current.shift(),n.current++,n.current>=30){const h=a.current.reduce((v,x)=>v+x,0)/a.current.length,l=1e3/h,m=performance.memory?performance.memory.usedJSHeapSize/(1024*1024):null,f=o.info;e({fps:l,frameTime:h,memory:m,drawCalls:f.render.calls,triangles:f.render.triangles,gpuName:p.current}),n.current=0}}),null},X=({active:e,onClick:o,children:n})=>t("button",{onClick:o,className:`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${e?"bg-accent text-primary":"text-secondary hover:text-tertiary hover:bg-surface"}`,children:n}),Bt=({params:e,setParams:o})=>i(F,{children:[t("div",{className:"mb-4",children:t(C,{label:"Surface Type",value:e.surface,options:W,onChange:o.setSurface})}),i(b,{title:"Structure",children:[t(r,{label:"Thickness",value:e.thickness,min:.02,max:3,step:.01,onChange:o.setThickness}),t(r,{label:"Repetitions",value:e.frequency,min:.5,max:6,step:.1,onChange:o.setFrequency}),t(r,{label:"Cell Size",value:e.scale,min:.5,max:5,step:.1,onChange:o.setScale}),t(r,{label:"Offset",value:e.iso,min:-1,max:1,step:.01,onChange:o.setIso})]}),i(b,{title:"Phase Shift",defaultOpen:!1,children:[t(r,{label:"X",value:e.phaseX,min:0,max:6.28,step:.01,onChange:o.setPhaseX}),t(r,{label:"Y",value:e.phaseY,min:0,max:6.28,step:.01,onChange:o.setPhaseY}),t(r,{label:"Z",value:e.phaseZ,min:0,max:6.28,step:.01,onChange:o.setPhaseZ})]}),i(b,{title:"Morphing",defaultOpen:!1,children:[t(C,{label:"Target",value:e.morphTarget,options:W,onChange:o.setMorphTarget}),t(r,{label:"Blend",value:e.morphFactor,min:0,max:1,step:.01,onChange:o.setMorphFactor})]}),i(b,{title:"Rendering",defaultOpen:!1,children:[t(C,{label:"Mode",value:e.renderMode,options:["Volume","Surface"],onChange:o.setRenderMode}),t(C,{label:"Colormap",value:e.colormap,options:Rt,onChange:o.setColormap}),t(H,{label:"Orthographic",checked:e.parallelProjection,onChange:o.setParallelProjection}),t(r,{label:"Rotation",value:e.rotation,min:0,max:6.28,step:.01,onChange:o.setRotation})]}),i(b,{title:"Lighting",defaultOpen:!1,children:[t(r,{label:"Intensity",value:e.lightIntensity,min:.2,max:3,step:.05,onChange:o.setLightIntensity}),t(r,{label:"Ambient",value:e.ambient,min:0,max:1,step:.05,onChange:o.setAmbient}),t(r,{label:"Contrast",value:e.contrast,min:.5,max:4,step:.05,onChange:o.setContrast}),t(r,{label:"Specular",value:e.specular,min:0,max:1,step:.01,onChange:o.setSpecular}),t(r,{label:"Shininess",value:e.shininess,min:4,max:128,step:1,onChange:o.setShininess}),t(r,{label:"Field Range",value:e.fieldRange,min:.2,max:3,step:.05,onChange:o.setFieldRange}),t(r,{label:"AO",value:e.aoStrength,min:0,max:2,step:.05,onChange:o.setAoStrength}),t(r,{label:"Fog",value:e.fog,min:0,max:3,step:.05,onChange:o.setFog})]})]}),jt=({params:e,setParams:o})=>i(F,{children:[t("div",{className:"mb-4",children:t(C,{label:"Lattice Type",value:e.latticeType,options:Pt,onChange:o.setLatticeType})}),i(b,{title:"Structure",children:[t(r,{label:"Strut Radius",value:e.strutRadius,min:.01,max:.15,step:.005,onChange:o.setStrutRadius}),t(C,{label:"Fillet Mode",value:e.blendMode,options:Dt,onChange:o.setBlendMode}),t(r,{label:"Fillet Radius",value:e.nodeSmoothing,min:0,max:.5,step:.01,onChange:o.setNodeSmoothing}),t(r,{label:"Cell Size",value:e.cellSize,min:.5,max:2,step:.1,onChange:o.setCellSize})]}),i(b,{title:"Repetitions",children:[t(r,{label:"X",value:e.repeatX,min:1,max:5,step:1,onChange:o.setRepeatX}),t(r,{label:"Y",value:e.repeatY,min:1,max:5,step:1,onChange:o.setRepeatY}),t(r,{label:"Z",value:e.repeatZ,min:1,max:5,step:1,onChange:o.setRepeatZ})]}),i(b,{title:"Rendering",defaultOpen:!1,children:[t(C,{label:"Color Mode",value:e.colorMode,options:wt,onChange:o.setColorMode}),t(C,{label:"Colormap",value:e.colormap,options:Tt,onChange:o.setColormap}),t(H,{label:"Orthographic",checked:e.parallelProjection,onChange:o.setParallelProjection}),t(r,{label:"Rotation",value:e.rotation,min:0,max:6.28,step:.01,onChange:o.setRotation})]}),i(b,{title:"Lighting",defaultOpen:!1,children:[t(r,{label:"Intensity",value:e.lightIntensity,min:.2,max:3,step:.05,onChange:o.setLightIntensity}),t(r,{label:"Ambient",value:e.ambient,min:0,max:1,step:.05,onChange:o.setAmbient}),t(r,{label:"Contrast",value:e.contrast,min:.5,max:2,step:.05,onChange:o.setContrast}),t(r,{label:"Specular",value:e.specular,min:0,max:1,step:.05,onChange:o.setSpecular}),t(r,{label:"Shininess",value:e.shininess,min:4,max:128,step:1,onChange:o.setShininess}),t(r,{label:"AO",value:e.aoStrength,min:0,max:2,step:.05,onChange:o.setAoStrength}),t(r,{label:"Fog",value:e.fog,min:0,max:2,step:.05,onChange:o.setFog})]})]});function Wt(){const e=navigator.hardwareConcurrency??4;return e<=4?"low":e<=8?"medium":"high"}const Gt=()=>{const[e,o]=s.useState(!1),[n,c]=s.useState("tpms"),[a,p]=s.useState(0),[d,y]=s.useState(Wt),h=s.useMemo(()=>{const u=w[d];return zt(u.volSteps,u.surfSteps)},[d]),[l,m]=s.useState({fps:0,frameTime:0,memory:null,drawCalls:0,triangles:0,gpuName:null}),f=s.useCallback(u=>{m(u)},[]),[v,x]=s.useState("Gyroid"),[R,N]=s.useState("Schwarz P"),[Y,q]=s.useState(0),[U,Z]=s.useState("Surface"),[G,K]=s.useState(!1),[V,$]=s.useState(2),[Q,J]=s.useState(3),[ee,te]=s.useState(1),[oe,ne]=s.useState(0),[se,ie]=s.useState(0),[ae,ce]=s.useState(1.15),[re,le]=s.useState(.6),[ue,de]=s.useState(.9),[me,pe]=s.useState(1),[fe,ve]=s.useState(20),[he,ge]=s.useState(.2),[xe,ye]=s.useState(.8),[be,Se]=s.useState(.1),[Ce,Le]=s.useState("Viridis"),[ze,Re]=s.useState(0),[Fe,Me]=s.useState(0),[Ne,Pe]=s.useState(0),[B,Te]=s.useState("Octet Truss"),[we,De]=s.useState(.04),[ke,Ie]=s.useState(.06),[Ee,Ae]=s.useState(.02),[Oe,_e]=s.useState("Quadratic"),[Be,je]=s.useState(1),[We,Xe]=s.useState(1),[He,Ye]=s.useState(1),[qe,Ue]=s.useState(1),[Ze,Ge]=s.useState("Viridis"),[Ke,Ve]=s.useState("SDF"),[$e,Qe]=s.useState(!1),[Je,et]=s.useState(0),[tt,ot]=s.useState(1.2),[nt,st]=s.useState(.5),[it,at]=s.useState(1),[ct,rt]=s.useState(.8),[lt,ut]=s.useState(32),[dt,mt]=s.useState(.3),[pt,ft]=s.useState(.5),j={surface:v,morphTarget:R,morphFactor:Y,renderMode:U,parallelProjection:G,frequency:V,scale:Q,thickness:ee,iso:oe,rotation:se,lightIntensity:ae,ambient:re,contrast:ue,specular:me,shininess:fe,fieldRange:he,fog:xe,aoStrength:be,colormap:Ce,phaseX:ze,phaseY:Fe,phaseZ:Ne},S={latticeType:B,strutRadius:we,nodeRadius:ke,nodeSmoothing:Ee,blendMode:Oe,cellSize:Be,repeatX:We,repeatY:He,repeatZ:qe,colormap:Ze,colorMode:Ke,parallelProjection:$e,rotation:Je,lightIntensity:tt,ambient:nt,contrast:it,specular:ct,shininess:lt,aoStrength:dt,fog:pt};s.useEffect(()=>{const u=window.matchMedia("(max-width: 768px)"),P=()=>o(u.matches);return P(),u.addEventListener("change",P),()=>u.removeEventListener("change",P)},[]);const L=Ft.find(u=>u.displayName===v),z=bt.find(u=>u.displayName===B);return i("div",{className:"min-h-screen bg-primary flex flex-col",children:[t(St,{}),e?t(It,{appName:"Computational Geometry Studio"}):i(F,{children:[i("div",{className:"pt-16 bg-surface-dark border-b border-surface",children:[t(Ct,{items:[{label:"Home",path:"/"},{label:"Computational Geometry"}]}),i("div",{className:"flex items-center justify-between px-6 py-3",children:[i("div",{children:[t("h1",{className:"text-xl font-bold text-tertiary",children:"Computational Geometry"}),t("p",{className:"text-secondary text-xs",children:n==="tpms"?i(F,{children:["TPMS from"," ",t("a",{href:"https://github.com/3MAH/microgen",target:"_blank",rel:"noopener noreferrer",className:"underline hover:text-tertiary",children:"microgen"})]}):"Strut-based lattice structures"})]}),i("div",{className:"flex items-center gap-3",children:[i("div",{className:"flex gap-1 bg-surface/50 rounded-lg p-1",children:[t(X,{active:n==="tpms",onClick:()=>c("tpms"),children:"TPMS"}),t(X,{active:n==="lattice",onClick:()=>c("lattice"),children:"Lattice"})]}),n==="tpms"&&t("select",{value:d,onChange:u=>y(u.target.value),className:"bg-surface/50 text-secondary text-xs rounded-lg px-2 py-1 border border-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer",title:"Shader quality",children:Object.keys(w).map(u=>t("option",{value:u,children:w[u].label},u))})]})]})]}),i("section",{className:"flex-1 flex min-h-0",children:[i("div",{className:"flex-1 relative min-w-0",children:[i(vt,{dpr:1.25,gl:{antialias:!0},style:{position:"absolute",top:0,left:0,width:"100%",height:"100%"},children:[t(ht,{makeDefault:!0,position:Ot(n==="tpms"?1:S.repeatX*S.cellSize,n==="tpms"?1:S.repeatY*S.cellSize,n==="tpms"?1:S.repeatZ*S.cellSize,45),fov:45}),t(gt,{enableDamping:!0,target:[0,0,0],mouseButtons:{LEFT:T.ROTATE,MIDDLE:T.PAN,RIGHT:T.DOLLY}}),n==="tpms"?t(Et,{params:j,fragmentShader:h}):t(At,{params:S}),t(xt,{alignment:"bottom-left",margin:[80,80],children:t(yt,{axisColors:["#d43d3d","#2fb36d","#2d6cdf"]})}),t(_t,{onUpdate:f})]},`${n}-${a}`),i("div",{className:"absolute top-4 right-4 flex flex-col items-end gap-2",children:[t("div",{className:"px-3 py-2 bg-black/80 backdrop-blur-sm rounded-lg",children:i("div",{className:"flex flex-col gap-1 text-xs font-mono",children:[i("div",{className:"flex items-center gap-3",children:[i("span",{children:[t("span",{className:l.fps>=50?"text-green-400":l.fps>=30?"text-yellow-400":"text-red-400",children:l.fps.toFixed(0)}),t("span",{className:"text-tertiary/60 ml-1",children:"FPS"})]}),i("span",{children:[t("span",{className:"text-tertiary",children:l.frameTime.toFixed(1)}),t("span",{className:"text-tertiary/60 ml-1",children:"ms"})]})]}),i("div",{className:"flex items-center gap-3 text-tertiary/80",children:[l.memory!==null&&i("span",{children:[t("span",{className:"text-tertiary",children:l.memory.toFixed(0)}),t("span",{className:"text-tertiary/60 ml-1",children:"MB"})]}),i("span",{children:[t("span",{className:"text-tertiary",children:l.drawCalls}),t("span",{className:"text-tertiary/60 ml-1",children:"draws"})]}),i("span",{children:[i("span",{className:"text-tertiary",children:[(l.triangles/1e3).toFixed(1),"k"]}),t("span",{className:"text-tertiary/60 ml-1",children:"tris"})]})]}),l.gpuName&&t("div",{className:"text-[10px] text-tertiary/50 truncate max-w-[200px]",title:l.gpuName,children:l.gpuName})]})}),t("button",{onClick:()=>p(u=>u+1),className:`px-3 py-1.5 bg-black/80 backdrop-blur-sm text-secondary text-xs
                    rounded-lg hover:text-tertiary hover:bg-black/90 transition-colors`,title:"Reset camera view",children:"Reset View"})]}),t(kt,{})]}),i("div",{className:"w-72 bg-surface-dark border-l border-surface flex flex-col",children:[t("div",{className:"flex-1 overflow-y-auto p-4",children:n==="tpms"?t(Bt,{params:j,setParams:{setSurface:x,setMorphTarget:N,setMorphFactor:q,setRenderMode:Z,setParallelProjection:K,setFrequency:$,setScale:J,setThickness:te,setIso:ne,setRotation:ie,setLightIntensity:ce,setAmbient:le,setContrast:de,setSpecular:pe,setShininess:ve,setFieldRange:ge,setFog:ye,setAoStrength:Se,setColormap:Le,setPhaseX:Re,setPhaseY:Me,setPhaseZ:Pe}}):t(jt,{params:S,setParams:{setLatticeType:Te,setStrutRadius:De,setNodeRadius:Ie,setNodeSmoothing:Ae,setBlendMode:_e,setCellSize:je,setRepeatX:Xe,setRepeatY:Ye,setRepeatZ:Ue,setColormap:Ge,setColorMode:Ve,setParallelProjection:Qe,setRotation:et,setLightIntensity:ot,setAmbient:st,setContrast:at,setSpecular:rt,setShininess:ut,setAoStrength:mt,setFog:ft}})}),i("div",{className:"border-t border-surface p-4",children:[n==="tpms"&&L&&i(F,{children:[t("h3",{className:"text-sm font-bold text-tertiary",children:L.displayName}),t("p",{className:"text-secondary text-xs mt-1 leading-relaxed",children:L.description}),L.latex&&i("code",{className:"block mt-2 text-[10px] bg-black/50 p-1.5 rounded text-green-400 overflow-x-auto",children:["f(x,y,z) = ",L.latex]}),t("span",{className:`text-[10px] px-1.5 py-0.5 rounded mt-2 inline-block ${L.category==="minimal"?"bg-blue-900/50 text-blue-300":"bg-amber-900/50 text-amber-300"}`,children:L.category})]}),n==="lattice"&&z&&i(F,{children:[t("h3",{className:"text-sm font-bold text-tertiary",children:z.displayName}),t("p",{className:"text-secondary text-xs mt-1 leading-relaxed",children:z.description}),i("div",{className:"flex items-center gap-2 mt-2 flex-wrap",children:[t("span",{className:`text-[10px] px-1.5 py-0.5 rounded ${z.category==="cubic"?"bg-blue-900/50 text-blue-300":"bg-emerald-900/50 text-emerald-300"}`,children:z.category}),i("span",{className:"text-[10px] text-secondary",children:[z.strutsPerCell," struts/cell"]}),i("span",{className:"text-[10px] text-secondary",children:["~",(z.relativeDensity*100).toFixed(0),"% density"]})]})]})]})]})]})]})]})};export{Gt as default};
