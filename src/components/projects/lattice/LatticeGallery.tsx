/**
 * Lattice Studio - Interactive visualization of strut-based lattice structures
 *
 * Direct 3D view with type selector and adjustable parameters.
 * Real-time SDF ray marching visualization.
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

import { Navbar } from '../../';
import {
  vertexShader,
  fragmentShader,
  LATTICE_INDEX,
  LATTICE_NAMES,
  COLORMAP_INDEX,
  COLORMAP_NAMES,
} from './LatticeShader';
import { LATTICE_TYPES } from '@/shaders/lattice/surfaces';

// ============================================================================
// Types
// ============================================================================

interface LatticeParams {
  latticeType: string;
  strutRadius: number;
  nodeRadius: number;
  nodeSmoothing: number;
  cellSize: number;
  repeatX: number;
  repeatY: number;
  repeatZ: number;
  rotation: number;
  colormap: string;
  parallelProjection: boolean;
  lightIntensity: number;
  ambient: number;
  contrast: number;
  specular: number;
  shininess: number;
  aoStrength: number;
  fog: number;
}

interface LatticeViewerProps {
  params: LatticeParams;
}

// ============================================================================
// Lattice Viewer Component (Three.js shader rendering)
// ============================================================================

const LatticeViewer = ({ params }: LatticeViewerProps) => {
  const material = useRef<ShaderMaterial>(null);
  const { size, camera } = useThree();
  const lastAspect = useRef(size.width / size.height);

  const uniforms = useMemo(
    () => ({
      uResolution: { value: [size.width, size.height] },
      uTime: { value: 0 },
      uFov: { value: Math.PI / 4 },
      uLatticeType: { value: LATTICE_INDEX[params.latticeType] ?? 0 },
      uStrutRadius: { value: params.strutRadius },
      uNodeRadius: { value: params.nodeRadius },
      uNodeSmoothing: { value: params.nodeSmoothing },
      uCellSize: { value: params.cellSize },
      uRepeatCount: { value: new Vector3(params.repeatX, params.repeatY, params.repeatZ) },
      uRotation: { value: params.rotation },
      uColormap: { value: COLORMAP_INDEX[params.colormap] ?? 1 },
      uParallelProjection: { value: params.parallelProjection },
      uOrthoScale: { value: 1.0 },
      uLightIntensity: { value: params.lightIntensity },
      uAmbient: { value: params.ambient },
      uContrast: { value: params.contrast },
      uSpecular: { value: params.specular },
      uShininess: { value: params.shininess },
      uAoStrength: { value: params.aoStrength },
      uFog: { value: params.fog },
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
    material.current.uniforms.uParallelProjection.value = params.parallelProjection;

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
    material.current.uniforms.uLatticeType.value =
      LATTICE_INDEX[params.latticeType] ?? 0;
    material.current.uniforms.uStrutRadius.value = params.strutRadius;
    material.current.uniforms.uNodeRadius.value = params.nodeRadius;
    material.current.uniforms.uNodeSmoothing.value = params.nodeSmoothing;
    material.current.uniforms.uCellSize.value = params.cellSize;
    material.current.uniforms.uRepeatCount.value.set(
      params.repeatX,
      params.repeatY,
      params.repeatZ
    );
    material.current.uniforms.uRotation.value = params.rotation;
    material.current.uniforms.uColormap.value =
      COLORMAP_INDEX[params.colormap] ?? 1;
    material.current.uniforms.uLightIntensity.value = params.lightIntensity;
    material.current.uniforms.uAmbient.value = params.ambient;
    material.current.uniforms.uContrast.value = params.contrast;
    material.current.uniforms.uSpecular.value = params.specular;
    material.current.uniforms.uShininess.value = params.shininess;
    material.current.uniforms.uAoStrength.value = params.aoStrength;
    material.current.uniforms.uFog.value = params.fog;
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
// Control Panel Components
// ============================================================================

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

const Slider = ({ label, value, min, max, step, onChange }: SliderProps) => (
  <div className="flex flex-col gap-1">
    <div className="flex justify-between text-xs">
      <span className="text-secondary">{label}</span>
      <span className="text-tertiary font-mono">{value.toFixed(step < 1 ? 2 : 0)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-[#1B263B] rounded-lg appearance-none cursor-pointer
        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#778da9]
        [&::-webkit-slider-thumb]:hover:bg-[#8a9db8] [&::-webkit-slider-thumb]:transition-colors"
    />
  </div>
);

interface SelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

const Select = ({ label, value, options, onChange }: SelectProps) => (
  <div className="flex flex-col gap-1">
    <span className="text-xs text-secondary">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2 py-1.5 bg-[#1B263B] text-tertiary text-sm rounded border border-[#2a3a52]
        focus:outline-none focus:border-[#778da9] cursor-pointer"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const Checkbox = ({ label, checked, onChange }: CheckboxProps) => (
  <label className="flex items-center gap-2 cursor-pointer group">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="sr-only"
    />
    <div className={`w-4 h-4 rounded border ${checked ? 'bg-[#778da9] border-[#778da9]' : 'bg-[#1B263B] border-[#2a3a52]'}
      flex items-center justify-center transition-colors group-hover:border-[#778da9]`}>
      {checked && (
        <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
    <span className="text-xs text-secondary">{label}</span>
  </label>
);

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const CollapsibleSection = ({ title, defaultOpen = true, children }: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#1B263B] last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 text-xs font-semibold text-tertiary uppercase tracking-wider hover:text-white transition-colors"
      >
        {title}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="pb-3 space-y-3">{children}</div>}
    </div>
  );
};

// ============================================================================
// Main LatticeGallery Component
// ============================================================================

const LatticeGallery = () => {
  const [isMobile, setIsMobile] = useState(false);

  // All state managed with React
  const [latticeType, setLatticeType] = useState('Octet Truss');
  const [strutRadius, setStrutRadius] = useState(0.04);
  const [nodeRadius, setNodeRadius] = useState(0.06);
  const [nodeSmoothing, setNodeSmoothing] = useState(0.02);
  const [cellSize, setCellSize] = useState(1.0);
  const [repeatX, setRepeatX] = useState(3);
  const [repeatY, setRepeatY] = useState(3);
  const [repeatZ, setRepeatZ] = useState(3);
  const [colormap, setColormap] = useState('Viridis');
  const [parallelProjection, setParallelProjection] = useState(false);
  const [rotation, setRotation] = useState(0.0);
  const [lightIntensity, setLightIntensity] = useState(1.2);
  const [ambient, setAmbient] = useState(0.5);
  const [contrast, setContrast] = useState(1.0);
  const [specular, setSpecular] = useState(0.8);
  const [shininess, setShininess] = useState(32.0);
  const [aoStrength, setAoStrength] = useState(0.3);
  const [fog, setFog] = useState(0.5);

  const params: LatticeParams = {
    latticeType,
    strutRadius,
    nodeRadius,
    nodeSmoothing,
    cellSize,
    repeatX,
    repeatY,
    repeatZ,
    colormap,
    parallelProjection,
    rotation,
    lightIntensity,
    ambient,
    contrast,
    specular,
    shininess,
    aoStrength,
    fog,
  };

  // Detect mobile
  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  // Get current lattice info
  const currentLatticeInfo = LATTICE_TYPES.find(
    (l) => l.displayName === latticeType
  );

  return (
    <div className="min-h-screen bg-primary">
      <Navbar />

      {isMobile ? (
        <section className="h-screen flex items-center justify-center text-center px-8 text-secondary">
          The Lattice Studio requires a desktop browser for optimal performance.
        </section>
      ) : (
        <section className="h-screen pt-16 flex">
          {/* Main Viewer */}
          <div className="flex-1 relative">
            <Canvas dpr={1.25} gl={{ antialias: true }}>
              <PerspectiveCamera
                makeDefault
                position={[4, 4, 4]}
                fov={40}
              />
              <OrbitControls enableDamping />
              <LatticeViewer params={params} />
              <GizmoHelper alignment="bottom-left" margin={[80, 80]}>
                <GizmoViewport
                  axisColors={['#d43d3d', '#2fb36d', '#2d6cdf']}
                />
              </GizmoHelper>
            </Canvas>

            {/* Lattice Info Overlay */}
            {currentLatticeInfo && (
              <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm p-4 rounded-lg max-w-sm">
                <h2 className="text-lg font-bold text-tertiary">
                  {currentLatticeInfo.displayName}
                </h2>
                <p className="text-secondary text-sm mt-1">
                  {currentLatticeInfo.description}
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <span
                    className={`
                      text-xs px-2 py-0.5 rounded
                      ${currentLatticeInfo.category === 'cubic' ? 'bg-blue-900/50 text-blue-300' : 'bg-emerald-900/50 text-emerald-300'}
                    `}
                  >
                    {currentLatticeInfo.category}
                  </span>
                  <span className="text-xs text-secondary">
                    {currentLatticeInfo.strutsPerCell} struts/cell
                  </span>
                  <span className="text-xs text-secondary">
                    ~{(currentLatticeInfo.relativeDensity * 100).toFixed(0)}% density
                  </span>
                </div>
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
              <h1 className="text-2xl font-bold text-tertiary">Lattice Studio</h1>
              <p className="text-secondary text-sm">
                Strut-based lattice structures for additive manufacturing
              </p>
            </div>
          </div>

          {/* Right Panel */}
          <div className="w-72 bg-[#0a0f18] border-l border-[#1B263B] overflow-y-auto">
            <div className="p-4">
              <h2 className="text-sm font-bold text-tertiary mb-4">Lattice Controls</h2>

              {/* Lattice Type */}
              <div className="mb-4">
                <Select
                  label="Lattice Type"
                  value={latticeType}
                  options={LATTICE_NAMES}
                  onChange={setLatticeType}
                />
              </div>

              {/* Structure */}
              <CollapsibleSection title="Structure">
                <Slider label="Strut Thickness" value={strutRadius} min={0.01} max={0.15} step={0.005} onChange={setStrutRadius} />
                <Slider label="Node Radius" value={nodeRadius} min={0} max={0.2} step={0.005} onChange={setNodeRadius} />
                <Slider label="Node Blend" value={nodeSmoothing} min={0} max={0.1} step={0.005} onChange={setNodeSmoothing} />
                <Slider label="Cell Size" value={cellSize} min={0.5} max={2.0} step={0.1} onChange={setCellSize} />
              </CollapsibleSection>

              {/* Repetitions */}
              <CollapsibleSection title="Repetitions">
                <Slider label="X" value={repeatX} min={1} max={5} step={1} onChange={setRepeatX} />
                <Slider label="Y" value={repeatY} min={1} max={5} step={1} onChange={setRepeatY} />
                <Slider label="Z" value={repeatZ} min={1} max={5} step={1} onChange={setRepeatZ} />
              </CollapsibleSection>

              {/* Rendering */}
              <CollapsibleSection title="Rendering" defaultOpen={false}>
                <Select label="Colormap" value={colormap} options={COLORMAP_NAMES} onChange={setColormap} />
                <Checkbox label="Orthographic" checked={parallelProjection} onChange={setParallelProjection} />
                <Slider label="Rotation" value={rotation} min={0} max={6.28} step={0.01} onChange={setRotation} />
              </CollapsibleSection>

              {/* Lighting */}
              <CollapsibleSection title="Lighting" defaultOpen={false}>
                <Slider label="Intensity" value={lightIntensity} min={0.2} max={3.0} step={0.05} onChange={setLightIntensity} />
                <Slider label="Ambient" value={ambient} min={0} max={1} step={0.05} onChange={setAmbient} />
                <Slider label="Contrast" value={contrast} min={0.5} max={2} step={0.05} onChange={setContrast} />
                <Slider label="Specular" value={specular} min={0} max={1} step={0.05} onChange={setSpecular} />
                <Slider label="Shininess" value={shininess} min={4} max={128} step={1} onChange={setShininess} />
                <Slider label="AO" value={aoStrength} min={0} max={2} step={0.05} onChange={setAoStrength} />
                <Slider label="Fog" value={fog} min={0} max={2} step={0.05} onChange={setFog} />
              </CollapsibleSection>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default LatticeGallery;
