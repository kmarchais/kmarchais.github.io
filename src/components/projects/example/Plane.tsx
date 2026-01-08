import { useBox, Triplet } from '@react-three/cannon';
import * as THREE from 'three';
import { Mesh } from 'three';

interface PlaneProps {
  size: [number, number];
}

export function Plane({ size }: PlaneProps) {
  const [ref] = useBox<Mesh>(() => ({
    args: [...size, 0.001] as Triplet,
    rotation: [-Math.PI / 2, 0, 0] as Triplet
  }));
  return (
    <mesh ref={ref}>
      <planeGeometry args={size} />
      <meshStandardMaterial color="blue" side={THREE.DoubleSide} />
    </mesh>
  );
}
