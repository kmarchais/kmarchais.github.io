/**
 * Simulations Gallery
 *
 * Main landing page for WebGPU particle simulations.
 * Shows cards for each simulation type with preview animations.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Navbar } from '@/components';
import { useGPUCapabilities } from '@/utils/gpuCapabilities';
import { WebGPUNotSupported } from './WebGPUNotSupported';
import Breadcrumb from '@/components/ui/Breadcrumb';

interface SimulationCardProps {
  title: string;
  description: string;
  route: string;
  icon: React.ReactNode;
  tags: string[];
  gradient: string;
}

function SimulationCard({
  title,
  description,
  route,
  icon,
  tags,
  gradient,
}: SimulationCardProps) {
  return (
    <Link
      to={route}
      className={`
        group relative rounded-xl overflow-hidden
        bg-gradient-to-br ${gradient}
        transition-all duration-300
        hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20
      `}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <defs>
            <pattern
              id={`grid-${title}`}
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="0.5" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill={`url(#grid-${title})`} />
        </svg>
      </div>

      {/* Content */}
      <div className="relative p-6 h-full flex flex-col">
        {/* Icon */}
        <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
          {icon}
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>

        {/* Description */}
        <p className="text-white/80 text-sm flex-grow">{description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-4">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-1 bg-white/20 rounded-full text-white/90"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Arrow indicator */}
        <div className="absolute bottom-4 right-4 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

const SIMULATIONS = [
  {
    title: 'N-Body Gravitational',
    description:
      'Watch thousands of particles interact through gravitational forces. Observe galaxy formation, orbital dynamics, and cosmic structures emerge.',
    route: '/showcase/simulations/nbody',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3" strokeWidth={2} />
        <path strokeWidth={1.5} d="M12 2a10 10 0 0110 10M12 2a10 10 0 00-10 10M12 22a10 10 0 0010-10M12 22a10 10 0 01-10-10" />
        <circle cx="6" cy="6" r="1.5" fill="currentColor" />
        <circle cx="18" cy="8" r="1" fill="currentColor" />
        <circle cx="8" cy="18" r="1.5" fill="currentColor" />
      </svg>
    ),
    tags: ['GPU Compute', 'Direct Summation', 'Leapfrog'],
    gradient: 'from-purple-900 to-indigo-900',
  },
  {
    title: 'Granular (DEM)',
    description:
      'Discrete Element Method simulation of granular materials. Watch sand, powder, and particles collide, pile up, and flow through containers.',
    route: '/showcase/simulations/granular',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth={2} d="M12 3v2m0 14v2M5.5 8l1.5 1m9.5-1l1.5 1M5.5 16l1.5-1m9.5 1l1.5-1" />
        <circle cx="8" cy="16" r="2" strokeWidth={1.5} />
        <circle cx="16" cy="16" r="2" strokeWidth={1.5} />
        <circle cx="12" cy="12" r="2" strokeWidth={1.5} />
        <circle cx="6" cy="10" r="1.5" strokeWidth={1.5} />
        <circle cx="18" cy="10" r="1.5" strokeWidth={1.5} />
      </svg>
    ),
    tags: ['Spatial Hashing', 'Hertz-Mindlin', 'Contact Forces'],
    gradient: 'from-amber-900 to-orange-900',
  },
  {
    title: 'Fluid (SPH)',
    description:
      'Smoothed Particle Hydrodynamics fluid simulation. Experience realistic water behavior with dam breaks, waves, and splashing.',
    route: '/showcase/simulations/fluid',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth={2} d="M12 2c-4 4-6 7-6 10a6 6 0 1012 0c0-3-2-6-6-10z" />
        <path strokeWidth={1.5} d="M9 14a3 3 0 006 0" opacity="0.6" />
      </svg>
    ),
    tags: ['Density Estimation', 'Pressure Forces', 'Viscosity'],
    gradient: 'from-cyan-900 to-blue-900',
  },
];

export function SimulationsGallery() {
  const capabilities = useGPUCapabilities();
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

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
          { label: 'Simulations' },
        ]} />
      </div>

      {/* Header */}
      <header className="px-8 pt-4 pb-8">
        <div className="max-w-4xl">
          <h1 className="text-4xl font-bold text-tertiary mb-4">
            WebGPU Particle Simulations
          </h1>
          <p className="text-secondary text-lg">
            Real-time physics simulations powered by WebGPU compute shaders.
            Each simulation runs entirely on your GPU, enabling millions of
            particles at 60fps.
          </p>
        </div>

        {/* GPU Info */}
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-green-900/30 rounded-lg border border-green-700/50">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-green-300 text-sm">
            WebGPU Active
            {capabilities.tier === 'high' && ' (High Performance)'}
            {capabilities.tier === 'medium' && ' (Standard Performance)'}
          </span>
        </div>

        {isMobile && (
          <div className="mt-4 px-4 py-3 bg-amber-900/30 rounded-lg border border-amber-700/50">
            <p className="text-amber-300 text-sm">
              For the best experience, use a desktop browser. Mobile performance
              may be limited.
            </p>
          </div>
        )}
      </header>

      {/* Simulation Cards */}
      <section className="px-8 pb-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SIMULATIONS.map((sim) => (
            <SimulationCard key={sim.title} {...sim} />
          ))}
        </div>
      </section>

      {/* Technical Info */}
      <section className="px-8 pb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-tertiary mb-6">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div className="bg-[#1a1a2e] rounded-lg p-5">
              <h3 className="text-tertiary font-semibold mb-2">GPU Compute</h3>
              <p className="text-secondary">
                Physics calculations run in parallel on the GPU using WebGPU
                compute shaders. Each particle's forces and position are updated
                simultaneously.
              </p>
            </div>
            <div className="bg-[#1a1a2e] rounded-lg p-5">
              <h3 className="text-tertiary font-semibold mb-2">
                Point Gaussians
              </h3>
              <p className="text-secondary">
                Particles are rendered as Gaussian splats, similar to ParaView's
                scientific visualization. Choose between soft splat and additive
                blending modes.
              </p>
            </div>
            <div className="bg-[#1a1a2e] rounded-lg p-5">
              <h3 className="text-tertiary font-semibold mb-2">
                Real-Time Control
              </h3>
              <p className="text-secondary">
                Adjust simulation parameters on the fly and see immediate
                results. Modify physics properties, rendering options, and
                initial conditions.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default SimulationsGallery;
