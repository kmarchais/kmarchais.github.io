/**
 * SPH (Smoothed Particle Hydrodynamics) Fluid Simulation Page
 *
 * Interactive WebGPU-powered fluid simulation with pressure and viscosity.
 * Classic dam break scenario with sphere-rendered particles.
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
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
import { useSPHSimulation, GPUFieldResult, FieldComputeConfig } from '@/hooks/simulations/useSPHSimulation';
import { SimulationViewer, ParticleRenderConfig } from '../SimulationViewer';
import { WebGPUNotSupported } from '../WebGPUNotSupported';
import { SPH_PRESET_OPTIONS } from './sphPresets';
import { FIELD_TYPES, COLORMAPS } from '@/shaders/simulations/rendering/pointGaussian';
import { generateFluidMeshFromGPUFields, MarchingCubesResult } from '@/utils/marchingCubes';

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
  const gradientStyle = useMemo(() => {
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
        color="#4488ff"
        opacity={0.15}
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
      <meshBasicMaterial color="#446688" opacity={0.5} transparent />
    </gridHelper>
  );
}

/** Physics configuration */
interface PhysicsConfig {
  restDensity: number;
  stiffness: number;
  viscosity: number;
  particleMass: number;
  smoothingLength: number;
  gravity: number;
  dt: number;
  preset: string;
}

/** Rendering configuration */
interface RenderingConfig {
  pointSize: number;
  fieldType: number;
  colormap: number;
  blendMode: number;
  brightness: number;
  renderMode: 'points' | 'mesh';
  meshResolution: number;
  meshIsoLevel: number;
}

/** Container configuration */
interface ContainerConfig {
  boxWidth: number;
  boxHeight: number;
  boxDepth: number;
}

