import { Physics } from '@react-three/cannon';
import { OrbitControls, Stage } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { useControls } from 'leva';

import { Balls } from './Balls';
import { Plane } from './Plane';

import Navbar from '../../Navbar';

export default function Example() {
  const { gravity } = useControls({ gravity: { value: [0, -9.81, 0], step: 0.2 } });
  return (
    <div className="bg-black">
      <Navbar />
      <section className="w-full h-screen">
        <Canvas dpr={[1, 2]} shadows>
          <OrbitControls />
          <Suspense fallback={null}>
            <Stage>
              <Physics allowSleep broadphase="SAP" gravity={gravity} defaultContactMaterial={{ friction: 0.1, restitution: 0.1 }}>
                <Plane size={[200, 200]} />
                <Balls />
              </Physics>
            </Stage>
          </Suspense>
        </Canvas>
      </section>
    </div>
  );
}
