/**
 * TPMS Viewer - Interactive visualization of Triply Periodic Minimal Surfaces
 *
 * Direct 3D view with type selector and adjustable parameters.
 * Real-time ray marching shader visualization.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  GizmoHelper,
  GizmoViewport,
  OrbitControls,
  PerspectiveCamera,
} from '@react-three/drei';
import {
  Vector3,
  ShaderMaterial,
  PerspectiveCamera as ThreePerspectiveCamera,
} from 'three';
import { Leva, useControls, folder } from 'leva';

import { Navbar } from '../../';
import {
  vertexShader,
  getFragmentShader,
  SURFACE_INDEX,
  SURFACE_NAMES,
  COLORMAP_INDEX,
  COLORMAP_NAMES,
  QUALITY_TIERS,
  type QualityTier,
} from './TPMSShader';
import { TPMS_SURFACES } from '@/shaders/tpms/surfaces';

// ============================================================================
// Types
// ============================================================================

interface TPMSParams {
  surface: string;
  morphTarget: string;
  morphFactor: number;
  renderMode: string;
  parallelProjection: boolean;
  frequency: number;
  scale: number;
  thickness: number;
  iso: number;
  rotation: number;
  lightIntensity: number;
  ambient: number;
  contrast: number;
  specular: number;
  shininess: number;
  fieldRange: number;
  fog: number;
  aoStrength: number;
  colormap: string;
  phaseX: number;
  phaseY: number;
  phaseZ: number;
}

interface TPMSViewerProps {
  params: TPMSParams;
  fragmentShader: string;
}

// ============================================================================
// TPMS Viewer Component (Three.js shader rendering)
// ============================================================================

const TPMSViewer = ({ params, fragmentShader }: TPMSViewerProps) => {
  const material = useRef<ShaderMaterial>(null);
  const { size, camera } = useThree();
  const lastAspect = useRef(size.width / size.height);

  const uniforms = useMemo(
    () => ({
      uResolution: { value: [size.width, size.height] },
      uTime: { value: 0 },
      uFov: { value: Math.PI / 4 },
      uFrequency: { value: params.frequency },
      uScale: { value: params.scale },
      uThickness: { value: params.thickness },
      uIso: { value: params.iso },
      uRotation: { value: params.rotation },
      uLightIntensity: { value: params.lightIntensity },
      uAmbient: { value: params.ambient },
      uContrast: { value: params.contrast },
      uSpecular: { value: params.specular },
      uShininess: { value: params.shininess },
      uFieldRange: { value: params.fieldRange },
      uSurfaceType: { value: SURFACE_INDEX[params.surface] ?? 0 },
      uMorphTarget: { value: SURFACE_INDEX[params.morphTarget] ?? 1 },
      uMorphFactor: { value: params.morphFactor },
      uRenderMode: { value: params.renderMode === 'Surface' ? 1.0 : 0.0 },
      uFog: { value: params.fog },
      uAoStrength: { value: params.aoStrength },
      uColormap: { value: COLORMAP_INDEX[params.colormap] ?? 0 },
      uProjection: { value: params.parallelProjection ? 1.0 : 0.0 },
      uOrthoScale: { value: 1.0 },
      uPhaseX: { value: params.phaseX },
      uPhaseY: { value: params.phaseY },
      uPhaseZ: { value: params.phaseZ },
      uCamPos: { value: camera.position.clone() },
      uCamRight: { value: new Vector3(1, 0, 0) },
      uCamUp: { value: new Vector3(0, 1, 0) },
      uCamForward: { value: new Vector3(0, 0, -1) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [size.width, size.height]
  );

  useEffect(() => {
    const nextAspect = size.width / size.height;
    uniforms.uResolution.value = [size.width, size.height];
    if (Math.abs(nextAspect - lastAspect.current) > 0.001) {
      (camera as ThreePerspectiveCamera).aspect = nextAspect;
      camera.updateProjectionMatrix();
      lastAspect.current = nextAspect;
    }
  }, [camera, size, uniforms]);

  useFrame(({ clock }) => {
    if (!material.current) return;
    const cam = camera as ThreePerspectiveCamera;

    material.current.uniforms.uTime.value = clock.getElapsedTime();
    material.current.uniforms.uFov.value = (cam.fov * Math.PI) / 180;
    material.current.uniforms.uProjection.value = params.parallelProjection
      ? 1.0
      : 0.0;

    const camDist = camera.position.length();
    material.current.uniforms.uOrthoScale.value = Math.max(
      camDist * Math.tan((cam.fov * Math.PI) / 360),
      0.001
    );

    material.current.uniforms.uCamPos.value.copy(camera.position);
    camera.updateMatrixWorld();

    const forward = new Vector3();
    camera.getWorldDirection(forward).normalize();
    const right = new Vector3().crossVectors(forward, camera.up).normalize();
    const up = new Vector3().crossVectors(right, forward).normalize();

    material.current.uniforms.uCamRight.value.copy(right);
    material.current.uniforms.uCamUp.value.copy(up);
    material.current.uniforms.uCamForward.value.copy(forward);

    // Update all params
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
    material.current.uniforms.uFog.value = params.fog;
    material.current.uniforms.uAoStrength.value = params.aoStrength;
    material.current.uniforms.uSurfaceType.value =
      SURFACE_INDEX[params.surface] ?? 0;
    material.current.uniforms.uMorphTarget.value =
      SURFACE_INDEX[params.morphTarget] ?? 1;
    material.current.uniforms.uMorphFactor.value = params.morphFactor;
    material.current.uniforms.uRenderMode.value =
      params.renderMode === 'Surface' ? 1.0 : 0.0;
    material.current.uniforms.uColormap.value =
      COLORMAP_INDEX[params.colormap] ?? 0;
    material.current.uniforms.uPhaseX.value = params.phaseX;
    material.current.uniforms.uPhaseY.value = params.phaseY;
    material.current.uniforms.uPhaseZ.value = params.phaseZ;
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

// ============================================================================
// Main TPMSGallery Component
// ============================================================================

function getDefaultQuality(): QualityTier {
  const cores = navigator.hardwareConcurrency ?? 4;
  if (cores <= 4) return 'low';
  if (cores <= 8) return 'medium';
  return 'high';
}

const TPMSGallery = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedSurface, setSelectedSurface] = useState<string>('Gyroid');
  const [quality, setQuality] = useState<QualityTier>(getDefaultQuality);

  const computedFragmentShader = useMemo(() => {
    const tier = QUALITY_TIERS[quality];
    return getFragmentShader(tier.volSteps, tier.surfSteps);
  }, [quality]);

  // Leva controls - organized with key params first
  const levaParams = useControls('TPMS', {
    surface: {
      value: selectedSurface,
      options: SURFACE_NAMES,
      onChange: (v: string) => setSelectedSurface(v),
    },
    Structure: folder({
      thickness: { value: 1.0, min: 0.02, max: 3.0, step: 0.01, label: 'Thickness' },
      frequency: { value: 2.0, min: 0.5, max: 6.0, step: 0.1, label: 'Repetitions' },
      scale: { value: 3.0, min: 0.5, max: 5.0, step: 0.1, label: 'Cell Size' },
      iso: { value: 0.0, min: -1.0, max: 1.0, step: 0.01, label: 'Offset' },
    }),
    'Phase Shift': folder({
      phaseX: { value: 0.0, min: 0.0, max: 6.28, step: 0.01, label: 'X' },
      phaseY: { value: 0.0, min: 0.0, max: 6.28, step: 0.01, label: 'Y' },
      phaseZ: { value: 0.0, min: 0.0, max: 6.28, step: 0.01, label: 'Z' },
    }, { collapsed: true }),
    Morphing: folder({
      morphTarget: { value: 'Schwarz P', options: SURFACE_NAMES, label: 'Target' },
      morphFactor: { value: 0.0, min: 0.0, max: 1.0, step: 0.01, label: 'Blend' },
    }, { collapsed: true }),
    Rendering: folder({
      renderMode: { value: 'Surface', options: ['Volume', 'Surface'] },
      colormap: { value: 'Viridis', options: COLORMAP_NAMES },
      parallelProjection: { value: false, label: 'Orthographic' },
      rotation: { value: 0.0, min: 0.0, max: 6.28, step: 0.01 },
    }, { collapsed: true }),
    Lighting: folder({
      lightIntensity: { value: 1.15, min: 0.2, max: 3.0, step: 0.05 },
      ambient: { value: 0.6, min: 0.0, max: 1.0, step: 0.05 },
      contrast: { value: 0.9, min: 0.5, max: 4.0, step: 0.05 },
      specular: { value: 1.0, min: 0.0, max: 1.0, step: 0.01 },
      shininess: { value: 20.0, min: 4.0, max: 128.0, step: 1.0 },
      fieldRange: { value: 0.2, min: 0.2, max: 3.0, step: 0.05 },
      fog: { value: 0.8, min: 0.0, max: 3.0, step: 0.05 },
      aoStrength: { value: 0.1, min: 0.0, max: 2.0, step: 0.05, label: 'AO' },
    }, { collapsed: true }),
  });

  // Combine leva params with surface from state
  const params: TPMSParams = {
    ...levaParams,
    surface: selectedSurface,
  };

  // Detect mobile
  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  // Get current surface info
  const currentSurfaceInfo = TPMS_SURFACES.find(
    (s) => s.displayName === selectedSurface
  );

  return (
    <div className="min-h-screen bg-primary">
      <Navbar />
      {import.meta.env.DEV && <Leva collapsed={false} titleBar={{ title: 'TPMS Controls' }} />}

      {isMobile ? (
        <section className="h-screen flex items-center justify-center text-center px-8 text-secondary">
          The TPMS Viewer requires a desktop browser for optimal performance.
        </section>
      ) : (
        <section className="h-screen pt-16">
          {/* Main Viewer - Full Screen */}
          <div className="h-full relative">
            <Canvas dpr={1.25} gl={{ antialias: true }}>
              <PerspectiveCamera
                makeDefault
                position={[2.5, 2.5, 2.5]}
                fov={45}
              />
              <OrbitControls enableDamping />
              <TPMSViewer params={params} fragmentShader={computedFragmentShader} />
              <GizmoHelper alignment="bottom-left" margin={[80, 80]}>
                <GizmoViewport
                  axisColors={['#d43d3d', '#2fb36d', '#2d6cdf']}
                />
              </GizmoHelper>
            </Canvas>

            {/* Surface Info Overlay */}
            {currentSurfaceInfo && (
              <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm p-4 rounded-lg max-w-sm">
                <h2 className="text-lg font-bold text-tertiary">
                  {currentSurfaceInfo.displayName}
                </h2>
                <p className="text-secondary text-sm mt-1">
                  {currentSurfaceInfo.description}
                </p>
                {currentSurfaceInfo.latex && (
                  <code className="block mt-2 text-xs bg-black/50 p-2 rounded text-green-400 overflow-x-auto">
                    f(x,y,z) = {currentSurfaceInfo.latex}
                  </code>
                )}
                <span
                  className={`
                    text-xs px-2 py-0.5 rounded mt-2 inline-block
                    ${currentSurfaceInfo.category === 'minimal' ? 'bg-blue-900/50 text-blue-300' : 'bg-amber-900/50 text-amber-300'}
                  `}
                >
                  {currentSurfaceInfo.category}
                </span>
              </div>
            )}

            {/* Controls hint */}
            <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm p-3 rounded-lg">
              <h3 className="text-sm font-semibold text-tertiary mb-1">Controls</h3>
              <ul className="text-xs text-secondary/80 space-y-0.5">
                <li>Left-click + drag: Rotate</li>
                <li>Right-click + drag: Pan</li>
                <li>Scroll: Zoom</li>
              </ul>
            </div>

            {/* Title overlay */}
            <div className="absolute top-4 left-4">
              <h1 className="text-2xl font-bold text-tertiary">TPMS Viewer</h1>
              <p className="text-secondary text-sm">
                Triply Periodic Minimal Surfaces from{' '}
                <a
                  href="https://github.com/3MAH/microgen"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-tertiary"
                >
                  microgen
                </a>
              </p>
            </div>

            {/* Quality selector */}
            <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm px-3 py-2 rounded-lg">
              <label className="text-xs text-secondary block mb-1">Quality</label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value as QualityTier)}
                className="bg-white/10 text-tertiary text-xs rounded px-2 py-1 border border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
              >
                {(Object.keys(QUALITY_TIERS) as QualityTier[]).map((tier) => (
                  <option key={tier} value={tier}>{QUALITY_TIERS[tier].label}</option>
                ))}
              </select>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default TPMSGallery;
