/**
 * DEM (Discrete Element Method) Granular Simulation Page
 *
 * Interactive WebGPU-powered granular particle simulation with Hertz-Mindlin contacts.
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  PerspectiveCamera,
  GizmoHelper,
  GizmoViewport,
  Stats,
} from '@react-three/drei';
import * as THREE from 'three';

import { Navbar } from '@/components';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { useGPUCapabilities } from '@/utils/gpuCapabilities';
import { useDEMSimulation } from '@/hooks/simulations/useDEMSimulation';
import { SimulationViewer, ParticleRenderConfig } from '../SimulationViewer';
import { WebGPUNotSupported } from '../WebGPUNotSupported';
import { DEM_PRESET_OPTIONS } from './demPresets';
import { FIELD_TYPES, COLORMAPS } from '@/shaders/simulations/rendering/pointGaussian';

/**
 * Colorbar component that shows the color scale
 */
function Colorbar({
  colormap,
  min,
  max,
  label,
}: {
  colormap: number;
  min: number;
  max: number;
  label: string;
}) {
  // Generate gradient CSS based on colormap
  const gradientStyle = useMemo(() => {
    // Colormap color stops (matching shader implementations)
    const colormaps: Record<number, string[]> = {
      0: [ // Viridis
        '#440154', '#482777', '#3F4A8A', '#31678D', '#26838E',
        '#1F9E89', '#35B778', '#6DCD59', '#B4DD2C', '#FDE724'
      ],
      1: [ // Plasma
        '#0D0887', '#47039F', '#7301A8', '#9C179E', '#BD3786',
        '#D8576B', '#ED7953', '#FA9E3B', '#FDC328', '#F0F921'
      ],
      2: [ // Turbo
        '#30123B', '#4662D7', '#35ABE8', '#1AE4B6', '#72FE5E',
        '#C8EF34', '#FCCE2E', '#F98E09', '#D65F0E', '#7A0403'
      ],
      3: [ // Coolwarm
        '#3B4CC0', '#6788EE', '#9ABBFF', '#C9D7F0', '#EDDBD5',
        '#F6BDA2', '#F18E6F', '#D95847', '#B40426'
      ],
      4: [ // RdYlBu
        '#A50026', '#D73027', '#F46D43', '#FDAE61', '#FEE090',
        '#FFFFBF', '#E0F3F8', '#ABD9E9', '#74ADD1', '#4575B4', '#313695'
      ],
    };

    const colors = colormaps[colormap] || colormaps[0];
    const stops = colors.map((c, i) => `${c} ${(i / (colors.length - 1)) * 100}%`).join(', ');
    return { background: `linear-gradient(to top, ${stops})` };
  }, [colormap]);

  return (
    <div className="absolute bottom-8 right-[328px] z-30 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-lg p-3">
      <div className="flex flex-col items-center gap-1">
        <span className="text-white text-xs font-mono">{max.toFixed(2)}</span>
        <div
          className="w-5 h-40 rounded"
          style={gradientStyle}
        />
        <span className="text-white text-xs font-mono">{min.toFixed(2)}</span>
      </div>
      <div className="flex items-center justify-center h-40">
        <span className="text-white text-sm -rotate-90 whitespace-nowrap">
          {label}
        </span>
      </div>
    </div>
  );
}

/**
 * Box surface visualization with transparency
 */
