/**
 * WebGPU Not Supported Component
 *
 * Displayed when WebGPU is not available in the user's browser.
 * Provides information about browser compatibility and alternatives.
 */

import { useMemo } from 'react';

interface WebGPUNotSupportedProps {
  /** Optional custom message */
  message?: string;
}

export function WebGPUNotSupported({ message }: WebGPUNotSupportedProps) {
  // Detect OS for platform-specific instructions
  const platform = useMemo(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('linux')) return 'linux';
    if (ua.includes('mac')) return 'macos';
    if (ua.includes('win')) return 'windows';
    return 'unknown';
  }, []);

  const isChrome = useMemo(() => {
    return navigator.userAgent.includes('Chrome');
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center">
      <div className="max-w-lg">
        {/* Icon */}
        <div className="text-6xl mb-6">
          <svg
            className="w-20 h-20 mx-auto text-amber-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-tertiary mb-4">
          WebGPU Required
        </h2>

        {/* Message */}
        <p className="text-secondary mb-6">
          {message ||
            'This simulation requires WebGPU, a next-generation graphics API for the web. Your browser does not currently support WebGPU or it may need to be enabled.'}
        </p>

        {/* Linux-specific instructions */}
        {platform === 'linux' && isChrome && (
          <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4 mb-6 text-left">
            <h3 className="text-blue-300 font-semibold mb-2">
              Linux Chrome Users
            </h3>
            <p className="text-secondary text-sm mb-3">
              WebGPU may need to be enabled manually on Linux. Try these steps:
            </p>
            <ol className="text-secondary text-sm space-y-2 list-decimal list-inside">
              <li>
                Open <code className="bg-black/50 px-1 rounded">chrome://flags</code>
              </li>
              <li>
                Search for <code className="bg-black/50 px-1 rounded">WebGPU</code>
              </li>
              <li>
                Enable <code className="bg-black/50 px-1 rounded">Unsafe WebGPU Support</code>
              </li>
              <li>
                Also enable <code className="bg-black/50 px-1 rounded">WebGPU Developer Features</code> if available
              </li>
              <li>Restart Chrome</li>
            </ol>
            <p className="text-secondary/70 text-xs mt-3">
              You may also need up-to-date GPU drivers (Mesa 22.0+ for AMD/Intel, NVIDIA 525+).
            </p>
          </div>
        )}

        {/* Browser Support Info */}
        <div className="bg-[#1a1a2e] rounded-lg p-6 mb-6">
          <h3 className="text-tertiary font-semibold mb-3">
            Supported Browsers
          </h3>
          <ul className="text-secondary text-sm space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              Chrome 113+ (Windows, macOS, ChromeOS)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-amber-400">⚠</span>
              Chrome on Linux (requires flag)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              Edge 113+ (Windows, macOS)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-amber-400">⚠</span>
              Firefox Nightly (with flag enabled)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-amber-400">⚠</span>
              Safari 18+ (macOS Sequoia, iOS 18)
            </li>
          </ul>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="https://caniuse.com/webgpu"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-secondary/20 text-tertiary rounded hover:bg-secondary/40 transition-colors"
          >
            Check Browser Support
          </a>
          <a
            href="/"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Return Home
          </a>
        </div>

        {/* Technical note */}
        <p className="text-secondary/60 text-xs mt-8">
          WebGPU enables GPU-accelerated particle simulations with millions of
          particles running at 60fps. The compute shaders used in these
          simulations require native WebGPU support.
        </p>
      </div>
    </div>
  );
}

export default WebGPUNotSupported;
