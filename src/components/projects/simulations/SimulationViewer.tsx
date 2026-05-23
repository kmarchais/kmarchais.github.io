/**
 * Simulation Viewer Component
 *
 * Three.js component that renders particles using Point Gaussian shading.
 * Uses instanced rendering for efficient display of many particles.
 */

import { useRef, useEffect, useMemo, memo } from 'react';
import {
  Mesh,
  InstancedBufferGeometry,
  InstancedBufferAttribute,
  ShaderMaterial,
  AdditiveBlending,
  NormalBlending,
  DoubleSide,
  BufferAttribute,
} from 'three';

import {
  vertexShader,
  fragmentShader,
} from '@/shaders/simulations/rendering/pointGaussian';

export interface ParticleRenderConfig {
  /** Point size multiplier */
  pointSize: number;
  /** Minimum point size */
  minSize: number;
  /** Maximum point size */
  maxSize: number;
  /** Velocity scale for coloring */
  velocityScale: number;
  /** Color mode (0=solid, 1=viridis, 2=direction, 3=plasma, 4=turbo, 5=coolwarm) */
  colorMode: number;
  /** Field type for coloring (0=vel mag, 1=vel X, 2=vel Y, 3=vel Z, 4=height, 5=gyroid channel) */
  fieldType: number;
  /** Colormap (0=viridis, 1=plasma, 2=turbo, 3=coolwarm, 4=rdylbu) */
  colormap: number;
  /** Reverse colormap direction */
  colormapReversed?: boolean;
  /** Dynamic min value for field normalization */
  fieldMin: number;
  /** Dynamic max value for field normalization */
  fieldMax: number;
  /** Gaussian sigma for falloff */
  gaussianSigma: number;
  /** Minimum alpha for culling */
  minAlpha: number;
  /** Blend mode (0=gaussian, 1=additive, 2=sphere) */
  blendMode: number;
  /** Overall brightness */
  brightness: number;
  /** Base color [r, g, b] */
  baseColor: [number, number, number];
  /** Light direction for sphere mode [x, y, z] */
  lightDir?: [number, number, number];
  /** Gyroid scale for channel coloring (only used when fieldType=5) */
  gyroidScale?: number;
  /** Gyroid Y min bound (only used when fieldType=5) */
  gyroidYMin?: number;
  /** Gyroid Y max bound (only used when fieldType=5) */
  gyroidYMax?: number;
}

export const defaultRenderConfig: ParticleRenderConfig = {
  pointSize: 0.1,
  minSize: 0.01,
  maxSize: 1.0,
  velocityScale: 0.1,
  colorMode: 1,
  fieldType: 0, // Velocity magnitude
  colormap: 4,  // RdYlBu
  colormapReversed: false,
  fieldMin: 0,
  fieldMax: 1,
  gaussianSigma: 0.4,
  minAlpha: 0.01,
  blendMode: 2, // Sphere mode by default
  brightness: 1.0,
  baseColor: [1.0, 1.0, 1.0],
  lightDir: [0.5, 0.7, 1.0],
  gyroidScale: 2 * Math.PI,
  gyroidYMin: 2.0,
  gyroidYMax: 4.0,
};

interface SimulationViewerProps {
  /** Position data (Float32Array with vec4 per particle: x, y, z, mass) */
  positions: Float32Array | null;
  /** Velocity data (Float32Array with vec4 per particle: vx, vy, vz, unused) */
  velocities: Float32Array | null;
  /** Number of particles */
  particleCount: number;
  /** Render configuration */
  config?: Partial<ParticleRenderConfig>;
}

/**
 * Particle renderer using Point Gaussian shading
 * Wrapped in React.memo to prevent unnecessary re-renders
 */
