/**
 * Hourglass Flow Widget
 *
 * Compact home page widget showing particles in an hourglass container.
 * Auto-starts on mount and provides basic OrbitControls for interaction.
 */

import { useEffect, useMemo, useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationViewer } from '@/components/projects/simulations/SimulationViewer';
import { useGyroidFlowSimulation, GyroidFlowConfig } from '@/hooks/simulations/useGyroidFlowSimulation';
import { generateGyroidGeometry } from '@/utils/marchingCubes';

/**
 * Hourglass visualization using LatheGeometry
 * Uses the exact same radius formula as the physics shader
 */
interface HourglassVisualizerProps {
  radiusTop: number;
  radiusWaist: number;
  yMin: number;
  yMax: number;
  showTopCap?: boolean;
}

const HourglassVisualizer = ({ radiusTop, radiusWaist, yMin, yMax, showTopCap = true }: HourglassVisualizerProps) => {
  // Glass material - depthWrite false so particles show through
  const glassMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: 0x88aacc,
    transparent: true,
    opacity: 0.2,
    roughness: 0.1,
    metalness: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);

  // Create hourglass profile using the EXACT same formula as physics shader:
  // r(y) = waist + (top - waist) * yNorm^2
  // where yNorm = (y - yCenter) / halfHeight, clamped to [-1, 1]
  const hourglassGeometry = useMemo(() => {
    const height = yMax - yMin;
    const yCenter = yMin + height * 0.5;
    const halfHeight = height * 0.5;
    const segments = 64;

    // Create profile points from bottom to top
    const points: THREE.Vector2[] = [];
    for (let i = 0; i <= segments; i++) {
      const y = yMin + (i / segments) * height;
      const yNorm = (y - yCenter) / halfHeight; // Range: -1 to 1
      const r = radiusWaist + (radiusTop - radiusWaist) * yNorm * yNorm;
      points.push(new THREE.Vector2(r, y));
    }

    return new THREE.LatheGeometry(points, 64);
  }, [radiusTop, radiusWaist, yMin, yMax]);

  // Cap geometry (solid circle) - used for both top and bottom
  const capGeometry = useMemo(() => {
    return new THREE.CircleGeometry(radiusTop, 64);
  }, [radiusTop]);

  return (
    <group>
      <mesh geometry={hourglassGeometry} material={glassMaterial} />
      {/* Bottom cap */}
      <mesh
        geometry={capGeometry}
        material={glassMaterial}
        position={[0, yMin, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      {/* Top cap - only shown when enabled */}
      {showTopCap && (
        <mesh
          geometry={capGeometry}
          material={glassMaterial}
          position={[0, yMax, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        />
      )}
    </group>
  );
};

/**
 * Gyroid visualization using marching cubes
 */
interface GyroidVisualizerProps {
  yMin: number;
  yMax: number;
  showTopCap?: boolean;
}

const GyroidVisualizer = ({ yMin, yMax, showTopCap = true }: GyroidVisualizerProps) => {
  const glassMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: 0x88aacc,
    transparent: true,
    opacity: 0.15,
    roughness: 0.1,
    metalness: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);

  // 3 equal cubes: bottom box, gyroid, top box
  const totalHeight = yMax - yMin;
  const cubeSize = totalHeight / 3.0;
  const gyroidYMin = yMin + cubeSize;
  const gyroidYMax = yMax - cubeSize;
  const gyroidCenter = (gyroidYMin + gyroidYMax) / 2;

  // Wall thickness for thick-walled gyroid (same as physics)
  const wallThickness = 0.4;
  const gyroidScale = 4 * Math.PI / cubeSize;

  // Generate gyroid mesh using marching cubes
  const gyroidGeometry = useMemo(() => {
    const { positions } = generateGyroidGeometry(cubeSize, gyroidScale, wallThickness, 40);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    return geometry;
  }, [cubeSize, gyroidScale, wallThickness]);

  return (
    <group>
      {/* Bottom box */}
      <mesh position={[0, yMin + cubeSize / 2, 0]} material={glassMaterial}>
        <boxGeometry args={[cubeSize, cubeSize, cubeSize]} />
      </mesh>

      {/* Gyroid region wireframe box */}
      <lineSegments position={[0, gyroidCenter, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize)]} />
        <lineBasicMaterial color={0x88aacc} transparent opacity={0.3} />
      </lineSegments>

      {/* Gyroid surface mesh */}
      <mesh position={[0, gyroidCenter, 0]} geometry={gyroidGeometry} material={glassMaterial} />

      {/* Top box */}
      {showTopCap && (
        <mesh position={[0, yMax - cubeSize / 2, 0]} material={glassMaterial}>
          <boxGeometry args={[cubeSize, cubeSize, cubeSize]} />
        </mesh>
      )}
    </group>
  );
};

/**
 * Inner scene component that uses the simulation hook
 */

const FLIP_INTERVAL = 10; // seconds between flips
const FLIP_DURATION = 2; // seconds for rotation animation

interface HourglassFlowSceneProps {
  config: Partial<GyroidFlowConfig>;
  showHourglass?: boolean;
  resetTrigger?: number;
}

const HourglassFlowScene = ({ config, showHourglass = true, resetTrigger = 0 }: HourglassFlowSceneProps) => {
  const [state, controls, positions, velocities, currentConfig] = useGyroidFlowSimulation({
    ...config,
    autoStart: true,
  });

  // Track geometry type for visualization
  const [activeGeometryType, setActiveGeometryType] = useState(config.geometryType ?? 0);

  // Update simulation config when geometry type changes
  useEffect(() => {
    if (config.geometryType !== undefined && config.geometryType !== activeGeometryType) {
      setActiveGeometryType(config.geometryType);
      controls.updateConfig({ geometryType: config.geometryType });
    }
  }, [config.geometryType, activeGeometryType, controls]);

  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);
  const rotationRef = useRef(0); // Current rotation in radians (0 or PI)
  const isFlippingRef = useRef(false);
  const targetRotationRef = useRef(0);
  const topCapEnabledRef = useRef(false);
  const [showTopCap, setShowTopCap] = useState(false);
  const lastResetTriggerRef = useRef(resetTrigger);
  const controlsRef = useRef(controls);
  controlsRef.current = controls;

  // Reset simulation when resetTrigger changes
  useEffect(() => {
    if (resetTrigger !== lastResetTriggerRef.current && state.initialized) {
      lastResetTriggerRef.current = resetTrigger;

      // Update config with new spawn positions BEFORE reset
      // This ensures particles spawn in the correct location for the new geometry
      controlsRef.current.updateConfig({
        geometryType: config.geometryType,
        spawnXMin: config.spawnXMin,
        spawnXMax: config.spawnXMax,
        spawnYMin: config.spawnYMin,
        spawnYMax: config.spawnYMax,
        spawnZMin: config.spawnZMin,
        spawnZMax: config.spawnZMax,
        gravity: -9.81,
        topCapEnabled: false,
      });

      // Reset simulation - use ref to get current controls
      controlsRef.current.reset();

      // Reset flip animation state
      timeRef.current = 0;
      rotationRef.current = 0;
      isFlippingRef.current = false;
      targetRotationRef.current = 0;
      topCapEnabledRef.current = false;
      setShowTopCap(false);

      // Reset group rotation
      if (groupRef.current) {
        groupRef.current.rotation.z = 0;
      }
    }
  }, [resetTrigger, state.initialized, config]);

  // Hourglass center for rotation pivot
  const yCenter = (currentConfig.hourglassYMin + currentConfig.hourglassYMax) / 2;

  useFrame((_, delta) => {
    timeRef.current += delta;

    // Check if it's time to start a new flip
    if (!isFlippingRef.current && timeRef.current >= FLIP_INTERVAL) {
      // Enable top cap before first flip
      if (!topCapEnabledRef.current) {
        topCapEnabledRef.current = true;
        setShowTopCap(true);
        controls.updateConfig({ topCapEnabled: true });
      }

      isFlippingRef.current = true;
      targetRotationRef.current = rotationRef.current + Math.PI;
      timeRef.current = 0; // Reset timer
    }

    // Handle flip animation
    if (isFlippingRef.current && groupRef.current) {
      const elapsed = timeRef.current;
      const progress = Math.min(elapsed / FLIP_DURATION, 1);

      // Smooth easing (ease in-out)
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const startRotation = targetRotationRef.current - Math.PI;
      const newRotation = startRotation + eased * Math.PI;
      groupRef.current.rotation.z = newRotation;

      // Flip gravity at midpoint
      if (progress >= 0.5 && rotationRef.current !== targetRotationRef.current) {
        rotationRef.current = targetRotationRef.current;
        const isUpsideDown = (Math.round(rotationRef.current / Math.PI) % 2) === 1;
        const newGravity = isUpsideDown ? 9.81 : -9.81;
        controls.updateConfig({ gravity: newGravity });
      }

      // End flip
      if (progress >= 1) {
        isFlippingRef.current = false;
        groupRef.current.rotation.z = targetRotationRef.current;
      }
    }
  });

  // Error display
  if (state.error) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="red" />
      </mesh>
    );
  }

  return (
    <>
      <group ref={groupRef} position={[0, yCenter, 0]}>
        <group position={[0, -yCenter, 0]}>
          {/* Geometry visualization */}
          {showHourglass && activeGeometryType === 0 && (
            <HourglassVisualizer
              radiusTop={currentConfig.hourglassRadiusTop}
              radiusWaist={currentConfig.hourglassRadiusWaist}
              yMin={currentConfig.hourglassYMin}
              yMax={currentConfig.hourglassYMax}
              showTopCap={showTopCap}
            />
          )}
          {showHourglass && activeGeometryType === 1 && (
            <GyroidVisualizer
              yMin={currentConfig.hourglassYMin}
              yMax={currentConfig.hourglassYMax}
              showTopCap={showTopCap}
            />
          )}

          {/* Particles */}
          {positions && velocities && (
            <SimulationViewer
              positions={positions}
              velocities={velocities}
              particleCount={currentConfig.particleCount}
              config={activeGeometryType === 1 ? {
                // Gyroid mode: color by channel (positive/negative SDF)
                pointSize: 1.0,
                colorMode: 1,
                fieldType: 5, // Gyroid channel
                colormap: 3,  // Coolwarm (blue-white-red)
                colormapReversed: false,
                fieldMin: 0,
                fieldMax: 1,
                blendMode: 2,
                brightness: 1.2,
                gaussianSigma: 0.4,
                gyroidScale: currentConfig.gyroidScale,
                gyroidYMin: currentConfig.hourglassYMin + (currentConfig.hourglassYMax - currentConfig.hourglassYMin) / 3,
                gyroidYMax: currentConfig.hourglassYMax - (currentConfig.hourglassYMax - currentConfig.hourglassYMin) / 3,
              } : {
                // Hourglass mode: color by velocity
                pointSize: 1.0,
                colorMode: 1,
                fieldType: 0,
                colormap: 4,
                colormapReversed: true,
                fieldMin: 0,
                fieldMax: 5,
                blendMode: 2,
                brightness: 1.2,
                gaussianSigma: 0.4,
              }}
            />
          )}
        </group>
      </group>

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} />
    </>
  );
};

