import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { Vector3, ShaderMaterial } from "three";

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
uniform float uRotation;
uniform float uLightIntensity;
uniform float uAmbient;
uniform float uContrast;
uniform float uSpecular;
uniform float uShininess;
uniform float uSurfaceType;
uniform float uNextSurface;
uniform float uMorphProgress;
uniform vec3 uCamPos;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec3 uCamForward;
uniform vec3 uColorA;
uniform vec3 uColorB;

const int VOL_STEPS = 64;
const float MAX_DIST = 12.0;
const vec3 BOX_SIZE = vec3(0.5);

float gyroid(vec3 p) {
  return sin(p.x) * cos(p.y) + sin(p.y) * cos(p.z) + sin(p.z) * cos(p.x);
}

float schwarzP(vec3 p) {
  return cos(p.x) + cos(p.y) + cos(p.z);
}

float diamond(vec3 p) {
  return sin(p.x) * sin(p.y) * sin(p.z)
    + sin(p.x) * cos(p.y) * cos(p.z)
    + cos(p.x) * sin(p.y) * cos(p.z)
    + cos(p.x) * cos(p.y) * sin(p.z);
}

float lidinoid(vec3 p) {
  return sin(p.x) * cos(p.y) + sin(p.y) * cos(p.z) + sin(p.z) * cos(p.x)
    + cos(p.x) * cos(p.y) * cos(p.z)
    - sin(p.x) * sin(p.y) * sin(p.z);
}

float neovius(vec3 p) {
  return 3.0 * (cos(p.x) + cos(p.y) + cos(p.z)) + 4.0 * cos(p.x) * cos(p.y) * cos(p.z);
}

vec3 rotateY(vec3 p, float a) {
  float s = sin(a);
  float c = cos(a);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

float getSurface(vec3 p, float surfaceType) {
  float t = floor(surfaceType + 0.5);
  if (t < 0.5) return gyroid(p);
  else if (t < 1.5) return schwarzP(p);
  else if (t < 2.5) return diamond(p);
  else if (t < 3.5) return lidinoid(p);
  else return neovius(p);
}

float field(vec3 p) {
  vec3 q = rotateY(p, uRotation + uTime * 0.1) * uFrequency;
  float current = getSurface(q, uSurfaceType);
  float next = getSurface(q, uNextSurface);
  return mix(current, next, uMorphProgress);
}

float densityFromField(float f) {
  float d = abs(f);
  return smoothstep(uThickness, 0.0, d);
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

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
  uv *= 2.0;

  vec3 ro = uCamPos;
  float fovScale = tan(uFov * 0.5);
  vec3 rd = normalize(
    uCamForward +
    uv.x * uCamRight * fovScale +
    uv.y * uCamUp * fovScale
  );

  vec2 bounds = intersectBox(ro, rd, BOX_SIZE);
  float tNear = bounds.x;
  float tFar = bounds.y;

  vec3 bg = uColorB;

  if (tNear > tFar || tFar < 0.0) {
    gl_FragColor = vec4(bg, 1.0);
    return;
  }

  float t0 = max(tNear, 0.0);
  float t1 = min(tFar, MAX_DIST);
  float stepSize = (t1 - t0) / float(VOL_STEPS);

  vec3 acc = vec3(0.0);
  float alpha = 0.0;

  vec3 keyDir = normalize(-uCamForward + 0.5 * uCamRight + 0.4 * uCamUp);
  vec3 fillDir = normalize(-uCamForward - 0.6 * uCamRight + 0.1 * uCamUp);
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
      float diff = diffKey + diffFill;
      float diffBoost = pow(diff, max(uContrast, 0.01));
      float ambientBoost = uAmbient;

      vec3 viewDir = normalize(-rd);
      vec3 halfKey = normalize(keyDir + viewDir);
      float spec = pow(max(dot(n, halfKey), 0.0), uShininess) * uSpecular;

      vec3 base = uColorA;
      vec3 sampleCol = base * (ambientBoost + diffBoost * uLightIntensity) + vec3(spec);

      float opacity = clamp(density * 2.0, 0.0, 1.0);
      acc += (1.0 - alpha) * sampleCol * opacity;
      alpha += (1.0 - alpha) * opacity;

      if (alpha > 0.98) break;
    }
  }

  vec3 col = mix(bg, acc, alpha);
  gl_FragColor = vec4(col, 1.0);
}
`;

interface TPMSShaderProps {
  surfaceType: number;
  nextSurface: number;
  morphProgress: number;
  rotation: number;
}

const TPMSShader = ({ surfaceType, nextSurface, morphProgress, rotation }: TPMSShaderProps) => {
  const material = useRef<ShaderMaterial>(null);
  const { size, camera } = useThree();

  const uniforms = useMemo(
    () => ({
      uResolution: { value: [size.width, size.height] },
      uTime: { value: 0 },
      uFov: { value: Math.PI / 4 },
      uFrequency: { value: 2.5 },
      uScale: { value: 2.5 },
      uThickness: { value: 0.8 },
      uRotation: { value: rotation },
      uLightIntensity: { value: 1.2 },
      uAmbient: { value: 0.5 },
      uContrast: { value: 1.0 },
      uSpecular: { value: 0.6 },
      uShininess: { value: 30.0 },
      uSurfaceType: { value: surfaceType },
      uNextSurface: { value: nextSurface },
      uMorphProgress: { value: morphProgress },
      uCamPos: { value: camera.position.clone() },
      uCamRight: { value: new Vector3(1, 0, 0) },
      uCamUp: { value: new Vector3(0, 1, 0) },
      uCamForward: { value: new Vector3(0, 0, -1) },
      uColorA: { value: new Vector3(0.467, 0.537, 0.663) },
      uColorB: { value: new Vector3(0.051, 0.106, 0.165) },
    }),
    []
  );

  useEffect(() => {
    uniforms.uResolution.value = [size.width, size.height];
  }, [size, uniforms]);

  useFrame(({ clock }) => {
    if (!material.current) return;
    material.current.uniforms.uTime.value = clock.getElapsedTime();
    material.current.uniforms.uFov.value = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180;
    material.current.uniforms.uSurfaceType.value = surfaceType;
    material.current.uniforms.uNextSurface.value = nextSurface;
    material.current.uniforms.uMorphProgress.value = morphProgress;
    material.current.uniforms.uRotation.value = rotation;
    material.current.uniforms.uCamPos.value.copy(camera.position);
    camera.updateMatrixWorld();
    const forward = new Vector3();
    camera.getWorldDirection(forward).normalize();
    const right = new Vector3().crossVectors(forward, camera.up).normalize();
    const up = new Vector3().crossVectors(right, forward).normalize();
    material.current.uniforms.uCamRight.value.copy(right);
    material.current.uniforms.uCamUp.value.copy(up);
    material.current.uniforms.uCamForward.value.copy(forward);
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

interface MorphingTPMSProps {
  surfaceType?: number;
  nextSurface?: number;
  morphProgress?: number;
  rotation?: number;
}

const MorphingTPMS = ({ surfaceType = 0, nextSurface = 0, morphProgress = 0, rotation = 0 }: MorphingTPMSProps) => {
  return (
    <Canvas dpr={[1, 1.5]} gl={{ antialias: true, alpha: false }}>
      <PerspectiveCamera makeDefault position={[1.8, 1.8, 1.8]} fov={45} />
      <TPMSShader
        surfaceType={surfaceType}
        nextSurface={nextSurface}
        morphProgress={morphProgress}
        rotation={rotation}
      />
    </Canvas>
  );
};

export default MorphingTPMS;