function BoxSurface({ size }: { size: [number, number, number] }) {
  return (
    <mesh position={[0, size[1] / 2, 0]}>
      <boxGeometry args={[size[0], size[1], size[2]]} />
      <meshStandardMaterial
        color="#ffffff"
        opacity={0.2}
        transparent
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Floor grid visualization
 */
function FloorGrid({ size }: { size: [number, number, number] }) {
  return (
    <gridHelper
      args={[Math.max(size[0], size[2]), Math.max(size[0], size[2])]}
      position={[0, 0.001, 0]}
    >
      <meshBasicMaterial color="#444444" opacity={0.5} transparent />
    </gridHelper>
  );
}

/**
 * Rotating drum visualization
 * Drum axis along world +X, rotating around X-axis
 */
function DrumSurface({
  radius,
  length,
  centerY,
  rpm,
  time,
}: {
  radius: number;
  length: number;
  centerY: number;
  rpm: number;
  time: number;
}) {
  // Rotation angle based on simulation time and RPM
  const rotationAngle = (rpm * time * Math.PI * 2) / 60;

  return (
    <group position={[0, centerY, 0]} rotation={[0, 0, -Math.PI / 2]}>
      {/* Main cylinder (transparent) */}
      <mesh rotation={[0, rotationAngle, 0]}>
        <cylinderGeometry args={[radius, radius, length, 64, 1, true]} />
        <meshStandardMaterial
          color="#6699ff"
          opacity={0.15}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* End cap at +X */}
      <mesh position={[0, length / 2, 0]} rotation={[-Math.PI / 2, 0, rotationAngle]}>
        <circleGeometry args={[radius, 64]} />
        <meshStandardMaterial
          color="#6699ff"
          opacity={0.1}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* End cap at -X */}
      <mesh position={[0, -length / 2, 0]} rotation={[Math.PI / 2, 0, -rotationAngle]}>
        <circleGeometry args={[radius, 64]} />
        <meshStandardMaterial
          color="#6699ff"
          opacity={0.1}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/** Radius distribution type */
type RadiusDistribution = 'mono' | 'uniform' | 'normal';

/** Container type */
type ContainerType = 'box' | 'drum';

/** Physics configuration */
interface PhysicsConfig {
  radiusDistribution: RadiusDistribution;
  radius: number;           // For mono
  radiusMin: number;        // For uniform and normal
  radiusMax: number;        // For uniform and normal
  radiusMean: number;       // For normal
  radiusStdDev: number;     // For normal
  stiffness: number;
  tangentialRatio: number;
  dampingN: number;
  dampingT: number;
  friction: number;
  restitution: number;
  gravity: number;
  dt: number;
  preset: string;
  containerType: ContainerType;
  drumRadius: number;
  drumLength: number;
  drumRPM: number;
  drumCenterY: number;
}

/** Rendering configuration for the control panel */
interface RenderingConfig {
  pointSize: number;
  gaussianSigma: number;
  brightness: number;
  colorMode: number;
  fieldType: number;
  colormap: number;
  velocityScale: number;
  blendMode: number;
}

/** Container configuration */
interface ContainerConfig {
  boxWidth: number;
  boxHeight: number;
  boxDepth: number;
}

/**
 * Modern slider with inline value display
 */
function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit = '',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unit?: string;
}) {
  const decimals = step < 1 ? Math.max(2, -Math.floor(Math.log10(step))) : 0;
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-white/60 font-medium uppercase tracking-wide">{label}</span>
        <span className="text-xs text-white font-mono bg-white/10 px-1.5 py-0.5 rounded">
          {value.toFixed(decimals)}{unit}
        </span>
      </div>
      <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}

/**
 * Compact select with modern styling
 */