interface HourglassFlowWidgetProps {
  className?: string;
  particleCount?: number;
  showHourglass?: boolean;
  geometryType?: number;  // 0 = hourglass, 1 = gyroid
}

const HourglassFlowWidget = ({
  className = '',
  particleCount = 10000,
  showHourglass = true,
  geometryType = 0,
}: HourglassFlowWidgetProps) => {
  const [isWebGPUSupported, setIsWebGPUSupported] = useState<boolean | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [resetTrigger, setResetTrigger] = useState(0);
  const prevGeometryTypeRef = useRef(geometryType);

  useEffect(() => {
    const checkWebGPU = async () => {
      if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
        setIsWebGPUSupported(false);
        return;
      }
      try {
        const adapter = await navigator.gpu.requestAdapter();
        setIsWebGPUSupported(adapter !== null);
      } catch {
        setIsWebGPUSupported(false);
      }
    };
    checkWebGPU();
  }, []);

  // Reset simulation when geometryType changes
  useEffect(() => {
    if (geometryType !== prevGeometryTypeRef.current) {
      prevGeometryTypeRef.current = geometryType;
      setResetTrigger(prev => prev + 1);
    }
  }, [geometryType]);

  if (isWebGPUSupported === null) {
    return (
      <div ref={containerRef} className={`${className} flex items-center justify-center bg-primary`}>
        <div className="text-tertiary/50 text-sm">Checking WebGPU...</div>
      </div>
    );
  }

  if (!isWebGPUSupported) {
    return (
      <div ref={containerRef} className={`${className} flex items-center justify-center bg-primary`}>
        <div className="text-tertiary/50 text-sm text-center px-4">
          WebGPU not supported in this browser
        </div>
      </div>
    );
  }

  // For gyroid: 3 equal cubes, each cube is (yMax - yMin) / 3 = 6 / 3 = 2 units
  const cubeSize = 2.0;

  const config: Partial<GyroidFlowConfig> = {
    particleCount,
    radius: 0.06,
    radiusMin: 0.04,
    radiusMax: 0.08,
    stiffness: 15000,
    friction: 0.3,
    restitution: 0.4,
    gravity: -9.81,
    // Hourglass bounds
    hourglassRadiusTop: 1.25,
    hourglassRadiusWaist: 0.25,
    hourglassYMin: 0.0,
    hourglassYMax: 6.0,
    // Spawn area - different for hourglass vs gyroid
    // Hourglass: spawn above (y=6.5 to 8.5) so particles fall in
    // Gyroid: spawn inside top box (y=4.5 to 5.8)
    spawnXMin: geometryType === 0 ? -1.0 : -cubeSize / 2 * 0.8,
    spawnXMax: geometryType === 0 ? 1.0 : cubeSize / 2 * 0.8,
    spawnYMin: geometryType === 0 ? 6.5 : 4.5,
    spawnYMax: geometryType === 0 ? 8.5 : 5.8,
    spawnZMin: geometryType === 0 ? -1.0 : -cubeSize / 2 * 0.8,
    spawnZMax: geometryType === 0 ? 1.0 : cubeSize / 2 * 0.8,
    respawnYThreshold: -10.0,  // Disable respawning
    topCapEnabled: false,  // Start with top cap open
    geometryType,
    // Scale so two gyroid periods fit in cubeSize
    gyroidScale: 4 * Math.PI / cubeSize,
    gyroidThreshold: 0.4,
  };

  return (
    <div ref={containerRef} className={`${className} bg-primary`}>
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <PerspectiveCamera makeDefault position={[8, 5, 8]} fov={45} />
        <OrbitControls
          target={[0, 3, 0]}
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2}
        />
        <HourglassFlowScene config={config} showHourglass={showHourglass} resetTrigger={resetTrigger} />
      </Canvas>
    </div>
  );
};

export default HourglassFlowWidget;
