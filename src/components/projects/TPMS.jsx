import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { GizmoHelper, GizmoViewport, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Vector3 } from "three";
import { Leva, useControls } from "leva";

import { Navbar } from "../";

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const fragmentShader = `
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
uniform float uRenderMode;
uniform float uFog;
uniform float uAoStrength;
uniform float uEdgeStrength;
uniform float uContourStrength;
uniform float uContourFreq;
uniform float uColormap;
uniform float uProjection;
uniform float uOrthoScale;
uniform vec3 uCamPos;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec3 uCamForward;

const int VOL_STEPS = 96;
const int SURF_STEPS = 96;
const float MAX_DIST = 12.0;
const float SURF_EPS = 0.0008;
const vec3 BOX_SIZE = vec3(0.5);

mat2 rot(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c);
}

float gyroid(vec3 p) {
  return sin(p.x) * cos(p.y) + sin(p.y) * cos(p.z) + sin(p.z) * cos(p.x);
}

float schwarzP(vec3 p) {
  return cos(p.x) + cos(p.y) + cos(p.z);
}

float schwarzD(vec3 p) {
  return cos(p.x) * cos(p.y) * cos(p.z) - sin(p.x) * sin(p.y) * sin(p.z);
}

float neovius(vec3 p) {
  return 3.0 * (cos(p.x) + cos(p.y) + cos(p.z)) + 4.0 * cos(p.x) * cos(p.y) * cos(p.z);
}

float diamond(vec3 p) {
  return sin(p.x) * sin(p.y) * sin(p.z)
    + sin(p.x) * cos(p.y) * cos(p.z)
    + cos(p.x) * sin(p.y) * cos(p.z)
    + cos(p.x) * cos(p.y) * sin(p.z)
    ;
}

float lidinoid(vec3 p) {
  return sin(p.x) * cos(p.y) + sin(p.y) * cos(p.z) + sin(p.z) * cos(p.x)
    + cos(p.x) * cos(p.y) * cos(p.z)
    - sin(p.x) * sin(p.y) * sin(p.z)
    ;
}

float fischerKochS(vec3 p) {
  return cos(p.x) + cos(p.y) + cos(p.z) + cos(p.x) * cos(p.y) * cos(p.z);
}

vec3 rotateY(vec3 p, float a) {
  float s = sin(a);
  float c = cos(a);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

float field(vec3 p) {
  vec3 q = rotateY(p, uRotation) * uFrequency;
  float t = floor(uSurfaceType + 0.5);
  float base;
  if (t < 0.5) base = gyroid(q);
  else if (t < 1.5) base = schwarzP(q);
  else if (t < 2.5) base = schwarzD(q);
  else if (t < 3.5) base = neovius(q);
  else if (t < 4.5) base = diamond(q);
  else if (t < 5.5) base = lidinoid(q);
  else base = fischerKochS(q);
  return base - uIso;
}

float densityFromField(float f) {
  float d = abs(f);
  return smoothstep(uThickness, 0.0, d);
}

float fieldWorld(vec3 p) {
  return field(p * uScale);
}

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
    vec3 negCol = vec3(0.1, 0.35, 0.9);
    vec3 posCol = vec3(0.9, 0.2, 0.1);
    vec3 midCol = vec3(1.0);
    return t < 0.5
      ? mix(negCol, midCol, smoothstep(0.0, 0.5, t))
      : mix(midCol, posCol, smoothstep(0.5, 1.0, t));
  }
  if (m < 1.5) {
    return ramp5(t,
      vec3(0.267, 0.004, 0.329),
      vec3(0.283, 0.141, 0.458),
      vec3(0.254, 0.265, 0.530),
      vec3(0.207, 0.372, 0.553),
      vec3(0.993, 0.906, 0.144));
  }
  if (m < 2.5) {
    return ramp5(t,
      vec3(0.050, 0.030, 0.528),
      vec3(0.250, 0.038, 0.588),
      vec3(0.530, 0.109, 0.588),
      vec3(0.776, 0.278, 0.498),
      vec3(0.987, 0.991, 0.750));
  }
  if (m < 3.5) {
    return ramp5(t,
      vec3(0.001, 0.000, 0.013),
      vec3(0.118, 0.015, 0.141),
      vec3(0.373, 0.052, 0.286),
      vec3(0.702, 0.165, 0.278),
      vec3(0.987, 0.991, 0.750));
  }
  if (m < 4.5) {
    return ramp5(t,
      vec3(0.001, 0.000, 0.014),
      vec3(0.073, 0.044, 0.206),
      vec3(0.322, 0.119, 0.384),
      vec3(0.741, 0.216, 0.241),
      vec3(0.988, 0.998, 0.645));
  }
  if (m < 5.5) {
    return ramp5(t,
      vec3(0.189, 0.071, 0.232),
      vec3(0.245, 0.365, 0.604),
      vec3(0.315, 0.694, 0.700),
      vec3(0.800, 0.925, 0.459),
      vec3(0.992, 0.906, 0.145));
  }
  return vec3(t);
}

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
  float stepSize = (t1 - t0) / float(VOL_STEPS);

  vec3 acc = vec3(0.0);
  float alpha = 0.0;
  vec3 surfaceCol = vec3(0.0);
  bool surfaceHit = false;
  vec3 keyDir = normalize(-uCamForward + 0.5 * uCamRight + 0.4 * uCamUp);
  vec3 fillDir = normalize(-uCamForward - 0.6 * uCamRight + 0.1 * uCamUp);
  vec3 rimDir = normalize(-uCamForward - 0.2 * uCamRight - 0.7 * uCamUp);
  vec3 eps = vec3(0.003, 0.0, 0.0);

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
      vec3 halfFill = normalize(fillDir + viewDir);
      vec3 halfRim = normalize(rimDir + viewDir);
      float spec = (
        pow(max(dot(n, halfKey), 0.0), uShininess) +
        0.5 * pow(max(dot(n, halfFill), 0.0), uShininess) +
        0.25 * pow(max(dot(n, halfRim), 0.0), uShininess)
      ) * uSpecular;
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
  vec3 fogged = mix(bg, volCol, fog);

  if (uRenderMode < 0.5) {
    gl_FragColor = vec4(fogged, 1.0);
    return;
  }

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
    gl_FragColor = vec4(fogged, 1.0);
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

const TPMSShader = ({ params }) => {
  const material = useRef(null);
  const { size, camera } = useThree();
  const lastAspect = useRef(size.width / size.height);

  const uniforms = useMemo(
    () => ({
      uResolution: { value: [size.width, size.height] },
      uTime: { value: 0 },
      uFov: { value: Math.PI / 4 },
      uFrequency: { value: 2.0 },
      uScale: { value: 3.0 },
      uThickness: { value: 1.0 },
      uIso: { value: 0.0 },
      uRotation: { value: 0.0 },
      uLightIntensity: { value: 1.15 },
      uAmbient: { value: 0.6 },
      uContrast: { value: 0.9 },
      uSpecular: { value: 1.0 },
      uShininess: { value: 20.0 },
      uFieldRange: { value: 0.2 },
      uSurfaceType: { value: 0.0 },
      uRenderMode: { value: 1.0 },
      uFog: { value: 0.8 },
      uAoStrength: { value: 0.1 },
      uEdgeStrength: { value: 0.0 },
      uContourStrength: { value: 0.0 },
      uContourFreq: { value: 6.0 },
      uColormap: { value: 0.0 },
      uProjection: { value: 0.0 },
      uOrthoScale: { value: 1.0 },
      uCamPos: { value: camera.position.clone() },
      uCamRight: { value: new Vector3(1, 0, 0) },
      uCamUp: { value: new Vector3(0, 1, 0) },
      uCamForward: { value: new Vector3(0, 0, -1) },
    }),
    [camera, size.width, size.height]
  );

  useEffect(() => {
    const nextAspect = size.width / size.height;
    uniforms.uResolution.value = [size.width, size.height];
    if (Math.abs(nextAspect - lastAspect.current) > 0.001) {
      camera.aspect = nextAspect;
      camera.updateProjectionMatrix();
      lastAspect.current = nextAspect;
    }
  }, [camera, size, uniforms]);

  useFrame(({ clock }) => {
    if (!material.current) return;
    material.current.uniforms.uTime.value = clock.getElapsedTime();
    material.current.uniforms.uFov.value = (camera.fov * Math.PI) / 180;
    material.current.uniforms.uProjection.value = params.parallelProjection ? 1.0 : 0.0;
    const camDist = camera.position.length();
    material.current.uniforms.uOrthoScale.value =
      Math.max(camDist * Math.tan((camera.fov * Math.PI) / 360), 0.001);
    material.current.uniforms.uCamPos.value.copy(camera.position);
    camera.updateMatrixWorld();
    const forward = new Vector3();
    camera.getWorldDirection(forward).normalize();
    const right = new Vector3().crossVectors(forward, camera.up).normalize();
    const up = new Vector3().crossVectors(right, forward).normalize();
    material.current.uniforms.uCamRight.value.copy(right);
    material.current.uniforms.uCamUp.value.copy(up);
    material.current.uniforms.uCamForward.value.copy(forward);
    material.current.uniforms.uFrequency.value = params.frequency;
    material.current.uniforms.uScale.value = params.scale;
    material.current.uniforms.uThickness.value = params.thickness;
    material.current.uniforms.uIso.value = params.iso;
    material.current.uniforms.uRotation.value = params.rotation;
    material.current.uniforms.uLightIntensity.value = params.lightIntensity;
    material.current.uniforms.uAmbient.value = params.ambient;
    material.current.uniforms.uContrast.value = params.contrast;
    material.current.uniforms.uSpecular.value = params.specular;
    material.current.uniforms.uShininess.value = params.shininess;
    material.current.uniforms.uFieldRange.value = params.fieldRange;
    material.current.uniforms.uRenderMode.value =
      params.renderMode === "Surface" ? 1.0 : 0.0;
    material.current.uniforms.uFog.value = params.fog;
    material.current.uniforms.uAoStrength.value = params.aoStrength;
    material.current.uniforms.uEdgeStrength.value = params.edgeStrength;
    material.current.uniforms.uContourStrength.value = params.contourStrength;
    material.current.uniforms.uContourFreq.value = params.contourFreq;
    const cmapIndex = {
      "Blue-White-Red": 0.0,
      "Viridis": 1.0,
      "Plasma": 2.0,
      "Magma": 3.0,
      "Inferno": 4.0,
      "Turbo": 5.0,
      "Gray": 6.0,
    }[params.colormap] ?? 0.0;
    material.current.uniforms.uColormap.value = cmapIndex;
    const surfaceIndex = {
      "Gyroid": 0.0,
      "Schwarz P": 1.0,
      "Schwarz D": 2.0,
      "Neovius": 3.0,
      "Diamond": 4.0,
      "Lidinoid": 5.0,
      "Fischer-Koch S": 6.0,
    }[params.surface] ?? 0.0;
    material.current.uniforms.uSurfaceType.value = surfaceIndex;
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
};

const TPMS = () => {
  const [isMobile, setIsMobile] = useState(false);
  const params = useControls("TPMS", {
    surface: {
      value: "Gyroid",
      options: [
        "Gyroid",
        "Schwarz P",
        "Schwarz D",
        "Neovius",
        "Diamond",
        "Lidinoid",
        "Fischer-Koch S",
    ],
    },
    renderMode: { value: "Surface", options: ["Volume", "Surface"] },
    parallelProjection: { value: false },
    frequency: { value: 2.0, min: 0.5, max: 6.0, step: 0.1 },
    scale: { value: 3.0, min: 0.5, max: 3.0, step: 0.1 },
    thickness: { value: 1.0, min: 0.02, max: 3.0, step: 0.01 },
    iso: { value: 0.0, min: -1.0, max: 1.0, step: 0.01 },
    rotation: { value: 0.0, min: 0.0, max: 2.0, step: 0.01 },
    lightIntensity: { value: 1.15, min: 0.2, max: 3.0, step: 0.05 },
    ambient: { value: 0.6, min: 0.0, max: 1.0, step: 0.05 },
    contrast: { value: 0.9, min: 0.5, max: 4.0, step: 0.05 },
    specular: { value: 1.0, min: 0.0, max: 1.0, step: 0.01 },
    shininess: { value: 20.0, min: 4.0, max: 128.0, step: 1.0 },
    fieldRange: { value: 0.2, min: 0.2, max: 3.0, step: 0.05 },
    fog: { value: 0.8, min: 0.0, max: 3.0, step: 0.05 },
    aoStrength: { value: 0.1, min: 0.0, max: 2.0, step: 0.05 },
    edgeStrength: { value: 0.0, min: 0.0, max: 1.0, step: 0.02 },
    contourStrength: { value: 0.0, min: 0.0, max: 0.6, step: 0.01 },
    contourFreq: { value: 6.0, min: 1.0, max: 20.0, step: 0.5 },
    colormap: {
      value: "Blue-White-Red",
      options: [
        "Blue-White-Red",
        "Viridis",
        "Plasma",
        "Magma",
        "Inferno",
        "Turbo",
        "Gray",
      ],
    },
  });

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <div className="bg-primary">
      <Navbar />
      <Leva collapsed={false} />
      <section className="h-screen flex">
        {isMobile ? (
          <div className="w-full h-full flex items-center justify-center text-center px-8 text-secondary">
            The TPMS gyroid demo is disabled on mobile for performance reasons.
            Please open this page on a desktop browser.
          </div>
        ) : (
          <Canvas dpr={1.25} gl={{ antialias: true }}>
            <PerspectiveCamera makeDefault position={[2.5, 2.5, 2.5]} fov={45} />
            <OrbitControls enableDamping />
            <TPMSShader params={params} />
            <GizmoHelper alignment="bottom-left" margin={[80, 80]}>
              <GizmoViewport axisColors={["#d43d3d", "#2fb36d", "#2d6cdf"]} />
            </GizmoHelper>
          </Canvas>
        )}
      </section>
    </div>
  );
};

export default TPMS;
