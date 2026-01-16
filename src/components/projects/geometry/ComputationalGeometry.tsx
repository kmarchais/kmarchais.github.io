/**
 * Computational Geometry Studio
 *
 * Unified viewer for TPMS (Triply Periodic Minimal Surfaces) and Lattice structures.
 * Real-time SDF ray marching visualization with interactive controls.
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
  MOUSE,
} from 'three';

import { Navbar } from '../../';
import {
  Slider,
  Select,
  Checkbox,
  CollapsibleSection,
  ControlsHint,
  MobileFallback,
} from '../../ui/ControlPanel';

// TPMS imports
import {
  vertexShader as tpmsVertexShader,
  fragmentShader as tpmsFragmentShader,
  SURFACE_INDEX,
  SURFACE_NAMES,
  COLORMAP_INDEX as TPMS_COLORMAP_INDEX,
  COLORMAP_NAMES as TPMS_COLORMAP_NAMES,
} from '../tpms/TPMSShader';
import { TPMS_SURFACES } from '@/shaders/tpms/surfaces';

// Lattice imports
import {
  vertexShader as latticeVertexShader,
  fragmentShader as latticeFragmentShader,
  LATTICE_INDEX,
  LATTICE_NAMES,
  COLORMAP_INDEX as LATTICE_COLORMAP_INDEX,
  COLORMAP_NAMES as LATTICE_COLORMAP_NAMES,
} from '../lattice/LatticeShader';
import { LATTICE_TYPES } from '@/shaders/lattice/surfaces';

// ============================================================================
// Types
// ============================================================================

type TabType = 'tpms' | 'lattice';

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

// ============================================================================
// TPMS Viewer Component
// ============================================================================

const TPMSViewer = ({ params }: { params: TPMSParams }) => {
  const material = useRef<ShaderMaterial>(null);
  const { size, camera, gl } = useThree();
  const lastAspect = useRef(size.width / size.height);

  // Use actual pixel dimensions (accounting for device pixel ratio)
  const pixelWidth = gl.domElement.width;
  const pixelHeight = gl.domElement.height;

  const uniforms = useMemo(
    () => ({
      uResolution: { value: [pixelWidth, pixelHeight] },
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
      uColormap: { value: TPMS_COLORMAP_INDEX[params.colormap] ?? 0 },
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
    [pixelWidth, pixelHeight]
  );

  useEffect(() => {
    // Use actual pixel dimensions from the canvas
    const currentPixelWidth = gl.domElement.width;
    const currentPixelHeight = gl.domElement.height;
    const nextAspect = currentPixelWidth / currentPixelHeight;
    uniforms.uResolution.value = [currentPixelWidth, currentPixelHeight];
    if (Math.abs(nextAspect - lastAspect.current) > 0.001) {
      (camera as ThreePerspectiveCamera).aspect = nextAspect;
      camera.updateProjectionMatrix();
      lastAspect.current = nextAspect;
    }
  }, [camera, size, uniforms, gl]);

  useFrame(({ clock }) => {
    if (!material.current) return;
    const cam = camera as ThreePerspectiveCamera;

    material.current.uniforms.uTime.value = clock.getElapsedTime();
    material.current.uniforms.uFov.value = (cam.fov * Math.PI) / 180;
    material.current.uniforms.uProjection.value = params.parallelProjection ? 1.0 : 0.0;

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
    material.current.uniforms.uSurfaceType.value = SURFACE_INDEX[params.surface] ?? 0;
    material.current.uniforms.uMorphTarget.value = SURFACE_INDEX[params.morphTarget] ?? 1;
    material.current.uniforms.uMorphFactor.value = params.morphFactor;
    material.current.uniforms.uRenderMode.value = params.renderMode === 'Surface' ? 1.0 : 0.0;
    material.current.uniforms.uColormap.value = TPMS_COLORMAP_INDEX[params.colormap] ?? 0;
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
        vertexShader={tpmsVertexShader}
        fragmentShader={tpmsFragmentShader}
      />
    </mesh>
  );
};

// ============================================================================
// Lattice Viewer Component
// ============================================================================

const LatticeViewer = ({ params }: { params: LatticeParams }) => {
  const material = useRef<ShaderMaterial>(null);
  const { size, camera, gl } = useThree();
  const lastAspect = useRef(size.width / size.height);

  // Use actual pixel dimensions (accounting for device pixel ratio)
  const pixelWidth = gl.domElement.width;
  const pixelHeight = gl.domElement.height;

  const uniforms = useMemo(
    () => ({
      uResolution: { value: [pixelWidth, pixelHeight] },
      uTime: { value: 0 },
      uFov: { value: Math.PI / 4 },
      uLatticeType: { value: LATTICE_INDEX[params.latticeType] ?? 0 },
      uStrutRadius: { value: params.strutRadius },
      uNodeRadius: { value: params.nodeRadius },
      uNodeSmoothing: { value: params.nodeSmoothing },
      uCellSize: { value: params.cellSize },
      uRepeatCount: { value: new Vector3(params.repeatX, params.repeatY, params.repeatZ) },
      uRotation: { value: params.rotation },
      uColormap: { value: LATTICE_COLORMAP_INDEX[params.colormap] ?? 1 },
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
    [pixelWidth, pixelHeight]
  );

  useEffect(() => {
    // Use actual pixel dimensions from the canvas
    const currentPixelWidth = gl.domElement.width;
    const currentPixelHeight = gl.domElement.height;
    const nextAspect = currentPixelWidth / currentPixelHeight;
    uniforms.uResolution.value = [currentPixelWidth, currentPixelHeight];
    if (Math.abs(nextAspect - lastAspect.current) > 0.001) {
      (camera as ThreePerspectiveCamera).aspect = nextAspect;
      camera.updateProjectionMatrix();
      lastAspect.current = nextAspect;
    }
  }, [camera, size, uniforms, gl]);

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
    material.current.uniforms.uLatticeType.value = LATTICE_INDEX[params.latticeType] ?? 0;
    material.current.uniforms.uStrutRadius.value = params.strutRadius;
    material.current.uniforms.uNodeRadius.value = params.nodeRadius;
    material.current.uniforms.uNodeSmoothing.value = params.nodeSmoothing;
    material.current.uniforms.uCellSize.value = params.cellSize;
    material.current.uniforms.uRepeatCount.value.set(params.repeatX, params.repeatY, params.repeatZ);
    material.current.uniforms.uRotation.value = params.rotation;
    material.current.uniforms.uColormap.value = LATTICE_COLORMAP_INDEX[params.colormap] ?? 1;
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
        vertexShader={latticeVertexShader}
        fragmentShader={latticeFragmentShader}
      />
    </mesh>
  );
};

// ============================================================================
// Camera Position Calculator
// ============================================================================

/**
 * Compute camera position to fit geometry bounds in view
 */
