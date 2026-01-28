/**
 * N-Body Gravitational Simulation Page
 *
 * Interactive WebGPU-powered N-body simulation with real-time controls.
 * Styled to match DEM and SPH simulations with custom control panel.
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
import { useNBodySimulation } from '@/hooks/simulations';
import { SimulationViewer, ParticleRenderConfig } from '../SimulationViewer';
import { WebGPUNotSupported } from '../WebGPUNotSupported';
import { NBODY_PRESETS, PRESET_OPTIONS } from './nbodyPresets';
import { COLORMAPS, BLEND_MODES } from '@/shaders/simulations/rendering/pointGaussian';

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
 * Bounds box visualization (when bounds > 0)
 */
function BoundsSurface({ size }: { size: number }) {
  if (size <= 0) return null;

  const halfSize = size;
  return (
    <mesh>
      <boxGeometry args={[halfSize * 2, halfSize * 2, halfSize * 2]} />
      <meshStandardMaterial
        color="#6644ff"
        opacity={0.08}
        transparent
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/** Physics configuration */
interface PhysicsConfig {
  G: number;
  softening: number;
  dt: number;
  bounds: number;
  damping: number;
  preset: string;
  collisionRadius: number;
  collisionStiffness: number;
  collisionDamping: number;
}

/** Rendering configuration */
interface RenderingConfig {
  pointSize: number;
  gaussianSigma: number;
  brightness: number;
  colormap: number;
  velocityScale: number;
  blendMode: number;
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
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all"
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
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white appearance-none cursor-pointer hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-primary transition-colors"
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
        {icon && <span className="text-purple-400">{icon}</span>}
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
  rendering,
  setRendering,
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
  rendering: RenderingConfig;
  setRendering: React.Dispatch<React.SetStateAction<RenderingConfig>>;
  particleCount: number;
  setParticleCount: (count: number) => void;
  isRunning: boolean;
  frame: number;
  time: number;
  onToggle: () => void;
  onReset: () => void;
}) {
  const presetOptions = PRESET_OPTIONS.map((key) => ({
    value: key,
    label: NBODY_PRESETS[key].name,
  }));

  const blendOptions = BLEND_MODES.map(({ value, label }) => ({ value, label }));

  // Icons for sections
  const particleIcon = (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="2" />
      <circle cx="5" cy="5" r="1.5" />
      <circle cx="15" cy="5" r="1.5" />
      <circle cx="5" cy="15" r="1.5" />
      <circle cx="15" cy="15" r="1.5" />
      <circle cx="3" cy="10" r="1" />
      <circle cx="17" cy="10" r="1" />
    </svg>
  );

  const physicsIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );

  const collisionIcon = (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <circle cx="6" cy="10" r="4" />
      <circle cx="14" cy="10" r="4" />
    </svg>
  );

  const renderIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );

  // Calculate interactions per frame
  const interactions = (particleCount * (particleCount - 1)) / 2;

  return (
    <div className="fixed right-0 top-20 bottom-0 w-80 bg-gradient-to-b from-gray-900/95 to-black/95 backdrop-blur-xl border-l border-white/10 overflow-y-auto z-10">
      <div className="p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="3" />
              <circle cx="4" cy="4" r="2" />
              <circle cx="16" cy="4" r="2" />
              <circle cx="4" cy="16" r="2" />
              <circle cx="16" cy="16" r="2" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">N-Body</h2>
            <p className="text-[11px] text-white/40">Gravitational Simulation</p>
          </div>
        </div>

        {/* Play/Pause Controls */}
        <div className="flex gap-2">
          <button
            onClick={onToggle}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
              isRunning
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40'
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
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Particles</div>
            <div className="text-sm font-mono text-white">{particleCount.toLocaleString()}</div>
          </div>
          <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/5">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Pairs/Frame</div>
            <div className="text-sm font-mono text-white">{interactions >= 1e6 ? `${(interactions / 1e6).toFixed(1)}M` : interactions.toLocaleString()}</div>
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
              label="Initial Setup"
              value={physics.preset}
              options={presetOptions}
              onChange={(v) => setPhysics((p) => ({ ...p, preset: v as string }))}
            />
            {/* Show preset description */}
            <p className="text-[10px] text-white/30 leading-relaxed">
              {NBODY_PRESETS[physics.preset]?.description || ''}
            </p>
          </Section>

          <Section title="Physics" icon={physicsIcon} defaultOpen={false}>
            <Slider
              label="Gravity (G)"
              value={physics.G}
              min={0.01}
              max={2.0}
              step={0.01}
              onChange={(v) => setPhysics((p) => ({ ...p, G: v }))}
            />
            <Slider
              label="Softening"
              value={physics.softening}
              min={0.01}
              max={1.0}
              step={0.01}
              onChange={(v) => setPhysics((p) => ({ ...p, softening: v }))}
            />
            <Slider
              label="Time Step"
              value={physics.dt}
              min={0.001}
              max={0.05}
              step={0.001}
              onChange={(v) => setPhysics((p) => ({ ...p, dt: v }))}
            />
            <Slider
              label="Bounds (0=none)"
              value={physics.bounds}
              min={0}
              max={20}
              step={1}
              onChange={(v) => setPhysics((p) => ({ ...p, bounds: v }))}
            />
            <Slider
              label="Damping"
              value={physics.damping}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => setPhysics((p) => ({ ...p, damping: v }))}
            />
          </Section>

          <Section title="Collisions" icon={collisionIcon} defaultOpen={false}>
            <Slider
              label="Radius (0=off)"
              value={physics.collisionRadius}
              min={0}
              max={0.5}
              step={0.01}
              onChange={(v) => setPhysics((p) => ({ ...p, collisionRadius: v }))}
            />
            <Slider
              label="Stiffness"
              value={physics.collisionStiffness}
              min={1}
              max={200}
              step={1}
              onChange={(v) => setPhysics((p) => ({ ...p, collisionStiffness: v }))}
            />
            <Slider
              label="Damping"
              value={physics.collisionDamping}
              min={0}
              max={20}
              step={0.5}
              onChange={(v) => setPhysics((p) => ({ ...p, collisionDamping: v }))}
            />
            <p className="text-[10px] text-white/30 leading-relaxed">
              Soft collision model: particles repel when overlapping. Set radius to 0 to disable.
            </p>
          </Section>

          <Section title="Rendering" icon={renderIcon} defaultOpen={false}>
            <Slider
              label="Point Size"
              value={rendering.pointSize}
              min={0.01}
              max={0.5}
              step={0.01}
              onChange={(v) => setRendering((r) => ({ ...r, pointSize: v }))}
            />
            <Slider
              label="Brightness"
              value={rendering.brightness}
              min={0.1}
              max={3.0}
              step={0.1}
              onChange={(v) => setRendering((r) => ({ ...r, brightness: v }))}
            />
            <Slider
              label="Velocity Scale"
              value={rendering.velocityScale}
              min={0.01}
              max={2.0}
              step={0.01}
              onChange={(v) => setRendering((r) => ({ ...r, velocityScale: v }))}
            />
            <Select
              label="Blend Mode"
              value={rendering.blendMode}
              options={blendOptions}
              onChange={(v) => setRendering((r) => ({ ...r, blendMode: v as number }))}
            />
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
              Direct O(N²) gravitational force calculation running on WebGPU compute shaders. Each particle attracts every other particle.
              <span className="block mt-1 text-white/20">Drag to rotate • Scroll to zoom • Middle-click to pan</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Inner component that uses the simulation hook (must be inside Canvas)
 */