export const SimulationViewer = memo(function SimulationViewer({
  positions,
  velocities,
  particleCount,
  config = {},
}: SimulationViewerProps) {
  const meshRef = useRef<Mesh>(null);
  const geometryRef = useRef<InstancedBufferGeometry | null>(null);
  const materialRef = useRef<ShaderMaterial | null>(null);

  // Merge config with defaults
  const renderConfig = useMemo(
    () => ({ ...defaultRenderConfig, ...config }),
    [config]
  );

  // Create instanced geometry
  const geometry = useMemo(() => {
    const geo = new InstancedBufferGeometry();

    // Quad vertices (billboard corners)
    const quadPositions = new Float32Array([
      -1, -1, 0,
       1, -1, 0,
      -1,  1, 0,
       1,  1, 0,
    ]);

    // Quad indices (two triangles)
    const quadIndices = new Uint16Array([0, 1, 2, 1, 3, 2]);

    geo.setAttribute('position', new BufferAttribute(quadPositions, 3));
    geo.setIndex(new BufferAttribute(quadIndices, 1));

    // Create instance attributes with initial size
    const instancePositions = new Float32Array(particleCount * 4);
    const instanceVelocities = new Float32Array(particleCount * 4);

    // Initialize with zeros
    for (let i = 0; i < particleCount; i++) {
      instancePositions[i * 4 + 3] = 1.0; // Default mass
    }

    const posAttr = new InstancedBufferAttribute(instancePositions, 4);
    const velAttr = new InstancedBufferAttribute(instanceVelocities, 4);
    posAttr.setUsage(35048); // DYNAMIC_DRAW
    velAttr.setUsage(35048);

    geo.setAttribute('instancePosition', posAttr);
    geo.setAttribute('instanceVelocity', velAttr);
    geo.instanceCount = particleCount;

    return geo;
  }, [particleCount]);

  // Create shader material
  const material = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        uPointSize: { value: renderConfig.pointSize },
        uMinSize: { value: renderConfig.minSize },
        uMaxSize: { value: renderConfig.maxSize },
        uVelocityScale: { value: renderConfig.velocityScale },
        uColorMode: { value: renderConfig.colorMode },
        uFieldType: { value: renderConfig.fieldType },
        uColormap: { value: renderConfig.colormap },
        uColormapReversed: { value: renderConfig.colormapReversed ?? false },
        uFieldMin: { value: renderConfig.fieldMin },
        uFieldMax: { value: renderConfig.fieldMax },
        uGaussianSigma: { value: renderConfig.gaussianSigma },
        uMinAlpha: { value: renderConfig.minAlpha },
        uBlendMode: { value: renderConfig.blendMode },
        uBrightness: { value: renderConfig.brightness },
        uBaseColor: { value: renderConfig.baseColor },
        uLightDir: { value: renderConfig.lightDir || [0.5, 0.7, 1.0] },
        uGyroidScale: { value: renderConfig.gyroidScale ?? 2 * Math.PI },
        uGyroidYMin: { value: renderConfig.gyroidYMin ?? 2.0 },
        uGyroidYMax: { value: renderConfig.gyroidYMax ?? 4.0 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: renderConfig.blendMode !== 1, // No depth write for additive
      blending: renderConfig.blendMode === 1 ? AdditiveBlending : NormalBlending,
      side: DoubleSide,
    });
  }, [renderConfig]);

  // Store geometry/material refs when they change
  useEffect(() => {
    geometryRef.current = geometry;
  }, [geometry]);

  useEffect(() => {
    materialRef.current = material;
  }, [material]);

  // Update instance attributes when positions/velocities change
  useEffect(() => {
    if (!geometryRef.current) return;

    const posAttr = geometryRef.current.getAttribute(
      'instancePosition'
    ) as InstancedBufferAttribute;
    const velAttr = geometryRef.current.getAttribute(
      'instanceVelocity'
    ) as InstancedBufferAttribute;

    if (positions && posAttr) {
      const array = posAttr.array as Float32Array;
      const copyLength = Math.min(positions.length, array.length);
      array.set(positions.subarray(0, copyLength));
      posAttr.needsUpdate = true;
    }

    if (velocities && velAttr) {
      const array = velAttr.array as Float32Array;
      const copyLength = Math.min(velocities.length, array.length);
      array.set(velocities.subarray(0, copyLength));
      velAttr.needsUpdate = true;
    }
  }, [positions, velocities]);

  // Update material uniforms when config changes
  useEffect(() => {
    if (!materialRef.current) return;

    const u = materialRef.current.uniforms;
    u.uPointSize.value = renderConfig.pointSize;
    u.uMinSize.value = renderConfig.minSize;
    u.uMaxSize.value = renderConfig.maxSize;
    u.uVelocityScale.value = renderConfig.velocityScale;
    u.uColorMode.value = renderConfig.colorMode;
    u.uFieldType.value = renderConfig.fieldType;
    u.uColormap.value = renderConfig.colormap;
    u.uColormapReversed.value = renderConfig.colormapReversed ?? false;
    u.uFieldMin.value = renderConfig.fieldMin;
    u.uFieldMax.value = renderConfig.fieldMax;
    u.uGaussianSigma.value = renderConfig.gaussianSigma;
    u.uMinAlpha.value = renderConfig.minAlpha;
    u.uBlendMode.value = renderConfig.blendMode;
    u.uBrightness.value = renderConfig.brightness;
    u.uBaseColor.value = renderConfig.baseColor;
    u.uLightDir.value = renderConfig.lightDir || [0.5, 0.7, 1.0];
    u.uGyroidScale.value = renderConfig.gyroidScale ?? 2 * Math.PI;
    u.uGyroidYMin.value = renderConfig.gyroidYMin ?? 2.0;
    u.uGyroidYMax.value = renderConfig.gyroidYMax ?? 4.0;

    // Update blending mode
    materialRef.current.blending =
      renderConfig.blendMode === 1 ? AdditiveBlending : NormalBlending;
    materialRef.current.depthWrite = renderConfig.blendMode !== 1;
    materialRef.current.needsUpdate = true;
  }, [renderConfig]);

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false} />
  );
});

export default SimulationViewer;