function computeCameraPosition(boundsX: number, boundsY: number, boundsZ: number, fov: number): [number, number, number] {
  const maxDim = Math.max(boundsX, boundsY, boundsZ);

  // For perspective camera: distance = (size/2) / tan(fov/2)
  const fovRad = (fov * Math.PI) / 180;
  const halfFov = fovRad / 2;

  // Fit radius with comfortable margin
  const fitRadius = maxDim * 0.85;
  const distance = fitRadius / Math.tan(halfFov);

  // Position camera along diagonal
  const norm = 1 / Math.sqrt(3);
  const pos = distance * norm;

  return [pos, pos, pos];
}

// ============================================================================
// Tab Button Component
// ============================================================================

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const TabButton = ({ active, onClick, children }: TabButtonProps) => (
  <button
    onClick={onClick}
    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
      active
        ? 'bg-[#778da9] text-primary'
        : 'text-secondary hover:text-tertiary hover:bg-[#1B263B]'
    }`}
  >
    {children}
  </button>
);

// ============================================================================
// TPMS Controls Panel
// ============================================================================

interface TPMSControlsProps {
  params: TPMSParams;
  setParams: {
    setSurface: (v: string) => void;
    setMorphTarget: (v: string) => void;
    setMorphFactor: (v: number) => void;
    setRenderMode: (v: string) => void;
    setParallelProjection: (v: boolean) => void;
    setFrequency: (v: number) => void;
    setScale: (v: number) => void;
    setThickness: (v: number) => void;
    setIso: (v: number) => void;
    setRotation: (v: number) => void;
    setLightIntensity: (v: number) => void;
    setAmbient: (v: number) => void;
    setContrast: (v: number) => void;
    setSpecular: (v: number) => void;
    setShininess: (v: number) => void;
    setFieldRange: (v: number) => void;
    setFog: (v: number) => void;
    setAoStrength: (v: number) => void;
    setColormap: (v: string) => void;
    setPhaseX: (v: number) => void;
    setPhaseY: (v: number) => void;
    setPhaseZ: (v: number) => void;
  };
}

const TPMSControls = ({ params, setParams }: TPMSControlsProps) => (
  <>
    <div className="mb-4">
      <Select label="Surface Type" value={params.surface} options={SURFACE_NAMES} onChange={setParams.setSurface} />
    </div>

    <CollapsibleSection title="Structure">
      <Slider label="Thickness" value={params.thickness} min={0.02} max={3.0} step={0.01} onChange={setParams.setThickness} />
      <Slider label="Repetitions" value={params.frequency} min={0.5} max={6.0} step={0.1} onChange={setParams.setFrequency} />
      <Slider label="Cell Size" value={params.scale} min={0.5} max={5.0} step={0.1} onChange={setParams.setScale} />
      <Slider label="Offset" value={params.iso} min={-1.0} max={1.0} step={0.01} onChange={setParams.setIso} />
    </CollapsibleSection>

    <CollapsibleSection title="Phase Shift" defaultOpen={false}>
      <Slider label="X" value={params.phaseX} min={0} max={6.28} step={0.01} onChange={setParams.setPhaseX} />
      <Slider label="Y" value={params.phaseY} min={0} max={6.28} step={0.01} onChange={setParams.setPhaseY} />
      <Slider label="Z" value={params.phaseZ} min={0} max={6.28} step={0.01} onChange={setParams.setPhaseZ} />
    </CollapsibleSection>

    <CollapsibleSection title="Morphing" defaultOpen={false}>
      <Select label="Target" value={params.morphTarget} options={SURFACE_NAMES} onChange={setParams.setMorphTarget} />
      <Slider label="Blend" value={params.morphFactor} min={0} max={1} step={0.01} onChange={setParams.setMorphFactor} />
    </CollapsibleSection>

    <CollapsibleSection title="Rendering" defaultOpen={false}>
      <Select label="Mode" value={params.renderMode} options={['Volume', 'Surface']} onChange={setParams.setRenderMode} />
      <Select label="Colormap" value={params.colormap} options={TPMS_COLORMAP_NAMES} onChange={setParams.setColormap} />
      <Checkbox label="Orthographic" checked={params.parallelProjection} onChange={setParams.setParallelProjection} />
      <Slider label="Rotation" value={params.rotation} min={0} max={6.28} step={0.01} onChange={setParams.setRotation} />
    </CollapsibleSection>

    <CollapsibleSection title="Lighting" defaultOpen={false}>
      <Slider label="Intensity" value={params.lightIntensity} min={0.2} max={3.0} step={0.05} onChange={setParams.setLightIntensity} />
      <Slider label="Ambient" value={params.ambient} min={0} max={1} step={0.05} onChange={setParams.setAmbient} />
      <Slider label="Contrast" value={params.contrast} min={0.5} max={4} step={0.05} onChange={setParams.setContrast} />
      <Slider label="Specular" value={params.specular} min={0} max={1} step={0.01} onChange={setParams.setSpecular} />
      <Slider label="Shininess" value={params.shininess} min={4} max={128} step={1} onChange={setParams.setShininess} />
      <Slider label="Field Range" value={params.fieldRange} min={0.2} max={3} step={0.05} onChange={setParams.setFieldRange} />
      <Slider label="AO" value={params.aoStrength} min={0} max={2} step={0.05} onChange={setParams.setAoStrength} />
      <Slider label="Fog" value={params.fog} min={0} max={3} step={0.05} onChange={setParams.setFog} />
    </CollapsibleSection>
  </>
);

// ============================================================================
// Lattice Controls Panel
// ============================================================================

interface LatticeControlsProps {
  params: LatticeParams;
  setParams: {
    setLatticeType: (v: string) => void;
    setStrutRadius: (v: number) => void;
    setNodeRadius: (v: number) => void;
    setNodeSmoothing: (v: number) => void;
    setCellSize: (v: number) => void;
    setRepeatX: (v: number) => void;
    setRepeatY: (v: number) => void;
    setRepeatZ: (v: number) => void;
    setColormap: (v: string) => void;
    setParallelProjection: (v: boolean) => void;
    setRotation: (v: number) => void;
    setLightIntensity: (v: number) => void;
    setAmbient: (v: number) => void;
    setContrast: (v: number) => void;
    setSpecular: (v: number) => void;
    setShininess: (v: number) => void;
    setAoStrength: (v: number) => void;
    setFog: (v: number) => void;
  };
}

const LatticeControls = ({ params, setParams }: LatticeControlsProps) => (
  <>
    <div className="mb-4">
      <Select label="Lattice Type" value={params.latticeType} options={LATTICE_NAMES} onChange={setParams.setLatticeType} />
    </div>

    <CollapsibleSection title="Structure">
      <Slider label="Strut Thickness" value={params.strutRadius} min={0.01} max={0.15} step={0.005} onChange={setParams.setStrutRadius} />
      <Slider label="Fillet Radius" value={params.nodeSmoothing} min={0} max={0.1} step={0.005} onChange={setParams.setNodeSmoothing} />
      <Slider label="Cell Size" value={params.cellSize} min={0.5} max={2.0} step={0.1} onChange={setParams.setCellSize} />
    </CollapsibleSection>

    <CollapsibleSection title="Repetitions">
      <Slider label="X" value={params.repeatX} min={1} max={5} step={1} onChange={setParams.setRepeatX} />
      <Slider label="Y" value={params.repeatY} min={1} max={5} step={1} onChange={setParams.setRepeatY} />
      <Slider label="Z" value={params.repeatZ} min={1} max={5} step={1} onChange={setParams.setRepeatZ} />
    </CollapsibleSection>

    <CollapsibleSection title="Rendering" defaultOpen={false}>
      <Select label="Colormap" value={params.colormap} options={LATTICE_COLORMAP_NAMES} onChange={setParams.setColormap} />
      <Checkbox label="Orthographic" checked={params.parallelProjection} onChange={setParams.setParallelProjection} />
      <Slider label="Rotation" value={params.rotation} min={0} max={6.28} step={0.01} onChange={setParams.setRotation} />
    </CollapsibleSection>

    <CollapsibleSection title="Lighting" defaultOpen={false}>
      <Slider label="Intensity" value={params.lightIntensity} min={0.2} max={3.0} step={0.05} onChange={setParams.setLightIntensity} />
      <Slider label="Ambient" value={params.ambient} min={0} max={1} step={0.05} onChange={setParams.setAmbient} />
      <Slider label="Contrast" value={params.contrast} min={0.5} max={2} step={0.05} onChange={setParams.setContrast} />
      <Slider label="Specular" value={params.specular} min={0} max={1} step={0.05} onChange={setParams.setSpecular} />
      <Slider label="Shininess" value={params.shininess} min={4} max={128} step={1} onChange={setParams.setShininess} />
      <Slider label="AO" value={params.aoStrength} min={0} max={2} step={0.05} onChange={setParams.setAoStrength} />
      <Slider label="Fog" value={params.fog} min={0} max={2} step={0.05} onChange={setParams.setFog} />
    </CollapsibleSection>
  </>
);

// ============================================================================
// Main ComputationalGeometry Component
// ============================================================================

const ComputationalGeometry = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('tpms');
  const [cameraKey, setCameraKey] = useState(0);

  // TPMS State
  const [tpmsSurface, setTpmsSurface] = useState('Gyroid');
  const [tpmsMorphTarget, setTpmsMorphTarget] = useState('Schwarz P');
  const [tpmsMorphFactor, setTpmsMorphFactor] = useState(0.0);
  const [tpmsRenderMode, setTpmsRenderMode] = useState('Surface');
  const [tpmsParallelProjection, setTpmsParallelProjection] = useState(false);
  const [tpmsFrequency, setTpmsFrequency] = useState(2.0);
  const [tpmsScale, setTpmsScale] = useState(3.0);
  const [tpmsThickness, setTpmsThickness] = useState(1.0);
  const [tpmsIso, setTpmsIso] = useState(0.0);
  const [tpmsRotation, setTpmsRotation] = useState(0.0);
  const [tpmsLightIntensity, setTpmsLightIntensity] = useState(1.15);
  const [tpmsAmbient, setTpmsAmbient] = useState(0.6);
  const [tpmsContrast, setTpmsContrast] = useState(0.9);
  const [tpmsSpecular, setTpmsSpecular] = useState(1.0);
  const [tpmsShininess, setTpmsShininess] = useState(20.0);
  const [tpmsFieldRange, setTpmsFieldRange] = useState(0.2);
  const [tpmsFog, setTpmsFog] = useState(0.8);
  const [tpmsAoStrength, setTpmsAoStrength] = useState(0.1);
  const [tpmsColormap, setTpmsColormap] = useState('Viridis');
  const [tpmsPhaseX, setTpmsPhaseX] = useState(0.0);
  const [tpmsPhaseY, setTpmsPhaseY] = useState(0.0);
  const [tpmsPhaseZ, setTpmsPhaseZ] = useState(0.0);

  // Lattice State
  const [latticeType, setLatticeType] = useState('Octet Truss');
  const [latticeStrutRadius, setLatticeStrutRadius] = useState(0.04);
  const [latticeNodeRadius, setLatticeNodeRadius] = useState(0.06);
  const [latticeNodeSmoothing, setLatticeNodeSmoothing] = useState(0.02);
  const [latticeCellSize, setLatticeCellSize] = useState(1.0);
  const [latticeRepeatX, setLatticeRepeatX] = useState(1);
  const [latticeRepeatY, setLatticeRepeatY] = useState(1);
  const [latticeRepeatZ, setLatticeRepeatZ] = useState(1);
  const [latticeColormap, setLatticeColormap] = useState('Viridis');
  const [latticeParallelProjection, setLatticeParallelProjection] = useState(false);
  const [latticeRotation, setLatticeRotation] = useState(0.0);
  const [latticeLightIntensity, setLatticeLightIntensity] = useState(1.2);
  const [latticeAmbient, setLatticeAmbient] = useState(0.5);
  const [latticeContrast, setLatticeContrast] = useState(1.0);
  const [latticeSpecular, setLatticeSpecular] = useState(0.8);
  const [latticeShininess, setLatticeShininess] = useState(32.0);
  const [latticeAoStrength, setLatticeAoStrength] = useState(0.3);
  const [latticeFog, setLatticeFog] = useState(0.5);

  const tpmsParams: TPMSParams = {
    surface: tpmsSurface,
    morphTarget: tpmsMorphTarget,
    morphFactor: tpmsMorphFactor,
    renderMode: tpmsRenderMode,
    parallelProjection: tpmsParallelProjection,
    frequency: tpmsFrequency,
    scale: tpmsScale,
    thickness: tpmsThickness,
    iso: tpmsIso,
    rotation: tpmsRotation,
    lightIntensity: tpmsLightIntensity,
    ambient: tpmsAmbient,
    contrast: tpmsContrast,
    specular: tpmsSpecular,
    shininess: tpmsShininess,
    fieldRange: tpmsFieldRange,
    fog: tpmsFog,
    aoStrength: tpmsAoStrength,
    colormap: tpmsColormap,
    phaseX: tpmsPhaseX,
    phaseY: tpmsPhaseY,
    phaseZ: tpmsPhaseZ,
  };

  const latticeParams: LatticeParams = {
    latticeType,
    strutRadius: latticeStrutRadius,
    nodeRadius: latticeNodeRadius,
    nodeSmoothing: latticeNodeSmoothing,
    cellSize: latticeCellSize,
    repeatX: latticeRepeatX,
    repeatY: latticeRepeatY,
    repeatZ: latticeRepeatZ,
    colormap: latticeColormap,
    parallelProjection: latticeParallelProjection,
    rotation: latticeRotation,
    lightIntensity: latticeLightIntensity,
    ambient: latticeAmbient,
    contrast: latticeContrast,
    specular: latticeSpecular,
    shininess: latticeShininess,
    aoStrength: latticeAoStrength,
    fog: latticeFog,
  };

  // Detect mobile
  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  // Get current info
  const currentTPMSInfo = TPMS_SURFACES.find((s) => s.displayName === tpmsSurface);
  const currentLatticeInfo = LATTICE_TYPES.find((l) => l.displayName === latticeType);

  return (
    <div className="min-h-screen bg-primary flex flex-col">
      <Navbar />

      {isMobile ? (
        <MobileFallback appName="Computational Geometry Studio" />
      ) : (
        <>
          {/* Header with title and tabs */}
          <div className="pt-16 bg-[#0a0f18] border-b border-[#1B263B]">
            <div className="flex items-center justify-between px-6 py-3">
              <div>
                <h1 className="text-xl font-bold text-tertiary">Computational Geometry</h1>
                <p className="text-secondary text-xs">
                  {activeTab === 'tpms' ? (
                    <>
                      TPMS from{' '}
                      <a
                        href="https://github.com/3MAH/microgen"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-tertiary"
                      >
                        microgen
                      </a>
                    </>
                  ) : (
                    'Strut-based lattice structures'
                  )}
                </p>
              </div>
              <div className="flex gap-1 bg-[#1B263B]/50 rounded-lg p-1">
                <TabButton active={activeTab === 'tpms'} onClick={() => setActiveTab('tpms')}>
                  TPMS
                </TabButton>
                <TabButton active={activeTab === 'lattice'} onClick={() => setActiveTab('lattice')}>
                  Lattice
                </TabButton>
              </div>
            </div>
          </div>

          {/* Main content */}
          <section className="flex-1 flex min-h-0">
            {/* Canvas Viewer */}
            <div className="flex-1 relative min-w-0">
              <Canvas
                key={`${activeTab}-${cameraKey}`}
                dpr={1.25}
                gl={{ antialias: true }}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
              >
                <PerspectiveCamera
                  makeDefault
                  position={computeCameraPosition(
                    // TPMS uses fixed BOX_SIZE = vec3(0.5), so full extent is 1.0
                    // Lattice uses uRepeatCount * uCellSize for full extent
                    activeTab === 'tpms' ? 1.0 : latticeParams.repeatX * latticeParams.cellSize,
                    activeTab === 'tpms' ? 1.0 : latticeParams.repeatY * latticeParams.cellSize,
                    activeTab === 'tpms' ? 1.0 : latticeParams.repeatZ * latticeParams.cellSize,
                    45
                  )}
                  fov={45}
                />
                <OrbitControls
                  enableDamping
                  target={[0, 0, 0]}
                  mouseButtons={{
                    LEFT: MOUSE.ROTATE,
                    MIDDLE: MOUSE.PAN,
                    RIGHT: MOUSE.DOLLY,
                  }}
                />
                {activeTab === 'tpms' ? (
                  <TPMSViewer params={tpmsParams} />
                ) : (
                  <LatticeViewer params={latticeParams} />
                )}
                <GizmoHelper alignment="bottom-left" margin={[80, 80]}>
                  <GizmoViewport axisColors={['#d43d3d', '#2fb36d', '#2d6cdf']} />
                </GizmoHelper>
              </Canvas>

              {/* Reset View Button */}
              <button
                onClick={() => setCameraKey((k) => k + 1)}
                className="absolute top-4 right-4 px-3 py-1.5 bg-black/80 backdrop-blur-sm text-secondary text-xs
                  rounded-lg hover:text-tertiary hover:bg-black/90 transition-colors"
                title="Reset camera view"
              >
                Reset View
              </button>

              <ControlsHint />
            </div>

            {/* Right Panel */}
            <div className="w-72 bg-[#0a0f18] border-l border-[#1B263B] flex flex-col">
              {/* Controls */}
              <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'tpms' ? (
                <TPMSControls
                  params={tpmsParams}
                  setParams={{
                    setSurface: setTpmsSurface,
                    setMorphTarget: setTpmsMorphTarget,
                    setMorphFactor: setTpmsMorphFactor,
                    setRenderMode: setTpmsRenderMode,
                    setParallelProjection: setTpmsParallelProjection,
                    setFrequency: setTpmsFrequency,
                    setScale: setTpmsScale,
                    setThickness: setTpmsThickness,
                    setIso: setTpmsIso,
                    setRotation: setTpmsRotation,
                    setLightIntensity: setTpmsLightIntensity,
                    setAmbient: setTpmsAmbient,
                    setContrast: setTpmsContrast,
                    setSpecular: setTpmsSpecular,
                    setShininess: setTpmsShininess,
                    setFieldRange: setTpmsFieldRange,
                    setFog: setTpmsFog,
                    setAoStrength: setTpmsAoStrength,
                    setColormap: setTpmsColormap,
                    setPhaseX: setTpmsPhaseX,
                    setPhaseY: setTpmsPhaseY,
                    setPhaseZ: setTpmsPhaseZ,
                  }}
                />
              ) : (
                <LatticeControls
                  params={latticeParams}
                  setParams={{
                    setLatticeType,
                    setStrutRadius: setLatticeStrutRadius,
                    setNodeRadius: setLatticeNodeRadius,
                    setNodeSmoothing: setLatticeNodeSmoothing,
                    setCellSize: setLatticeCellSize,
                    setRepeatX: setLatticeRepeatX,
                    setRepeatY: setLatticeRepeatY,
                    setRepeatZ: setLatticeRepeatZ,
                    setColormap: setLatticeColormap,
                    setParallelProjection: setLatticeParallelProjection,
                    setRotation: setLatticeRotation,
                    setLightIntensity: setLatticeLightIntensity,
                    setAmbient: setLatticeAmbient,
                    setContrast: setLatticeContrast,
                    setSpecular: setLatticeSpecular,
                    setShininess: setLatticeShininess,
                    setAoStrength: setLatticeAoStrength,
                    setFog: setLatticeFog,
                  }}
                />
              )}
            </div>

            {/* Info Panel at bottom of sidebar */}
            <div className="border-t border-[#1B263B] p-4">
              {activeTab === 'tpms' && currentTPMSInfo && (
                <>
                  <h3 className="text-sm font-bold text-tertiary">{currentTPMSInfo.displayName}</h3>
                  <p className="text-secondary text-xs mt-1 leading-relaxed">{currentTPMSInfo.description}</p>
                  {currentTPMSInfo.latex && (
                    <code className="block mt-2 text-[10px] bg-black/50 p-1.5 rounded text-green-400 overflow-x-auto">
                      f(x,y,z) = {currentTPMSInfo.latex}
                    </code>
                  )}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded mt-2 inline-block ${
                      currentTPMSInfo.category === 'minimal'
                        ? 'bg-blue-900/50 text-blue-300'
                        : 'bg-amber-900/50 text-amber-300'
                    }`}
                  >
                    {currentTPMSInfo.category}
                  </span>
                </>
              )}
              {activeTab === 'lattice' && currentLatticeInfo && (
                <>
                  <h3 className="text-sm font-bold text-tertiary">{currentLatticeInfo.displayName}</h3>
                  <p className="text-secondary text-xs mt-1 leading-relaxed">{currentLatticeInfo.description}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        currentLatticeInfo.category === 'cubic'
                          ? 'bg-blue-900/50 text-blue-300'
                          : 'bg-emerald-900/50 text-emerald-300'
                      }`}
                    >
                      {currentLatticeInfo.category}
                    </span>
                    <span className="text-[10px] text-secondary">{currentLatticeInfo.strutsPerCell} struts/cell</span>
                    <span className="text-[10px] text-secondary">
                      ~{(currentLatticeInfo.relativeDensity * 100).toFixed(0)}% density
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
        </>
      )}
    </div>
  );
};

export default ComputationalGeometry;
