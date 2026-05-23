/**
 * Hourglass Flow Widget
 *
 * Compact home page widget showing particles in an hourglass container.
 * Auto-starts on mount and provides basic OrbitControls for interaction.
 */

import { useEffect, useMemo, useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationViewer } from '@/components/projects/simulations/SimulationViewer';
import { useGyroidFlowSimulation, GyroidFlowConfig } from '@/hooks/simulations/useGyroidFlowSimulation';
import { generateGyroidGeometry } from '@/utils/marchingCubes';

/**
 * Hourglass visualization using LatheGeometry
 * Uses the exact same radius formula as the physics shader
 */
interface HourglassVisualizerProps {
  radiusTop: number;
  radiusWaist: number;
  yMin: number;
  yMax: number;
  showTopCap?: boolean;
}

const HourglassVisualizer = ({ radiusTop, radiusWaist, yMin, yMax, showTopCap = true }: HourglassVisualizerProps) => {
  // Glass material - depthWrite false so particles show through
  const glassMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: 0x88aacc,
    transparent: true,
    opacity: 0.2,
    roughness: 0.1,
    metalness: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);

  // Create hourglass profile using the EXACT same formula as physics shader:
  // r(y) = waist + (top - waist) * yNorm^2
  // where yNorm = (y - yCenter) / halfHeight, clamped to [-1, 1]
  const hourglassGeometry = useMemo(() => {
    const height = yMax - yMin;
    const yCenter = yMin + height * 0.5;
    const halfHeight = height * 0.5;
    const segments = 64;

    // Create profile points from bottom to top
    const points: THREE.Vector2[] = [];
    for (let i = 0; i <= segments; i++) {
      const y = yMin + (i / segments) * height;
      const yNorm = (y - yCenter) / halfHeight; // Range: -1 to 1
      const r = radiusWaist + (radiusTop - radiusWaist) * yNorm * yNorm;
      points.push(new THREE.Vector2(r, y));
    }

    return new THREE.LatheGeometry(points, 64);
  }, [radiusTop, radiusWaist, yMin, yMax]);

  // Cap geometry (solid circle) - used for both top and bottom
  const capGeometry = useMemo(() => {
    return new THREE.CircleGeometry(radiusTop, 64);
  }, [radiusTop]);

  return (
    <group>
      <mesh geometry={hourglassGeometry} material={glassMaterial} />
      {/* Bottom cap */}
      <mesh
        geometry={capGeometry}
        material={glassMaterial}
        position={[0, yMin, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      {/* Top cap - only shown when enabled */}
      {showTopCap && (
        <mesh
          geometry={capGeometry}
          material={glassMaterial}
          position={[0, yMax, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        />
      )}
    </group>
  );
};

/**
 * Helix + Stadium Torus visualization
 * Uses raymarching for helix SDF + transparent parametric mesh for stadium
 */
interface HelixStadiumVisualizerProps {
  majorRadius: number;
  straightLength: number;
  tubeRadius: number;
  helixRadius: number;
  helixShaftRadius: number;
  helixPitch: number;
  helixThickness: number;
}

// Raymarching vertex shader for helix
const helixVertexShader = /* glsl */ `
varying vec3 vWorldPosition;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

// Raymarching fragment shader for helix SDF
const helixFragmentShader = /* glsl */ `
precision highp float;

uniform float stadiumMajorRadius;
uniform float stadiumStraightLength;
uniform float stadiumTubeRadius;
uniform float helixRadius;
uniform float helixShaftRadius;
uniform float helixPitch;
uniform float helixThickness;

varying vec3 vWorldPosition;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;
const int MAX_STEPS = 64;
const float MAX_DIST = 20.0;
const float SURF_DIST = 0.002;

// Helix SDF with height limits
float sdHelix(vec3 p, float R, float pitch, float shaftR, float thickness) {
  float heightLimit = stadiumStraightLength - 0.05;
  float clampedY = clamp(p.y, -heightLimit, heightLimit);
  vec3 clampedP = vec3(p.x, clampedY, p.z);

  if (abs(p.y) > heightLimit + 0.1) {
    return length(p.xz) - shaftR + abs(p.y) - heightLimit;
  }

  float shaftDist = length(clampedP.xz) - shaftR;
  float k = pitch / TAU;
  float angle = atan(clampedP.z, clampedP.x);
  float expectedY = k * angle;
  float r = length(clampedP.xz);

  if (r > shaftR * 0.9 && r < R) {
    float dy = mod(clampedP.y - expectedY + pitch * 0.5, pitch) - pitch * 0.5;
    float bladeDist = abs(dy) - thickness;
    float bladeWeight = smoothstep(shaftR * 0.9, shaftR * 1.1, r);
    return mix(shaftDist, min(shaftDist, bladeDist), bladeWeight);
  }

  return shaftDist;
}

float sceneSDF(vec3 p) {
  vec3 helixP = vec3(p.x, p.y, p.z - stadiumMajorRadius);
  return sdHelix(helixP, helixRadius, helixPitch, helixShaftRadius, helixThickness);
}

vec3 getNormal(vec3 p) {
  float eps = 0.002;
  return normalize(vec3(
    sceneSDF(p + vec3(eps, 0.0, 0.0)) - sceneSDF(p - vec3(eps, 0.0, 0.0)),
    sceneSDF(p + vec3(0.0, eps, 0.0)) - sceneSDF(p - vec3(0.0, eps, 0.0)),
    sceneSDF(p + vec3(0.0, 0.0, eps)) - sceneSDF(p - vec3(0.0, 0.0, eps))
  ));
}

float raymarch(vec3 ro, vec3 rd) {
  float d = 0.0;
  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 p = ro + rd * d;
    float dist = sceneSDF(p);
    d += dist * 0.8;
    if (abs(dist) < SURF_DIST || d > MAX_DIST) break;
  }
  return d;
}

void main() {
  vec3 ro = cameraPosition;
  vec3 rd = normalize(vWorldPosition - cameraPosition);

  float d = raymarch(ro, rd);

  if (d >= MAX_DIST - 0.1) {
    discard;
  }

  vec3 p = ro + rd * d;
  vec3 n = getNormal(p);

  vec3 lightDir = normalize(vec3(1.0, 2.0, 1.0));
  float diff = max(dot(n, lightDir), 0.0);
  float amb = 0.35;

  vec3 color = vec3(0.75, 0.85, 0.95);
  vec3 finalColor = color * (amb + diff * 0.65);

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

const HelixStadiumVisualizer = ({
  majorRadius,
  straightLength,
  tubeRadius,
  helixRadius,
  helixShaftRadius,
  helixPitch,
  helixThickness,
}: HelixStadiumVisualizerProps) => {
  // Helix raymarching uniforms
  const helixUniforms = useMemo(() => ({
    stadiumMajorRadius: { value: majorRadius },
    stadiumStraightLength: { value: straightLength },
    stadiumTubeRadius: { value: tubeRadius },
    helixRadius: { value: helixRadius },
    helixShaftRadius: { value: helixShaftRadius },
    helixPitch: { value: helixPitch },
    helixThickness: { value: helixThickness },
  }), [majorRadius, straightLength, tubeRadius, helixRadius, helixShaftRadius, helixPitch, helixThickness]);

  // Bounding box for raymarching
  const boxSizeXZ = (majorRadius + tubeRadius) * 2 + 0.5;
  const boxSizeY = straightLength * 2 + tubeRadius * 2 + 0.5;

  // Stadium torus transparent mesh (parametric)
  const stadiumGeometry = useMemo(() => {
    const PI = Math.PI;
    const TAU = 2 * Math.PI;
    const positions: number[] = [];
    const indices: number[] = [];
    const tubularSegments = 24;
    const radialSegments = 80;

    const getStadiumPoint = (t: number): THREE.Vector3 => {
      t = ((t % 1) + 1) % 1;
      const semicircleLen = PI * majorRadius;
      const totalLen = 2 * semicircleLen + 2 * straightLength * 2;
      const dist = t * totalLen;

      if (dist < straightLength * 2) {
        return new THREE.Vector3(-straightLength + dist, 0, -majorRadius);
      } else if (dist < straightLength * 2 + semicircleLen) {
        const angle = -PI / 2 + (dist - straightLength * 2) / majorRadius;
        return new THREE.Vector3(straightLength + majorRadius * Math.cos(angle), 0, majorRadius * Math.sin(angle));
      } else if (dist < straightLength * 4 + semicircleLen) {
        const s = dist - straightLength * 2 - semicircleLen;
        return new THREE.Vector3(straightLength - s, 0, majorRadius);
      } else {
        const angle = PI / 2 + (dist - straightLength * 4 - semicircleLen) / majorRadius;
        return new THREE.Vector3(-straightLength + majorRadius * Math.cos(angle), 0, majorRadius * Math.sin(angle));
      }
    };

    for (let i = 0; i <= radialSegments; i++) {
      const t = i / radialSegments;
      const center = getStadiumPoint(t);
      const nextCenter = getStadiumPoint((t + 0.001) % 1);
      const tangent = new THREE.Vector3().subVectors(nextCenter, center).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const binormal = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const normal = new THREE.Vector3().crossVectors(binormal, tangent).normalize();

      for (let j = 0; j <= tubularSegments; j++) {
        const theta = (j / tubularSegments) * TAU;
        const cos_t = Math.cos(theta);
        const sin_t = Math.sin(theta);
        positions.push(
          center.x + tubeRadius * (cos_t * binormal.x + sin_t * normal.x),
          center.y + tubeRadius * (cos_t * binormal.y + sin_t * normal.y),
          center.z + tubeRadius * (cos_t * binormal.z + sin_t * normal.z)
        );
      }
    }

    for (let i = 0; i < radialSegments; i++) {
      for (let j = 0; j < tubularSegments; j++) {
        const a = i * (tubularSegments + 1) + j;
        const b = a + 1;
        const c = a + (tubularSegments + 1);
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [majorRadius, straightLength, tubeRadius]);

  const glassMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: 0x4488aa,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);

  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      {/* Transparent stadium torus mesh */}
      <mesh geometry={stadiumGeometry} material={glassMaterial} />

      {/* Raymarched helix - positioned along Y axis at Z = majorRadius */}
      <mesh>
        <boxGeometry args={[boxSizeXZ, boxSizeY, boxSizeXZ]} />
        <shaderMaterial
          vertexShader={helixVertexShader}
          fragmentShader={helixFragmentShader}
          uniforms={helixUniforms}
          side={THREE.BackSide}
          transparent={false}
          depthWrite={true}
        />
      </mesh>
    </group>
  );
};

/**
 * Gyroid visualization using marching cubes
 */
interface GyroidVisualizerProps {
  yMin: number;
  yMax: number;
  showTopCap?: boolean;
}

const GyroidVisualizer = ({ yMin, yMax }: GyroidVisualizerProps) => {
  // A single tall container holds everything:
  //   - one bounding-box outline covering the full source + gyroid + catcher height
  //   - the gyroid surface sitting in the middle third
  //   - a darker floor plane at the bottom so the catcher reads as a container
  // No internal divisions between source/middle/catcher; one box, one filter,
  // one floor.

  const BONE     = 0xc5ccda;
  const EMBER    = 0xe8b06a;
  const CATCH_BG = 0x121b2d;

  // Geometry constants first — materials below reference these.
  const totalHeight = yMax - yMin;
  const cubeSize = totalHeight / 3.0;          // gyroid cube edge (1 of 3)
  const middleCenter = (yMin + yMax) / 2;
  const containerCenter = middleCenter;
  const half = cubeSize / 2;
  const wallThickness = 0.4;
  const gyroidScale = 4 * Math.PI / cubeSize;
  const gyroidThreshold = 0.4;

  const containerEdges = useMemo(() => new THREE.LineBasicMaterial({
    color: BONE, transparent: true, opacity: 0.38,
  }), []);

  // Solid gyroid material, with light transparency so particles behind the
  // body remain visible. Smooth PBR shading via analytic normals (set on
  // the geometry below). depthWrite stays on so the surface still reads as
  // solid; the alpha < 1 just lets some of the scene behind bleed through.
  const GYROID_ALPHA = 0.78;
  const gyroidSurfaceMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: EMBER,
    roughness: 0.55,
    metalness: 0.10,
    side: THREE.FrontSide,
    flatShading: false,
    transparent: true,
    opacity: GYROID_ALPHA,
  }), []);

  const catcherFloorMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: CATCH_BG,
    transparent: true,
    opacity: 0.55,
    roughness: 0.6,
    metalness: 0.05,
    side: THREE.DoubleSide,
  }), []);

  // Cap material: evaluates the gyroid SDF on each box face and renders
  // only where the wall exists (|g| < threshold). The SDF is evaluated in
  // the gyroid mesh's LOCAL frame so the pattern rotates with the container
  // (using world position would lock the SDF to world space and the cap
  // pattern would appear stationary while the container rotates).
  const capMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uScale:             { value: gyroidScale },
        uThreshold:         { value: gyroidThreshold },
        uColor:             { value: new THREE.Color(EMBER) },
        uFaceNormal:        { value: new THREE.Vector3(0, 0, 1) },
        uLightDir:          { value: new THREE.Vector3(5, 10, 5).normalize() },
        uAlpha:             { value: GYROID_ALPHA },
        // Static cap-local → gyroid-local transform. Independent of any
        // parent group rotation, so the SDF pattern stays locked to the
        // gyroid body.
        uCapToGyroidLocal:  { value: new THREE.Matrix4() },
      },
      vertexShader: /* glsl */`
        uniform mat4 uCapToGyroidLocal;
        varying vec3 vGyroidLocal;
        void main() {
          vGyroidLocal = (uCapToGyroidLocal * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        precision highp float;
        varying vec3 vGyroidLocal;
        uniform float uScale;
        uniform float uThreshold;
        uniform vec3 uColor;
        uniform vec3 uFaceNormal;
        uniform vec3 uLightDir;
        uniform float uAlpha;
        void main() {
          float sx = uScale * vGyroidLocal.x;
          float sy = uScale * vGyroidLocal.y;
          float sz = uScale * vGyroidLocal.z;
          float g = sin(sx) * cos(sy) + sin(sy) * cos(sz) + sin(sz) * cos(sx);
          if (abs(g) > uThreshold) discard;
          float ndl = max(0.0, dot(normalize(uFaceNormal), normalize(uLightDir)));
          vec3 c = uColor * (0.42 + 0.58 * ndl);
          gl_FragColor = vec4(c, uAlpha);
        }
      `,
      side: THREE.FrontSide,
      transparent: true,
    });
  }, [gyroidScale, gyroidThreshold]);

  // Per-face data: position + rotation (in the gyroid GROUP frame), outward
  // normal, and the static cap-local → gyroid-local matrix.
  const faces = useMemo(() => {
    type Face = {
      pos: [number, number, number];
      rot: [number, number, number];
      normal: [number, number, number];
      capToGyroidLocal: THREE.Matrix4;
    };
    const M_gyroidInv = new THREE.Matrix4().makeTranslation(0, -middleCenter, 0);
    const make = (
      pos: [number, number, number],
      rot: [number, number, number],
      normal: [number, number, number],
    ): Face => {
      const M_cap = new THREE.Matrix4().compose(
        new THREE.Vector3(pos[0], pos[1], pos[2]),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])),
        new THREE.Vector3(1, 1, 1),
      );
      const capToGyroidLocal = new THREE.Matrix4().multiplyMatrices(M_gyroidInv, M_cap);
      return { pos, rot, normal, capToGyroidLocal };
    };
    return [
      make([ half, middleCenter, 0],         [0,  Math.PI / 2, 0], [ 1, 0, 0]),
      make([-half, middleCenter, 0],         [0, -Math.PI / 2, 0], [-1, 0, 0]),
      make([0, middleCenter + half, 0],      [-Math.PI / 2, 0, 0], [ 0,  1, 0]),
      make([0, middleCenter - half, 0],      [ Math.PI / 2, 0, 0], [ 0, -1, 0]),
      make([0, middleCenter,  half],         [0, 0, 0],            [ 0, 0,  1]),
      make([0, middleCenter, -half],         [0, Math.PI, 0],      [ 0, 0, -1]),
    ];
  }, [half, middleCenter]);

  // Gyroid surface mesh — analytic normals from the SDF gradient give true
  // smooth shading on the curved interior. The marching-cubes mesh has
  // unshared vertices, so computeVertexNormals() would flat-shade it; we
  // compute normals directly from ∇g instead. Edges where the wall meets
  // the cube boundary stay sharp because the body and the caps are
  // separate meshes with different per-face normals.
  const gyroidGeometry = useMemo(() => {
    const { positions } = generateGyroidGeometry(cubeSize, gyroidScale, wallThickness, 40);
    const normals = new Float32Array(positions.length);
    const s = gyroidScale;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      const sx = s * x, sy = s * y, sz = s * z;
      const sinx = Math.sin(sx), cosx = Math.cos(sx);
      const siny = Math.sin(sy), cosy = Math.cos(sy);
      const sinz = Math.sin(sz), cosz = Math.cos(sz);
      const g = sinx * cosy + siny * cosz + sinz * cosx;
      // ∇g
      const gx =  cosx * cosy - sinz * sinx;
      const gy = -sinx * siny + cosy * cosz;
      const gz = -siny * sinz + cosz * cosx;
      // Outward normal of the solid: f = |g| - t  ⇒  ∇f = sign(g) * ∇g.
      // The solid is f < 0, so its OUTWARD normal points along +∇f when g>0
      // and -∇g when g<0. Equivalent to sign(g) * ∇g, then normalized.
      const sgn = g >= 0 ? 1 : -1;
      let nx = sgn * gx;
      let ny = sgn * gy;
      let nz = sgn * gz;
      const inv = 1 / Math.max(1e-9, Math.hypot(nx, ny, nz));
      normals[i]     = nx * inv;
      normals[i + 1] = ny * inv;
      normals[i + 2] = nz * inv;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal',   new THREE.BufferAttribute(normals, 3));
    return geometry;
  }, [cubeSize, gyroidScale, wallThickness]);

  // One tall container — same x/z footprint as the gyroid, 3× taller.
  const containerEdgesGeom = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(cubeSize, totalHeight, cubeSize)),
    [cubeSize, totalHeight],
  );

  return (
    <group>
      {/* Catcher floor (bottom face only) so the lower portion of the
          container reads as a collector with a base. */}
      <mesh
        position={[0, yMin + 0.005, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={catcherFloorMat}
      >
        <planeGeometry args={[cubeSize, cubeSize]} />
      </mesh>

      {/* One outer container outline covering the entire source/middle/catcher
          height. */}
      <lineSegments
        position={[0, containerCenter, 0]}
        geometry={containerEdgesGeom}
        material={containerEdges}
      />

      {/* Gyroid solid in the middle third of the container. Opaque ember
          material with subtle PBR shading. */}
      <mesh
        position={[0, middleCenter, 0]}
        geometry={gyroidGeometry}
        material={gyroidSurfaceMat}
        castShadow
        receiveShadow
      />

      {/* Six caps closing the cross-section of the gyroid wall on each face
          of the bounding cube. Each cap clones the base ShaderMaterial and
          replaces only the per-face uniforms (outward normal + static cap-
          local → gyroid-local transform) while sharing the rest. */}
      {faces.map((f, i) => {
        const capMat = capMaterial.clone();
        capMat.uniforms.uFaceNormal       = { value: new THREE.Vector3(...f.normal) };
        capMat.uniforms.uCapToGyroidLocal = { value: f.capToGyroidLocal };
        // Share scale/threshold/color/light so any future tweak propagates.
        capMat.uniforms.uScale     = capMaterial.uniforms.uScale;
        capMat.uniforms.uThreshold = capMaterial.uniforms.uThreshold;
        capMat.uniforms.uColor     = capMaterial.uniforms.uColor;
        capMat.uniforms.uLightDir  = capMaterial.uniforms.uLightDir;
        capMat.uniforms.uAlpha     = capMaterial.uniforms.uAlpha;
        return (
          <mesh key={i} position={f.pos} rotation={f.rot} material={capMat}>
            <planeGeometry args={[cubeSize, cubeSize]} />
          </mesh>
        );
      })}
    </group>
  );
};

/**
 * Inner scene component that uses the simulation hook
 */

const FLIP_INTERVAL = 10; // seconds between flips
const FLIP_DURATION = 2; // seconds for rotation animation

interface HourglassFlowSceneProps {
  config: Partial<GyroidFlowConfig>;
  showHourglass?: boolean;
  resetTrigger?: number;
}

const HourglassFlowScene = ({ config, showHourglass = true, resetTrigger = 0 }: HourglassFlowSceneProps) => {
  const [state, controls, positions, velocities, currentConfig] = useGyroidFlowSimulation({
    ...config,
    autoStart: true,
  });

  // Track geometry type for visualization
  const [activeGeometryType, setActiveGeometryType] = useState(config.geometryType ?? 0);

  // Update simulation config when geometry type changes
  useEffect(() => {
    if (config.geometryType !== undefined && config.geometryType !== activeGeometryType) {
      setActiveGeometryType(config.geometryType);
      controls.updateConfig({ geometryType: config.geometryType });
    }
  }, [config.geometryType, activeGeometryType, controls]);

  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);
  const rotationRef = useRef(0); // Current rotation in radians (0 or PI)
  const isFlippingRef = useRef(false);
  const targetRotationRef = useRef(0);
  const topCapEnabledRef = useRef(false);
  const [showTopCap, setShowTopCap] = useState(false);
  const lastResetTriggerRef = useRef(resetTrigger);
  const controlsRef = useRef(controls);
  controlsRef.current = controls;

  // Reset simulation when resetTrigger changes
  useEffect(() => {
    if (resetTrigger !== lastResetTriggerRef.current && state.initialized) {
      lastResetTriggerRef.current = resetTrigger;

      // Update config with new spawn positions BEFORE reset
      // This ensures particles spawn in the correct location for the new geometry
      controlsRef.current.updateConfig({
        geometryType: config.geometryType,
        spawnXMin: config.spawnXMin,
        spawnXMax: config.spawnXMax,
        spawnYMin: config.spawnYMin,
        spawnYMax: config.spawnYMax,
        spawnZMin: config.spawnZMin,
        spawnZMax: config.spawnZMax,
        gravity: -9.81,
        topCapEnabled: false,
      });

      // Reset simulation - use ref to get current controls
      controlsRef.current.reset();

      // Reset flip animation state
      timeRef.current = 0;
      rotationRef.current = 0;
      isFlippingRef.current = false;
      targetRotationRef.current = 0;
      topCapEnabledRef.current = false;
      setShowTopCap(false);

      // Reset group rotation
      if (groupRef.current) {
        groupRef.current.rotation.z = 0;
      }
    }
  }, [resetTrigger, state.initialized, config]);

  // Hourglass center for rotation pivot
  const yCenter = (currentConfig.hourglassYMin + currentConfig.hourglassYMax) / 2;

  useFrame((_, delta) => {
    timeRef.current += delta;

    // Check if it's time to start a new flip
    if (!isFlippingRef.current && timeRef.current >= FLIP_INTERVAL) {
      // Enable top cap before first flip
      if (!topCapEnabledRef.current) {
        topCapEnabledRef.current = true;
        setShowTopCap(true);
        controls.updateConfig({ topCapEnabled: true });
      }

      isFlippingRef.current = true;
      targetRotationRef.current = rotationRef.current + Math.PI;
      timeRef.current = 0; // Reset timer
    }

    // Handle flip animation
    if (isFlippingRef.current && groupRef.current) {
      const elapsed = timeRef.current;
      const progress = Math.min(elapsed / FLIP_DURATION, 1);

      // Smooth easing (ease in-out)
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const startRotation = targetRotationRef.current - Math.PI;
      const newRotation = startRotation + eased * Math.PI;
      groupRef.current.rotation.z = newRotation;

      // Flip gravity at midpoint
      if (progress >= 0.5 && rotationRef.current !== targetRotationRef.current) {
        rotationRef.current = targetRotationRef.current;
        const isUpsideDown = (Math.round(rotationRef.current / Math.PI) % 2) === 1;
        const newGravity = isUpsideDown ? 9.81 : -9.81;
        controls.updateConfig({ gravity: newGravity });
      }

      // End flip
      if (progress >= 1) {
        isFlippingRef.current = false;
        groupRef.current.rotation.z = targetRotationRef.current;
      }
    }
  });

  // Error display
  if (state.error) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="red" />
      </mesh>
    );
  }

  return (
    <>
      <group ref={groupRef} position={[0, yCenter, 0]}>
        <group position={[0, -yCenter, 0]}>
          {/* Geometry visualization */}
          {showHourglass && activeGeometryType === 0 && (
            <HourglassVisualizer
              radiusTop={currentConfig.hourglassRadiusTop}
              radiusWaist={currentConfig.hourglassRadiusWaist}
              yMin={currentConfig.hourglassYMin}
              yMax={currentConfig.hourglassYMax}
              showTopCap={showTopCap}
            />
          )}
          {showHourglass && activeGeometryType === 1 && (
            <GyroidVisualizer
              yMin={currentConfig.hourglassYMin}
              yMax={currentConfig.hourglassYMax}
              showTopCap={showTopCap}
            />
          )}
          {showHourglass && activeGeometryType === 2 && (
            <HelixStadiumVisualizer
              majorRadius={currentConfig.stadiumMajorRadius ?? 0.8}
              straightLength={currentConfig.stadiumStraightLength ?? 1.25}
              tubeRadius={currentConfig.stadiumTubeRadius ?? 0.5}
              helixRadius={(currentConfig.stadiumTubeRadius ?? 0.5) * 0.8}
              helixShaftRadius={currentConfig.helixShaftRadius ?? 0.08}
              helixPitch={currentConfig.helixPitch ?? 0.35}
              helixThickness={currentConfig.helixThickness ?? 0.05}
            />
          )}

          {/* Particles */}
          {positions && velocities && (
            <SimulationViewer
              positions={positions}
              velocities={velocities}
              particleCount={currentConfig.particleCount}
              config={activeGeometryType === 1 ? {
                // Gyroid mode: color by channel (positive/negative SDF) using
                // the site's editorial palette (cool slate ↔ ember).
                pointSize: 1.0,
                colorMode: 1,
                fieldType: 5, // Gyroid channel
                colormap: 5,  // Editorial: cool slate, warm bone, ember
                colormapReversed: false,
                fieldMin: 0,
                fieldMax: 1,
                blendMode: 2,
                brightness: 1.25,
                gaussianSigma: 0.42,
                gyroidScale: currentConfig.gyroidScale,
                gyroidYMin: currentConfig.hourglassYMin + (currentConfig.hourglassYMax - currentConfig.hourglassYMin) / 3,
                gyroidYMax: currentConfig.hourglassYMax - (currentConfig.hourglassYMax - currentConfig.hourglassYMin) / 3,
              } : {
                // Hourglass mode: color by velocity
                pointSize: 1.0,
                colorMode: 1,
                fieldType: 0,
                colormap: 4,
                colormapReversed: true,
                fieldMin: 0,
                fieldMax: 5,
                blendMode: 2,
                brightness: 1.2,
                gaussianSigma: 0.4,
              }}
            />
          )}
        </group>
      </group>

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} />
    </>
  );
};

