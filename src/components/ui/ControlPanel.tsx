/**
 * Shared UI components for studio control panels
 * Used by LatticeGallery, TPMSGallery, and other visualization studios
 */

import { useState, ReactNode } from 'react';

// ============================================================================
// Slider Component
// ============================================================================

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

export const Slider = ({ label, value, min, max, step, onChange }: SliderProps) => (
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

// ============================================================================
// Select Component
// ============================================================================

interface SelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

export const Select = ({ label, value, options, onChange }: SelectProps) => (
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

// ============================================================================
// Checkbox Component
// ============================================================================

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const Checkbox = ({ label, checked, onChange }: CheckboxProps) => (
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

// ============================================================================
// Collapsible Section Component
// ============================================================================

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export const CollapsibleSection = ({ title, defaultOpen = true, children }: CollapsibleSectionProps) => {
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
// Control Panel Container
// ============================================================================

interface ControlPanelProps {
  title: string;
  children: ReactNode;
}

export const ControlPanel = ({ title, children }: ControlPanelProps) => (
  <div className="w-72 bg-[#0a0f18] border-l border-[#1B263B] overflow-y-auto">
    <div className="p-4">
      <h2 className="text-sm font-bold text-tertiary mb-4">{title}</h2>
      {children}
    </div>
  </div>
);

// ============================================================================
// Controls Hint Overlay
// ============================================================================

export const ControlsHint = () => (
  <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm p-3 rounded-lg">
    <h3 className="text-sm font-semibold text-tertiary mb-1">Controls</h3>
    <ul className="text-xs text-secondary/80 space-y-0.5">
      <li>Left-click + drag: Rotate</li>
      <li>Middle-click + drag: Pan</li>
      <li>Scroll / Right-click: Zoom</li>
    </ul>
  </div>
);

// ============================================================================
// Title Overlay
// ============================================================================

interface TitleOverlayProps {
  title: string;
  subtitle: string | ReactNode;
}

export const TitleOverlay = ({ title, subtitle }: TitleOverlayProps) => (
  <div className="absolute top-4 left-4">
    <h1 className="text-2xl font-bold text-tertiary">{title}</h1>
    <p className="text-secondary text-sm">{subtitle}</p>
  </div>
);

// ============================================================================
// Info Overlay (for displaying surface/lattice info)
// ============================================================================

interface InfoOverlayProps {
  children: ReactNode;
}

export const InfoOverlay = ({ children }: InfoOverlayProps) => (
  <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm p-4 rounded-lg max-w-sm">
    {children}
  </div>
);

// ============================================================================
// Mobile Fallback Message
// ============================================================================

interface MobileFallbackProps {
  appName: string;
}

export const MobileFallback = ({ appName }: MobileFallbackProps) => (
  <section className="h-screen flex items-center justify-center text-center px-8 text-secondary">
    The {appName} requires a desktop browser for optimal performance.
  </section>
);