function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | number;
  options: { value: string | number; label: string }[];
  onChange: (value: string | number) => void;
}) {
  return (
    <div>
      <span className="text-[11px] text-white/60 font-medium uppercase tracking-wide block mb-1.5">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => {
            const val = e.target.value;
            const numVal = parseFloat(val);
            onChange(isNaN(numVal) ? val : numVal);
          }}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white appearance-none cursor-pointer hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-primary transition-colors"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-gray-900">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/**
 * Collapsible card section
 */
function Section({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white/[0.02] rounded-xl border border-white/5 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-white/5 transition-colors"
      >
        {icon && <span className="text-cyan-400">{icon}</span>}
        <span className="text-sm font-semibold text-white flex-1 text-left">{title}</span>
        <svg
          className={`w-4 h-4 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`transition-all duration-200 ${open ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="px-4 pb-4 space-y-4">{children}</div>
      </div>
    </div>
  );
}

/**
 * Control panel component
 */
function ControlPanel({
  physics,
  setPhysics,
  container,
  setContainer,
  particleCount,
  setParticleCount,
  isRunning,
  frame,
  time,
  onToggle,
  onReset,
}: {
  physics: PhysicsConfig;
  setPhysics: React.Dispatch<React.SetStateAction<PhysicsConfig>>;
  container: ContainerConfig;
  setContainer: React.Dispatch<React.SetStateAction<ContainerConfig>>;
  particleCount: number;
  setParticleCount: (count: number) => void;
  isRunning: boolean;
  frame: number;
  time: number;
  onToggle: () => void;
  onReset: () => void;
}) {
  const presetOptions = Object.entries(DEM_PRESET_OPTIONS).map(([value, label]) => ({
    value,
    label,
  }));

  // Icons for sections
  const particleIcon = (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="3" />
      <circle cx="4" cy="6" r="2" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="6" cy="15" r="2" />
      <circle cx="14" cy="14" r="2.5" />
    </svg>
  );

  const materialIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );

  const envIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
    </svg>
  );

  const boxIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );

  return (
    <div className="fixed right-0 top-20 bottom-0 w-80 bg-gradient-to-b from-gray-900/95 to-black/95 backdrop-blur-xl border-l border-white/10 overflow-y-auto z-10">
      <div className="p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="3" />
              <circle cx="5" cy="5" r="2" />
              <circle cx="15" cy="5" r="2" />
              <circle cx="5" cy="15" r="2" />
              <circle cx="15" cy="15" r="2" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">DEM Simulation</h2>
            <p className="text-[11px] text-white/40">Discrete Element Method</p>
          </div>
        </div>

        {/* Play/Pause Controls */}
        <div className="flex gap-2">
          <button
            onClick={onToggle}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
              isRunning
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40'
            }`}
          >
            {isRunning ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Pause
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Play
              </>
            )}
          </button>
          <button
            onClick={onReset}
            className="py-2.5 px-4 rounded-xl text-sm font-semibold bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset
          </button>
        </div>

        {/* Stats Bar */}
        <div className="flex gap-3">
          <div className="flex-1 bg-white/5 rounded-lg px-3 py-2 border border-white/5">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Frame</div>
            <div className="text-sm font-mono text-white">{frame.toLocaleString()}</div>
          </div>
          <div className="flex-1 bg-white/5 rounded-lg px-3 py-2 border border-white/5">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Time</div>
            <div className="text-sm font-mono text-white">{time.toFixed(3)}s</div>
          </div>
          <div className="flex-1 bg-white/5 rounded-lg px-3 py-2 border border-white/5">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Count</div>
            <div className="text-sm font-mono text-white">{particleCount.toLocaleString()}</div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          <Section title="Particles" icon={particleIcon}>
            <Slider
              label="Count"
              value={particleCount}
              min={100}
              max={10000}
              step={100}
              onChange={setParticleCount}
            />
            <Select
              label="Size Distribution"
              value={physics.radiusDistribution}
              options={[
                { value: 'mono', label: 'Monosize' },
                { value: 'uniform', label: 'Uniform' },
                { value: 'normal', label: 'Normal (Gaussian)' },
              ]}
              onChange={(v) => setPhysics((p) => ({ ...p, radiusDistribution: v as RadiusDistribution }))}
            />
            {physics.radiusDistribution === 'mono' && (
              <Slider label="Radius" value={physics.radius} min={0.02} max={0.3} step={0.01}
                onChange={(v) => setPhysics((p) => ({ ...p, radius: v }))} />
            )}
            {physics.radiusDistribution === 'uniform' && (
              <div className="grid grid-cols-2 gap-3">
                <Slider label="Min" value={physics.radiusMin} min={0.02} max={0.3} step={0.01}
                  onChange={(v) => setPhysics((p) => ({ ...p, radiusMin: v }))} />
                <Slider label="Max" value={physics.radiusMax} min={0.02} max={0.3} step={0.01}
                  onChange={(v) => setPhysics((p) => ({ ...p, radiusMax: v }))} />
              </div>
            )}
            {physics.radiusDistribution === 'normal' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Slider label="Mean" value={physics.radiusMean} min={0.02} max={0.3} step={0.01}
                    onChange={(v) => setPhysics((p) => ({ ...p, radiusMean: v }))} />
                  <Slider label="Std Dev" value={physics.radiusStdDev} min={0.01} max={0.1} step={0.005}
                    onChange={(v) => setPhysics((p) => ({ ...p, radiusStdDev: v }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Slider label="Min" value={physics.radiusMin} min={0.02} max={0.3} step={0.01}
                    onChange={(v) => setPhysics((p) => ({ ...p, radiusMin: v }))} />
                  <Slider label="Max" value={physics.radiusMax} min={0.02} max={0.3} step={0.01}
                    onChange={(v) => setPhysics((p) => ({ ...p, radiusMax: v }))} />
                </div>
              </>
            )}
            <Select
              label="Initial Setup"
              value={physics.preset}
              options={presetOptions}
              onChange={(v) => setPhysics((p) => ({ ...p, preset: v as string }))}
            />
          </Section>

          <Section title="Material" icon={materialIcon} defaultOpen={false}>
            <Slider label="Stiffness" value={physics.stiffness} min={1000} max={50000} step={1000}
              onChange={(v) => setPhysics((p) => ({ ...p, stiffness: v }))} />
            <div className="grid grid-cols-2 gap-3">
              <Slider label="Friction" value={physics.friction} min={0} max={1.0} step={0.05}
                onChange={(v) => setPhysics((p) => ({ ...p, friction: v }))} />
              <Slider label="Restitution" value={physics.restitution} min={0} max={1.0} step={0.05}
                onChange={(v) => setPhysics((p) => ({ ...p, restitution: v }))} />
            </div>
            <Slider label="Tangent Ratio" value={physics.tangentialRatio} min={0.1} max={1.0} step={0.05}
              onChange={(v) => setPhysics((p) => ({ ...p, tangentialRatio: v }))} />
          </Section>

          <Section title="Environment" icon={envIcon} defaultOpen={false}>
            <Slider label="Gravity" value={physics.gravity} min={-20} max={0} step={0.1} unit=" m/s²"
              onChange={(v) => setPhysics((p) => ({ ...p, gravity: v }))} />
            <p className="text-[10px] text-white/30 leading-relaxed">
              Time step and damping are auto-computed for numerical stability.
            </p>
          </Section>

          <Section title="Container" icon={boxIcon} defaultOpen={false}>
            {physics.preset === 'boxPacking' && (
              <div className="grid grid-cols-3 gap-3">
                <Slider label="W" value={container.boxWidth} min={2} max={10} step={0.5}
                  onChange={(v) => setContainer((c) => ({ ...c, boxWidth: v }))} />
                <Slider label="H" value={container.boxHeight} min={4} max={15} step={0.5}
                  onChange={(v) => setContainer((c) => ({ ...c, boxHeight: v }))} />
                <Slider label="D" value={container.boxDepth} min={2} max={10} step={0.5}
                  onChange={(v) => setContainer((c) => ({ ...c, boxDepth: v }))} />
              </div>
            )}
            {physics.preset === 'drum' && (
              <>
                <Slider label="RPM" value={physics.drumRPM} min={0} max={60} step={1}
                  onChange={(v) => setPhysics((p) => ({ ...p, drumRPM: v }))} />
                <div className="grid grid-cols-2 gap-3">
                  <Slider label="Radius" value={physics.drumRadius} min={2} max={8} step={0.1}
                    onChange={(v) => setPhysics((p) => ({ ...p, drumRadius: v }))} />
                  <Slider label="Length" value={physics.drumLength} min={3} max={12} step={0.5}
                    onChange={(v) => setPhysics((p) => ({ ...p, drumLength: v }))} />
                </div>
                <Slider label="Axis Height" value={physics.drumCenterY} min={2} max={10} step={0.1}
                  onChange={(v) => setPhysics((p) => ({ ...p, drumCenterY: v }))} />
              </>
            )}
          </Section>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/5">
          <div className="flex items-start gap-3 text-[11px] text-white/30">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="leading-relaxed">
              Hertz-Mindlin contact model with spatial hashing for O(N) collision detection.
              <span className="block mt-1 text-white/20">Drag to rotate • Scroll to zoom • Middle-click to pan</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** State for field min/max tracking */
interface FieldRange {
  min: number;
  max: number;
}

/**
 * Inner component that uses the simulation hook (must be inside Canvas)
 */
function DEMScene({
  particleCount,
  renderConfig,
  boxSize,
  physics,
  fieldType,
  onStateChange,
  onFieldRangeChange,
}: {
  particleCount: number;
  renderConfig: ParticleRenderConfig;
  boxSize: [number, number, number];
  physics: PhysicsConfig;
  fieldType: number;
  onStateChange: (state: { running: boolean; frame: number; time: number }, controls: { toggle: () => void; reset: () => void }) => void;
  onFieldRangeChange: (range: FieldRange) => void;
}) {
  const [state, controls, positions, velocities] = useDEMSimulation({
    particleCount,
    boxSize,
  });

  // Track field min/max
  const fieldRangeRef = useRef<FieldRange>({ min: Infinity, max: -Infinity });
  const lastFieldTypeRef = useRef<number>(fieldType);

  // Reset range when field type changes
  useEffect(() => {
    if (lastFieldTypeRef.current !== fieldType) {
      fieldRangeRef.current = { min: Infinity, max: -Infinity };
      lastFieldTypeRef.current = fieldType;
    }
  }, [fieldType]);

  // Compute and update field range from data
  useEffect(() => {
    if (!positions || !velocities) return;

    let min = fieldRangeRef.current.min;
    let max = fieldRangeRef.current.max;
    let updated = false;

    // Sample every 10th particle for performance
    const step = Math.max(1, Math.floor(particleCount / 500));

    if (fieldType === 0) {
      // Velocity magnitude
      for (let i = 0; i < particleCount; i += step) {
        const vx = velocities[i * 4];
        const vy = velocities[i * 4 + 1];
        const vz = velocities[i * 4 + 2];
        const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
        if (speed < min) { min = speed; updated = true; }
        if (speed > max) { max = speed; updated = true; }
      }
    } else if (fieldType === 1) {
      // Radius (stored in w component of position)
      for (let i = 0; i < particleCount; i += step) {
        const radius = positions[i * 4 + 3];
        if (radius < min) { min = radius; updated = true; }
        if (radius > max) { max = radius; updated = true; }
      }
    }

    if (updated) {
      fieldRangeRef.current = { min, max };
      onFieldRangeChange({ min, max });
    }
  }, [positions, velocities, particleCount, fieldType, onFieldRangeChange]);

  // Update parent with state and controls
  useEffect(() => {
    onStateChange(state, controls);
  }, [state, controls, onStateChange]);

  // Update simulation config when parameters change
  useEffect(() => {
    controls.updateConfig({
      radiusDistribution: physics.radiusDistribution,
      radius: physics.radius,
      radiusMin: physics.radiusMin,
      radiusMax: physics.radiusMax,
      radiusMean: physics.radiusMean,
      radiusStdDev: physics.radiusStdDev,
      stiffness: physics.stiffness,
      tangentialRatio: physics.tangentialRatio,
      dampingN: physics.dampingN,
      dampingT: physics.dampingT,
      friction: physics.friction,
      restitution: physics.restitution,
      gravity: physics.gravity,
      dt: physics.dt,
      preset: physics.preset,
      containerType: physics.containerType,
      drumRadius: physics.drumRadius,
      drumLength: physics.drumLength,
      drumRPM: physics.drumRPM,
      drumCenterY: physics.drumCenterY,
    });
  }, [physics, controls]);

  // Reset when preset changes
  useEffect(() => {
    controls.reset();
    // Also reset field range on simulation reset
    fieldRangeRef.current = { min: Infinity, max: -Infinity };
    onFieldRangeChange({ min: Infinity, max: -Infinity });
  }, [physics.preset, onFieldRangeChange]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state.error) {
    return null;
  }

  return (
    <>
      <SimulationViewer
        positions={positions}
        velocities={velocities}
        particleCount={particleCount}
        config={renderConfig}
      />
      {physics.containerType === 'drum' ? (
        <DrumSurface
          radius={physics.drumRadius}
          length={physics.drumLength}
          centerY={physics.drumCenterY}
          rpm={physics.drumRPM}
          time={state.time}
        />
      ) : (
        <>
          <BoxSurface size={boxSize} />
          <FloorGrid size={boxSize} />
        </>
      )}
    </>
  );
}

/**
 * Main DEM simulation page
 */
export function DEMSimulation() {
  const capabilities = useGPUCapabilities();

  // State for all controls
  // Spatial hashing enables O(N) complexity for many particles
  const [particleCount, setParticleCount] = useState(5000);
  const [physics, setPhysics] = useState<PhysicsConfig>({
    radiusDistribution: 'uniform',
    radius: 0.1,
    radiusMin: 0.05,
    radiusMax: 0.15,
    radiusMean: 0.1,
    radiusStdDev: 0.02,
    stiffness: 10000,
    tangentialRatio: 0.5,
    dampingN: 70,          // Computed from restitution
    dampingT: 35,
    friction: 0.5,
    restitution: 0.6,      // Higher restitution for visible bouncing
    gravity: -9.81,
    dt: 0.001,
    preset: 'boxPacking',
    containerType: 'box',
    drumRadius: 4.0,
    drumLength: 6.0,
    drumRPM: 15,
    drumCenterY: 4.5,
  });
  const [rendering, setRendering] = useState<RenderingConfig>({
    pointSize: 1.0,  // Scale factor for per-particle radius (1.0 = true size)
    gaussianSigma: 0.5,
    brightness: 1.5,
    colorMode: 1, // Use new field/colormap system (non-solid, non-direction)
    fieldType: 0,  // Velocity magnitude
    colormap: 4,   // RdYlBu
    velocityScale: 0.5,
    blendMode: 2, // Sphere mode
  });
  const [container, setContainer] = useState<ContainerConfig>({
    boxWidth: 5,
    boxHeight: 8,
    boxDepth: 5,
  });

  // Simulation state from scene
  const [simState, setSimState] = useState({ running: false, frame: 0, time: 0 });
  const [simControls, setSimControls] = useState<{ toggle: () => void; reset: () => void } | null>(null);
  const [fieldRange, setFieldRange] = useState<FieldRange>({ min: 0, max: 1 });

  const handleStateChange = useCallback(
    (state: { running: boolean; frame: number; time: number }, controls: { toggle: () => void; reset: () => void }) => {
      setSimState(state);
      setSimControls(controls);
    },
    []
  );

  const handleFieldRangeChange = useCallback((range: FieldRange) => {
    setFieldRange(range);
  }, []);

  // Sync preset and containerType bidirectionally
  useEffect(() => {
    // When preset is drum, containerType must be drum
    if (physics.preset === 'drum' && physics.containerType !== 'drum') {
      setPhysics((p) => ({ ...p, containerType: 'drum' }));
    }
    // When preset is boxPacking, containerType must be box
    if (physics.preset === 'boxPacking' && physics.containerType !== 'box') {
      setPhysics((p) => ({ ...p, containerType: 'box' }));
    }
  }, [physics.preset, physics.containerType]);

  const boxSize: [number, number, number] = [container.boxWidth, container.boxHeight, container.boxDepth];

  // Get field label for colorbar
  const fieldLabel = useMemo(() => {
    const field = FIELD_TYPES.find(f => f.value === rendering.fieldType);
    return field?.label || 'Value';
  }, [rendering.fieldType]);

  // Construct render config with dynamic min/max
  const renderConfig: ParticleRenderConfig = useMemo(() => ({
    pointSize: rendering.pointSize,
    minSize: 0.01,
    maxSize: 0.5,
    velocityScale: rendering.velocityScale,
    colorMode: rendering.colorMode,
    fieldType: rendering.fieldType,
    colormap: rendering.colormap,
    fieldMin: isFinite(fieldRange.min) ? fieldRange.min : 0,
    fieldMax: isFinite(fieldRange.max) ? fieldRange.max : 1,
    gaussianSigma: rendering.gaussianSigma,
    minAlpha: 0.01,
    blendMode: rendering.blendMode,
    brightness: rendering.brightness,
    baseColor: [1.0, 1.0, 1.0], // White to let colormap show through
  }), [rendering, fieldRange]);

  // Loading state
  if (capabilities === null) {
    return (
      <div className="min-h-screen bg-primary">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-secondary">Detecting GPU capabilities...</div>
        </div>
      </div>
    );
  }

  // WebGPU not supported
  if (!capabilities.webgpu) {
    return (
      <div className="min-h-screen bg-primary">
        <Navbar />
        <WebGPUNotSupported />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary">
      <Navbar />
      <div className="pt-16">
        <Breadcrumb items={[
          { label: 'Home', path: '/' },
          { label: 'Simulations', path: '/showcase/simulations' },
          { label: 'Granular (DEM)' },
        ]} />
      </div>

      {/* Control Panel */}
      <ControlPanel
        physics={physics}
        setPhysics={setPhysics}
        container={container}
        setContainer={setContainer}
        particleCount={particleCount}
        setParticleCount={setParticleCount}
        isRunning={simState.running}
        frame={simState.frame}
        time={simState.time}
        onToggle={() => simControls?.toggle()}
        onReset={() => {
          simControls?.reset();
          setFieldRange({ min: Infinity, max: -Infinity });
        }}
      />

      <section className="w-full h-screen pt-20 pr-80 relative">
        {/* Colorbar - show when using a field-based coloring (not solid color) */}
        {rendering.colorMode !== 0 && rendering.colorMode !== 2 && (
          <Colorbar
            colormap={rendering.colormap}
            min={isFinite(fieldRange.min) ? fieldRange.min : 0}
            max={isFinite(fieldRange.max) ? fieldRange.max : 1}
            label={fieldLabel}
          />
        )}

        {/* Field and Colormap selectors overlay */}
        <div className="absolute top-24 right-[328px] z-30 flex gap-2">
          <select
            value={rendering.fieldType}
            onChange={(e) => setRendering(r => ({ ...r, fieldType: parseInt(e.target.value) }))}
            className="bg-black/70 text-white text-sm px-2 py-1 rounded border border-white/20 backdrop-blur-sm cursor-pointer hover:border-white/40"
          >
            {FIELD_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={rendering.colormap}
            onChange={(e) => setRendering(r => ({ ...r, colormap: parseInt(e.target.value) }))}
            className="bg-black/70 text-white text-sm px-2 py-1 rounded border border-white/20 backdrop-blur-sm cursor-pointer hover:border-white/40"
          >
            {COLORMAPS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <Canvas
          dpr={[1, 2]}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <color attach="background" args={['#1a1a24']} />

          <PerspectiveCamera makeDefault position={[10, 8, 10]} fov={50} />
          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            target={physics.containerType === 'drum'
              ? [0, physics.drumCenterY, 0]
              : [0, container.boxHeight / 2, 0]}
            mouseButtons={{
              LEFT: THREE.MOUSE.ROTATE,
              MIDDLE: THREE.MOUSE.PAN,
              RIGHT: THREE.MOUSE.DOLLY,
            }}
          />

          {/* Lighting - brighter scene */}
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={0.8} />
          <directionalLight position={[-5, 8, -5]} intensity={0.4} />
          <pointLight position={[0, 15, 0]} intensity={0.5} />

          {/* DEM simulation - key forces remount when particle count or container changes */}
          <DEMScene
            key={`dem-${particleCount}-${boxSize.join('-')}-${physics.containerType}-${physics.drumRadius}-${physics.drumLength}`}
            particleCount={particleCount}
            renderConfig={renderConfig}
            boxSize={boxSize}
            physics={physics}
            fieldType={rendering.fieldType}
            onStateChange={handleStateChange}
            onFieldRangeChange={handleFieldRangeChange}
          />

          {/* Gizmo */}
          <GizmoHelper alignment="bottom-left" margin={[80, 80]}>
            <GizmoViewport axisColors={['#ff4444', '#44ff44', '#4444ff']} />
          </GizmoHelper>

          {/* Performance stats */}
          <Stats className="!absolute !left-4 !top-20" />
        </Canvas>
      </section>
    </div>
  );
}

export default DEMSimulation;