interface HourglassFlowWidgetProps {
  className?: string;
  particleCount?: number;
  showHourglass?: boolean;
  geometryType?: number;  // 0 = hourglass, 1 = gyroid
}

const HourglassFlowWidget = ({
  className = '',
  particleCount = 10000,
  showHourglass = true,
  geometryType = 0,
}: HourglassFlowWidgetProps) => {
  const [isWebGPUSupported, setIsWebGPUSupported] = useState<boolean | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [resetTrigger, setResetTrigger] = useState(0);
  const prevGeometryTypeRef = useRef(geometryType);

  useEffect(() => {
    const checkWebGPU = async () => {
      if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
        setIsWebGPUSupported(false);
        return;
      }
      try {
        const adapter = await navigator.gpu.requestAdapter();
        setIsWebGPUSupported(adapter !== null);
      } catch {
        setIsWebGPUSupported(false);
      }
    };
    checkWebGPU();
  }, []);

  // Reset simulation when geometryType changes
  useEffect(() => {
    if (geometryType !== prevGeometryTypeRef.current) {
      prevGeometryTypeRef.current = geometryType;
      setResetTrigger(prev => prev + 1);
    }
  }, [geometryType]);

  if (isWebGPUSupported === null) {
    return (
      <div ref={containerRef} className={`${className} flex items-center justify-center bg-primary`}>
        <div className="text-tertiary/50 text-sm">Checking WebGPU...</div>
      </div>
    );
  }

  if (!isWebGPUSupported) {
    return (
      <div ref={containerRef} className={`${className} flex items-center justify-center bg-primary`}>
        <div className="text-tertiary/50 text-sm text-center px-4">
          WebGPU not supported in this browser
        </div>
      </div>
    );
  }

  // For gyroid: 3 equal cubes, each cube is (yMax - yMin) / 3 = 6 / 3 = 2 units
  const cubeSize = 2.0;

  // Helix+stadium parameters
  const stadiumMajorRadius = 0.8;
  const stadiumStraightLength = 1.25;
  const stadiumTubeRadius = 0.5;

  // Calculate spawn area based on geometry type
  const getSpawnConfig = () => {
    if (geometryType === 0) {
      // Hourglass: spawn above so particles fall in
      return {
        spawnXMin: -1.0,
        spawnXMax: 1.0,
        spawnYMin: 6.5,
        spawnYMax: 8.5,
        spawnZMin: -1.0,
        spawnZMax: 1.0,
      };
    } else if (geometryType === 1) {
      // Gyroid: spawn inside top box
      return {
        spawnXMin: -cubeSize / 2 * 0.8,
        spawnXMax: cubeSize / 2 * 0.8,
        spawnYMin: 4.5,
        spawnYMax: 5.8,
        spawnZMin: -cubeSize / 2 * 0.8,
        spawnZMax: cubeSize / 2 * 0.8,
      };
    } else {
      // Helix+stadium: spawn inside stadium tube at top of straight section
      const spawnRadius = stadiumTubeRadius * 0.7;
      return {
        spawnXMin: -spawnRadius,
        spawnXMax: spawnRadius,
        spawnYMin: stadiumStraightLength * 0.5,
        spawnYMax: stadiumStraightLength * 0.95,
        spawnZMin: stadiumMajorRadius - spawnRadius,
        spawnZMax: stadiumMajorRadius + spawnRadius,
      };
    }
  };

  const spawnConfig = getSpawnConfig();

  const config: Partial<GyroidFlowConfig> = {
    particleCount,
    radius: geometryType === 2 ? 0.03 : 0.06,
    radiusMin: geometryType === 2 ? 0.02 : 0.04,
    radiusMax: geometryType === 2 ? 0.04 : 0.08,
    stiffness: 15000,
    friction: 0.3,
    restitution: 0.4,
    gravity: geometryType === 2 ? -4.0 : -9.81,
    // Hourglass bounds
    hourglassRadiusTop: 1.25,
    hourglassRadiusWaist: 0.25,
    hourglassYMin: 0.0,
    hourglassYMax: 6.0,
    // Spawn area based on geometry type
    ...spawnConfig,
    respawnYThreshold: -10.0,  // Disable respawning
    topCapEnabled: false,  // Start with top cap open
    geometryType,
    // Scale so two gyroid periods fit in cubeSize
    gyroidScale: 4 * Math.PI / cubeSize,
    gyroidThreshold: 0.4,
    // Helix+stadium parameters
    stadiumMajorRadius,
    stadiumStraightLength,
    stadiumTubeRadius,
    helixPitch: 0.35,
    helixRadius: stadiumTubeRadius * 0.8,
    helixShaftRadius: 0.08,
    helixThickness: 0.05,
  };

  // Per-scene camera framing. Each geometry sits in a different region
  // of world space; one camera target does not fit all.
  const cameraPreset =
    geometryType === 2
      ? { position: [3.4, 1.4, 3.4] as [number, number, number], target: [0, 0.4, 0.4] as [number, number, number] }
      : geometryType === 1
      ? { position: [6.5, 4, 6.5] as [number, number, number], target: [0, 3, 0] as [number, number, number] }
      : { position: [8, 5, 8] as [number, number, number], target: [0, 3, 0] as [number, number, number] };

  return (
    <div ref={containerRef} className={`${className} bg-primary`}>
      <Canvas
        key={geometryType}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <PerspectiveCamera makeDefault position={cameraPreset.position} fov={45} />
        <OrbitControls
          target={cameraPreset.target}
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2}
        />
        <HourglassFlowScene config={config} showHourglass={showHourglass} resetTrigger={resetTrigger} />
      </Canvas>
    </div>
  );
};

export default HourglassFlowWidget;