/** Field range for colormap normalization */
interface FieldRange {
  min: number;
  max: number;
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
  derivedParams,
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
  derivedParams: SPHDerivedParams;
  isRunning: boolean;
  frame: number;
  time: number;
  onToggle: () => void;
  onReset: () => void;
}) {
  const presetOptions = Object.entries(SPH_PRESET_OPTIONS).map(([value, label]) => ({
    value,
    label,
  }));

  // Icons for sections
  const fluidIcon = (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
    </svg>
  );

  const physicsIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
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
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">SPH Fluid</h2>
            <p className="text-[11px] text-white/40">Smoothed Particle Hydrodynamics</p>
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
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/5">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Frame</div>
            <div className="text-sm font-mono text-white">{frame.toLocaleString()}</div>
          </div>
          <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/5">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Time</div>
            <div className="text-sm font-mono text-white">{time.toFixed(3)}s</div>
          </div>
          <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/5">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">~Neighbors</div>
            <div className="text-sm font-mono text-white">{derivedParams.expectedNeighbors}</div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          <Section title="Particles" icon={fluidIcon}>
            <Slider
              label="Count"
              value={particleCount}
              min={1000}
              max={50000}
              step={500}
              onChange={setParticleCount}
            />
            <Select
              label="Initial Setup"
              value={physics.preset}
              options={presetOptions}
              onChange={(v) => setPhysics((p) => ({ ...p, preset: v as string }))}
            />
          </Section>

          <Section title="Fluid Properties" icon={physicsIcon} defaultOpen={false}>
            <Slider
              label="Particle Mass"
              value={physics.particleMass}
              min={0.5}
              max={5.0}
              step={0.1}
              unit=" kg"
              onChange={(v) => setPhysics((p) => ({ ...p, particleMass: v }))}
            />
            <Slider
              label="Rest Density"
              value={physics.restDensity}
              min={500}
              max={2000}
              step={50}
              unit=" kg/m³"
              onChange={(v) => setPhysics((p) => ({
                ...p,
                restDensity: v,
                dt: calculateStableDt(p.smoothingLength, p.stiffness, v, p.gravity),
                particleMass: calculateMass(p.smoothingLength, v),
              }))}
            />
            <Slider
              label="Stiffness"
              value={physics.stiffness}
              min={100}
              max={5000}
              step={100}
              onChange={(v) => setPhysics((p) => ({
                ...p,
                stiffness: v,
                dt: calculateStableDt(p.smoothingLength, v, p.restDensity, p.gravity),
              }))}
            />
            <Slider
              label="Viscosity"
              value={physics.viscosity}
              min={0}
              max={0.5}
              step={0.01}
              onChange={(v) => setPhysics((p) => ({ ...p, viscosity: v }))}
            />
            <Slider
              label="Smoothing Length"
              value={physics.smoothingLength}
              min={0.02}
              max={0.5}
              step={0.005}
              onChange={(v) => setPhysics((p) => ({
                ...p,
                smoothingLength: v,
                // Auto-calculate stable dt and mass when h changes
                dt: calculateStableDt(v, p.stiffness, p.restDensity, p.gravity),
                particleMass: calculateMass(v, p.restDensity),
              }))}
            />
          </Section>

          <Section title="Environment" icon={envIcon} defaultOpen={false}>
            <Slider
              label="Gravity"
              value={physics.gravity}
              min={-20}
              max={0}
              step={0.1}
              unit=" m/s²"
              onChange={(v) => setPhysics((p) => ({
                ...p,
                gravity: v,
                dt: calculateStableDt(p.smoothingLength, p.stiffness, p.restDensity, v),
              }))}
            />
            <Slider
              label="Time Step"
              value={physics.dt}
              min={0.0005}
              max={0.005}
              step={0.0001}
              onChange={(v) => setPhysics((p) => ({ ...p, dt: v }))}
            />
          </Section>

          <Section title="Container" icon={boxIcon} defaultOpen={false}>
            <div className="grid grid-cols-3 gap-3">
              <Slider
                label="W"
                value={container.boxWidth}
                min={1}
                max={6}
                step={0.25}
                onChange={(v) => setContainer((c) => ({ ...c, boxWidth: v }))}
              />
              <Slider
                label="H"
                value={container.boxHeight}
                min={1}
                max={6}
                step={0.25}
                onChange={(v) => setContainer((c) => ({ ...c, boxHeight: v }))}
              />
              <Slider
                label="D"
                value={container.boxDepth}
                min={1}
                max={6}
                step={0.25}
                onChange={(v) => setContainer((c) => ({ ...c, boxDepth: v }))}
              />
            </div>
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
              WCSPH with Tait equation of state, Poly6/Spiky kernels, and spatial hashing.
              <span className="block mt-1 text-white/20">Drag to rotate &bull; Scroll to zoom &bull; Middle-click to pan</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Colormap functions for mesh visualization
 */
const COLORMAP_DATA: Record<number, number[][]> = {
  0: [ // Viridis
    [0.267, 0.004, 0.329], [0.283, 0.141, 0.458], [0.254, 0.265, 0.530],
    [0.207, 0.372, 0.553], [0.164, 0.471, 0.558], [0.128, 0.567, 0.551],
    [0.135, 0.659, 0.518], [0.267, 0.749, 0.441], [0.478, 0.821, 0.318],
    [0.741, 0.873, 0.150], [0.993, 0.906, 0.144],
  ],
  1: [ // Plasma
    [0.050, 0.030, 0.528], [0.254, 0.014, 0.615], [0.417, 0.031, 0.595],
    [0.558, 0.087, 0.536], [0.682, 0.159, 0.464], [0.798, 0.280, 0.377],
    [0.881, 0.402, 0.283], [0.949, 0.517, 0.196], [0.988, 0.652, 0.118],
    [0.988, 0.809, 0.145], [0.940, 0.975, 0.131],
  ],
  2: [ // Turbo
    [0.189, 0.071, 0.232], [0.232, 0.298, 0.752], [0.163, 0.471, 0.884],
    [0.127, 0.617, 0.760], [0.267, 0.749, 0.441], [0.478, 0.821, 0.318],
    [0.741, 0.873, 0.150], [0.928, 0.736, 0.110], [0.974, 0.478, 0.089],
    [0.858, 0.190, 0.069], [0.645, 0.107, 0.043],
  ],
  3: [ // Coolwarm
    [0.230, 0.299, 0.754], [0.413, 0.510, 0.878], [0.607, 0.706, 0.957],
    [0.787, 0.854, 0.974], [0.931, 0.921, 0.921], [0.955, 0.832, 0.792],
    [0.934, 0.697, 0.621], [0.873, 0.508, 0.434], [0.758, 0.297, 0.263],
    [0.588, 0.130, 0.138], [0.417, 0.000, 0.108],
  ],
  4: [ // RdYlBu
    [0.647, 0.000, 0.149], [0.843, 0.188, 0.153], [0.957, 0.427, 0.263],
    [0.992, 0.682, 0.380], [0.996, 0.878, 0.565], [1.000, 1.000, 0.749],
    [0.878, 0.953, 0.973], [0.671, 0.851, 0.914], [0.455, 0.678, 0.820],
    [0.271, 0.459, 0.706], [0.192, 0.212, 0.584],
  ],
};

function applyColormap(t: number, colormapIndex: number): [number, number, number] {
  const colors = COLORMAP_DATA[colormapIndex] || COLORMAP_DATA[0];
  const idx = Math.min(Math.floor(t * (colors.length - 1)), colors.length - 2);
  const frac = t * (colors.length - 1) - idx;
  const c0 = colors[idx];
  const c1 = colors[idx + 1];
  return [
    c0[0] + frac * (c1[0] - c0[0]),
    c0[1] + frac * (c1[1] - c0[1]),
    c0[2] + frac * (c1[2] - c0[2]),
  ];
}

/** Map field type index to mesh field type */
function fieldTypeToMeshField(fieldType: number): 'velocity' | 'height' | 'density' {
  switch (fieldType) {
    case 0: return 'velocity';  // Velocity magnitude
    case 4: return 'height';    // Height (Y position)
    default: return 'velocity';
  }
}

/**
 * Fluid mesh renderer using marching cubes with GPU-computed fields
 */
function FluidMesh({
  boxSize,
  gridResolution,
  isoLevel,
  fieldType,
  colormap,
  computeFields,
  onFieldRangeChange,
  isRunning: _isRunning,
}: {
  boxSize: [number, number, number];
  gridResolution: number;
  isoLevel: number;
  fieldType: number;
  colormap: number;
  computeFields: (config: FieldComputeConfig) => Promise<GPUFieldResult | null>;
  onFieldRangeChange: (min: number, max: number) => void;
  isRunning: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const lastMeshRef = useRef<MarchingCubesResult | null>(null);
  const lastFieldTypeRef = useRef(fieldType);
  const lastColormapRef = useRef(colormap);
  const computeInProgressRef = useRef(false);
  const frameCountRef = useRef(0);

  // Bounds for field computation
  const bounds = useMemo(() => ({
    min: [-boxSize[0] / 2, 0, -boxSize[2] / 2] as [number, number, number],
    max: [boxSize[0] / 2, boxSize[1], boxSize[2] / 2] as [number, number, number],
  }), [boxSize]);

  // Reset field range when field type changes
  useEffect(() => {
    if (lastFieldTypeRef.current !== fieldType) {
      lastFieldTypeRef.current = fieldType;
      onFieldRangeChange(Infinity, -Infinity);
    }
  }, [fieldType, onFieldRangeChange]);

  // Update colors when colormap changes (without recomputing mesh)
  useEffect(() => {
    if (lastColormapRef.current !== colormap && lastMeshRef.current && geometryRef.current) {
      lastColormapRef.current = colormap;
      const mesh = lastMeshRef.current;

      // Recompute colors with new colormap
      const colors = new Float32Array(mesh.vertexCount * 3);
      const fieldRange = mesh.fieldMax - mesh.fieldMin;
      for (let i = 0; i < mesh.vertexCount; i++) {
        const t = fieldRange > 0.001
          ? (mesh.fieldValues[i] - mesh.fieldMin) / fieldRange
          : 0.5;
        const [r, g, b] = applyColormap(Math.max(0, Math.min(1, t)), colormap);
        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
      }
      geometryRef.current.setAttribute(
        'color',
        new THREE.BufferAttribute(colors, 3)
      );
    }
  }, [colormap]);

  // GPU field computation and mesh generation
  useFrame(() => {
    // Skip frames for performance (compute every 3 frames)
    frameCountRef.current++;
    if (frameCountRef.current < 3) return;
    frameCountRef.current = 0;

    // Don't start new computation if one is in progress
    if (computeInProgressRef.current) return;

    computeInProgressRef.current = true;

    // Compute fields on GPU
    const config: FieldComputeConfig = {
      gridResolution,
      bounds,
    };

    computeFields(config).then((gpuFields) => {
      computeInProgressRef.current = false;

      if (!gpuFields) return;

      // Run marching cubes (CPU) on GPU-computed fields
      const meshFieldType = fieldTypeToMeshField(fieldType);
      const mesh = generateFluidMeshFromGPUFields(
        gpuFields,
        bounds,
        isoLevel > 0 ? isoLevel : undefined,
        meshFieldType
      );

      if (mesh.vertexCount > 0) {
        lastMeshRef.current = mesh;

        // Report field range for colorbar
        onFieldRangeChange(mesh.fieldMin, mesh.fieldMax);

        if (!geometryRef.current) {
          geometryRef.current = new THREE.BufferGeometry();
        }

        geometryRef.current.setAttribute(
          'position',
          new THREE.BufferAttribute(mesh.positions, 3)
        );
        geometryRef.current.setAttribute(
          'normal',
          new THREE.BufferAttribute(mesh.normals, 3)
        );

        // Create vertex colors from field values using selected colormap
        const colors = new Float32Array(mesh.vertexCount * 3);
        const fieldRange = mesh.fieldMax - mesh.fieldMin;
        for (let i = 0; i < mesh.vertexCount; i++) {
          const t = fieldRange > 0.001
            ? (mesh.fieldValues[i] - mesh.fieldMin) / fieldRange
            : 0.5;
          const [r, g, b] = applyColormap(Math.max(0, Math.min(1, t)), colormap);
          colors[i * 3] = r;
          colors[i * 3 + 1] = g;
          colors[i * 3 + 2] = b;
        }
        geometryRef.current.setAttribute(
          'color',
          new THREE.BufferAttribute(colors, 3)
        );

        geometryRef.current.computeBoundingSphere();

        if (meshRef.current) {
          meshRef.current.geometry = geometryRef.current;
        }
      }
    }).catch(() => {
      computeInProgressRef.current = false;
    });
  });

  // Cleanup
  useEffect(() => {
    return () => {
      if (geometryRef.current) {
        geometryRef.current.dispose();
      }
    };
  }, []);

  return (
    <mesh ref={meshRef}>
      <bufferGeometry />
      <meshPhysicalMaterial
        vertexColors
        metalness={0.1}
        roughness={0.3}
        clearcoat={0.3}
        clearcoatRoughness={0.25}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/**
 * Inner component that uses the simulation hook (must be inside Canvas)
 */
function SPHScene({
  particleCount,
  renderConfig,
  boxSize,
  physics,
  fieldType,
  rendering,
  onStateChange,
  onFieldRangeChange,
}: {
  particleCount: number;
  renderConfig: ParticleRenderConfig;
  boxSize: [number, number, number];
  physics: PhysicsConfig;
  fieldType: number;
  rendering: RenderingConfig;
  onStateChange: (state: { running: boolean; frame: number; time: number }, controls: { toggle: () => void; reset: () => void }) => void;
  onFieldRangeChange: (range: FieldRange) => void;
}) {
  const [state, controls, positions, velocities] = useSPHSimulation({
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

    // Sample particles for performance
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
    } else if (fieldType === 4) {
      // Height (Y position)
      for (let i = 0; i < particleCount; i += step) {
        const y = positions[i * 4 + 1];
        if (y < min) { min = y; updated = true; }
        if (y > max) { max = y; updated = true; }
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
      smoothingLength: physics.smoothingLength,
      restDensity: physics.restDensity,
      stiffness: physics.stiffness,
      viscosity: physics.viscosity,
      particleMass: physics.particleMass,
      gravity: physics.gravity,
      dt: physics.dt,
      preset: physics.preset,
    });
  }, [physics, controls]);

  // Reset when preset changes
  useEffect(() => {
    controls.reset();
    fieldRangeRef.current = { min: Infinity, max: -Infinity };
    onFieldRangeChange({ min: Infinity, max: -Infinity });
  }, [physics.preset, onFieldRangeChange]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state.error) {
    return null;
  }

  return (
    <>
      {rendering.renderMode === 'mesh' ? (
        <FluidMesh
          boxSize={boxSize}
          gridResolution={rendering.meshResolution}
          isoLevel={rendering.meshIsoLevel}
          fieldType={fieldType}
          colormap={rendering.colormap}
          computeFields={controls.computeFields}
          onFieldRangeChange={(min, max) => onFieldRangeChange({ min, max })}
          isRunning={state.running}
        />
      ) : (
        <SimulationViewer
          positions={positions}
          velocities={velocities}
          particleCount={particleCount}
          config={renderConfig}
        />
      )}
      <BoxSurface size={boxSize} />
      <FloorGrid size={boxSize} />
    </>
  );
}

/**
 * SPH Parameter Calculator
 *
 * For proper SPH simulation, parameters must be consistent:
 * - spacing: average distance between particles (from volume/count)
 * - h (smoothing length): support radius, typically 2-2.5 × spacing for ~30-50 neighbors
 * - mass: restDensity × spacing³ to achieve target density at rest
 * - dt: limited by CFL condition for stability
 */
interface SPHDerivedParams {
  spacing: number;      // Actual particle spacing
  smoothingLength: number; // h = spacing × multiplier
  mass: number;         // restDensity × spacing³
  dt: number;           // Stable timestep
  expectedNeighbors: number; // Approximate neighbor count
}

/**
 * Calculate SPH parameters from particle count and box size
 * This ensures all parameters are physically consistent
 */
function calculateSPHParams(
  particleCount: number,
  boxSize: [number, number, number],
  restDensity: number,
  stiffness: number,
  gravity: number,
  hMultiplier: number = 2.0 // h = spacing × multiplier
): SPHDerivedParams {
  // Estimate particle spacing from filled volume
  // Dam break fills about 40% × 80% × 90% of box
  const fillFraction = 0.4 * 0.8 * 0.9;
  const filledVolume = boxSize[0] * boxSize[1] * boxSize[2] * fillFraction;
  const spacing = Math.cbrt(filledVolume / particleCount);

  // Smoothing length should be 2-2.5× spacing for good neighbor coverage
  // This gives approximately (2h/spacing)³ × π/6 ≈ 30-50 neighbors in 3D
  const h = spacing * hMultiplier;

  // Mass so that density at rest ≈ restDensity
  // ρ = Σ m × W(r) ≈ restDensity when particles are at rest spacing
  const mass = restDensity * Math.pow(spacing, 3);

  // Approximate neighbor count within support radius h
  const expectedNeighbors = Math.round((4/3) * Math.PI * Math.pow(h / spacing, 3));

  // Stable timestep from CFL condition
  const dt = calculateStableDt(h, stiffness, restDensity, gravity);

  return { spacing, smoothingLength: h, mass, dt, expectedNeighbors };
}

/**
 * Calculate stable timestep based on CFL condition for SPH
 */
function calculateStableDt(h: number, stiffness: number, restDensity: number, gravity: number = -9.81): number {
  const CFL = 0.1; // Conservative CFL for SPH stability

  // Acoustic constraint: based on artificial speed of sound
  const speedOfSound = Math.sqrt(stiffness / restDensity);
  const dtAcoustic = CFL * h / speedOfSound;

  // Force constraint: based on gravitational acceleration
  const g = Math.abs(gravity);
  const dtForce = CFL * Math.sqrt(h / Math.max(g, 0.1));

  // Take minimum of both constraints and cap to practical range
  const dtComputed = Math.min(dtAcoustic, dtForce);
  return Math.max(0.0001, Math.min(0.002, dtComputed));
}

/**
 * Calculate mass from smoothing length and rest density
 * Assumes particle spacing = h/2 for consistency
 */
function calculateMass(h: number, restDensity: number): number {
  const spacing = h / 2;
  return restDensity * Math.pow(spacing, 3);
}

/**
 * Main SPH simulation page
 */
export function SPHSimulation() {
  const capabilities = useGPUCapabilities();

  // Base configuration
  const baseStiffness = 50;     // Lower stiffness for better stability
  const baseRestDensity = 1000; // Water density
  const baseGravity = -9.81;
  const baseBoxSize: [number, number, number] = [1.5, 2, 1.5];
  const initialParticleCount = 5000;

  // State for all controls
  const [particleCount, setParticleCount] = useState(initialParticleCount);
  const [container, setContainer] = useState<ContainerConfig>({
    boxWidth: baseBoxSize[0],
    boxHeight: baseBoxSize[1],
    boxDepth: baseBoxSize[2],
  });

  // Calculate proper SPH parameters from particle count and box size
  const [derivedParams, setDerivedParams] = useState<SPHDerivedParams>(() =>
    calculateSPHParams(
      initialParticleCount,
      baseBoxSize,
      baseRestDensity,
      baseStiffness,
      baseGravity
    )
  );

  const [physics, setPhysics] = useState<PhysicsConfig>(() => {
    const params = calculateSPHParams(
      initialParticleCount,
      baseBoxSize,
      baseRestDensity,
      baseStiffness,
      baseGravity
    );
    return {
      restDensity: baseRestDensity,
      stiffness: baseStiffness,
      viscosity: 0.1,  // Higher viscosity for stability
      particleMass: params.mass,
      smoothingLength: params.smoothingLength,
      gravity: baseGravity,
      dt: params.dt,
      preset: 'damBreak',
    };
  });
  const [rendering, setRendering] = useState<RenderingConfig>({
    pointSize: 1.0,    // Use radius directly (stored in position.w)
    fieldType: 0,  // Velocity magnitude
    colormap: 0,   // Viridis (good for fluid)
    blendMode: 2,  // Sphere mode
    brightness: 1.5,
    renderMode: 'points',
    meshResolution: 48,
    meshIsoLevel: 0,  // Auto-compute
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

  const boxSize: [number, number, number] = [container.boxWidth, container.boxHeight, container.boxDepth];

  // Handler for particle count changes - recalculates all SPH parameters
  const handleParticleCountChange = useCallback((count: number) => {
    setParticleCount(count);
    const newParams = calculateSPHParams(
      count,
      boxSize,
      physics.restDensity,
      physics.stiffness,
      physics.gravity
    );
    setDerivedParams(newParams);
    setPhysics(p => ({
      ...p,
      particleMass: newParams.mass,
      smoothingLength: newParams.smoothingLength,
      dt: newParams.dt,
    }));
  }, [boxSize, physics.restDensity, physics.stiffness, physics.gravity]);

  // Get field label for colorbar
  const fieldLabel = useMemo(() => {
    const field = FIELD_TYPES.find(f => f.value === rendering.fieldType);
    return field?.label || 'Value';
  }, [rendering.fieldType]);

  // Construct render config with dynamic min/max
  // Particle visual size: h=2×spacing, so 0.15×h = 0.3×spacing radius → diameter = 0.6×spacing
  const renderConfig: ParticleRenderConfig = useMemo(() => ({
    pointSize: physics.smoothingLength * 0.15,
    minSize: 0.01,
    maxSize: 0.5,
    velocityScale: 0.5,
    colorMode: 1,  // Field-based coloring
    fieldType: rendering.fieldType,
    colormap: rendering.colormap,
    fieldMin: isFinite(fieldRange.min) ? fieldRange.min : 0,
    fieldMax: isFinite(fieldRange.max) ? fieldRange.max : 1,
    gaussianSigma: 0.5,
    minAlpha: 0.01,
    blendMode: rendering.blendMode,
    brightness: rendering.brightness,
    baseColor: [0.3, 0.6, 1.0],  // Blue tint for water
  }), [rendering, fieldRange, physics.smoothingLength]);

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
          { label: 'Fluid (SPH)' },
        ]} />
      </div>

      {/* Control Panel */}
      <ControlPanel
        physics={physics}
        setPhysics={setPhysics}
        container={container}
        setContainer={setContainer}
        particleCount={particleCount}
        setParticleCount={handleParticleCountChange}
        derivedParams={derivedParams}
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
        {/* Colorbar */}
        <Colorbar
          colormap={rendering.colormap}
          min={isFinite(fieldRange.min) ? fieldRange.min : 0}
          max={isFinite(fieldRange.max) ? fieldRange.max : 1}
          label={fieldLabel}
        />

        {/* Render controls overlay */}
        <div className="absolute top-24 right-[328px] z-30 flex flex-col gap-2">
          <div className="flex gap-2">
            {/* Render mode toggle */}
            <div className="flex bg-black/70 rounded border border-white/20 backdrop-blur-sm overflow-hidden">
              <button
                onClick={() => setRendering(r => ({ ...r, renderMode: 'points' }))}
                className={`px-3 py-1 text-sm transition-colors ${
                  rendering.renderMode === 'points'
                    ? 'bg-cyan-500/30 text-cyan-300'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                Points
              </button>
              <button
                onClick={() => setRendering(r => ({ ...r, renderMode: 'mesh' }))}
                className={`px-3 py-1 text-sm transition-colors ${
                  rendering.renderMode === 'mesh'
                    ? 'bg-cyan-500/30 text-cyan-300'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                Mesh
              </button>
            </div>
            {/* Field and colormap selectors (for both modes) */}
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
          {rendering.renderMode === 'mesh' && (
            <div className="flex gap-2 items-center">
              <label className="text-white/60 text-xs">Grid:</label>
              <select
                value={rendering.meshResolution}
                onChange={(e) => setRendering(r => ({ ...r, meshResolution: parseInt(e.target.value) }))}
                className="bg-black/70 text-white text-sm px-2 py-1 rounded border border-white/20 backdrop-blur-sm cursor-pointer hover:border-white/40"
              >
                <option value={16}>16 (Fast)</option>
                <option value={24}>24</option>
                <option value={32}>32</option>
                <option value={48}>48 (Default)</option>
                <option value={64}>64</option>
                <option value={96}>96 (High)</option>
                <option value={128}>128 (Very High)</option>
              </select>
            </div>
          )}
        </div>

        <Canvas
          dpr={[1, 2]}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <color attach="background" args={['#1a1a24']} />

          <PerspectiveCamera makeDefault position={[8, 6, 8]} fov={50} />
          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            target={[0, container.boxHeight / 2, 0]}
            mouseButtons={{
              LEFT: THREE.MOUSE.ROTATE,
              MIDDLE: THREE.MOUSE.PAN,
              RIGHT: THREE.MOUSE.DOLLY,
            }}
          />

          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={0.8} />
          <directionalLight position={[-5, 8, -5]} intensity={0.4} />
          <pointLight position={[0, 15, 0]} intensity={0.5} />

          {/* SPH simulation */}
          <SPHScene
            key={`sph-${particleCount}-${boxSize.join('-')}`}
            particleCount={particleCount}
            renderConfig={renderConfig}
            boxSize={boxSize}
            physics={physics}
            fieldType={rendering.fieldType}
            rendering={rendering}
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

export default SPHSimulation;