function NBodyScene({
  particleCount,
  renderConfig,
  physics,
  onStateChange,
  onFieldRangeChange,
}: {
  particleCount: number;
  renderConfig: ParticleRenderConfig;
  physics: PhysicsConfig;
  onStateChange: (state: { running: boolean; frame: number }, controls: { toggle: () => void; reset: () => void }) => void;
  onFieldRangeChange: (range: FieldRange) => void;
}) {
  const [state, controls, positions, velocities] = useNBodySimulation({
    particleCount,
  });

  // Track field min/max
  const fieldRangeRef = useRef<FieldRange>({ min: Infinity, max: -Infinity });

  // Compute and update field range from velocity data
  useEffect(() => {
    if (!velocities) return;

    let min = fieldRangeRef.current.min;
    let max = fieldRangeRef.current.max;
    let updated = false;

    // Sample particles for performance
    const step = Math.max(1, Math.floor(particleCount / 500));

    // Velocity magnitude
    for (let i = 0; i < particleCount; i += step) {
      const vx = velocities[i * 4];
      const vy = velocities[i * 4 + 1];
      const vz = velocities[i * 4 + 2];
      const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
      if (speed < min) { min = speed; updated = true; }
      if (speed > max) { max = speed; updated = true; }
    }

    if (updated) {
      fieldRangeRef.current = { min, max };
      onFieldRangeChange({ min, max });
    }
  }, [velocities, particleCount, onFieldRangeChange]);

  // Update parent with state and controls
  useEffect(() => {
    onStateChange({ running: state.running, frame: state.frame }, controls);
  }, [state.running, state.frame, controls, onStateChange]);

  // Update simulation config when parameters change
  useEffect(() => {
    controls.updateConfig({
      G: physics.G,
      softening: physics.softening,
      dt: physics.dt,
      bounds: physics.bounds,
      damping: physics.damping,
      preset: physics.preset,
      collisionRadius: physics.collisionRadius,
      collisionStiffness: physics.collisionStiffness,
      collisionDamping: physics.collisionDamping,
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
      <SimulationViewer
        positions={positions}
        velocities={velocities}
        particleCount={particleCount}
        config={renderConfig}
      />
      <BoundsSurface size={physics.bounds} />
    </>
  );
}

/**
 * Main N-Body simulation page
 */
export function NBodySimulation() {
  const capabilities = useGPUCapabilities();

  // State for all controls
  const [particleCount, setParticleCount] = useState(2000);
  const [physics, setPhysics] = useState<PhysicsConfig>({
    G: 0.5,
    softening: 0.1,
    dt: 0.01,
    bounds: 0,
    damping: 0.8,
    preset: 'plummer',
    collisionRadius: 0.1,
    collisionStiffness: 50,
    collisionDamping: 5,
  });
  const [rendering, setRendering] = useState<RenderingConfig>({
    pointSize: 0.15,
    gaussianSigma: 0.4,
    brightness: 1.5,
    colormap: 2, // Turbo - good for space themes
    velocityScale: 0.3,
    blendMode: 2, // Sphere mode
  });

  // Simulation state from scene
  const [simState, setSimState] = useState({ running: false, frame: 0, time: 0 });
  const [simControls, setSimControls] = useState<{ toggle: () => void; reset: () => void } | null>(null);
  const [fieldRange, setFieldRange] = useState<FieldRange>({ min: 0, max: 1 });

  const handleStateChange = useCallback(
    (state: { running: boolean; frame: number }, controls: { toggle: () => void; reset: () => void }) => {
      setSimState({ ...state, time: state.frame * physics.dt });
      setSimControls(controls);
    },
    [physics.dt]
  );

  const handleFieldRangeChange = useCallback((range: FieldRange) => {
    setFieldRange(range);
  }, []);

  // Construct render config with dynamic min/max
  const renderConfig: ParticleRenderConfig = useMemo(() => ({
    pointSize: rendering.pointSize,
    minSize: 0.01,
    maxSize: 0.5,
    velocityScale: rendering.velocityScale,
    colorMode: 1, // Field-based coloring
    fieldType: 0, // Velocity magnitude
    colormap: rendering.colormap,
    fieldMin: isFinite(fieldRange.min) ? fieldRange.min : 0,
    fieldMax: isFinite(fieldRange.max) ? fieldRange.max : 1,
    gaussianSigma: rendering.gaussianSigma,
    minAlpha: 0.01,
    blendMode: rendering.blendMode,
    brightness: rendering.brightness,
    baseColor: [1.0, 1.0, 1.0],
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
          { label: 'N-Body' },
        ]} />
      </div>

      {/* Control Panel */}
      <ControlPanel
        physics={physics}
        setPhysics={setPhysics}
        rendering={rendering}
        setRendering={setRendering}
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
        {/* Colorbar */}
        <Colorbar
          colormap={rendering.colormap}
          min={isFinite(fieldRange.min) ? fieldRange.min : 0}
          max={isFinite(fieldRange.max) ? fieldRange.max : 1}
          label="Velocity"
        />

        {/* Colormap selector overlay */}
        <div className="absolute top-24 right-[328px] z-30 flex gap-2">
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
          <color attach="background" args={['#050510']} />

          <PerspectiveCamera makeDefault position={[15, 10, 15]} fov={50} />
          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            mouseButtons={{
              LEFT: THREE.MOUSE.ROTATE,
              MIDDLE: THREE.MOUSE.PAN,
              RIGHT: THREE.MOUSE.DOLLY,
            }}
          />

          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={0.6} />
          <directionalLight position={[-5, 8, -5]} intensity={0.3} />
          <pointLight position={[0, 15, 0]} intensity={0.4} />

          {/* N-Body simulation */}
          <NBodyScene
            key={`nbody-${particleCount}-${physics.preset}`}
            particleCount={particleCount}
            renderConfig={renderConfig}
            physics={physics}
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

export default NBodySimulation;
