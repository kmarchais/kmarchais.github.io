import { Navbar } from "../";

import { OrbitControls } from "@react-three/drei";
import { Canvas, extend, useFrame } from "@react-three/fiber";
import { Depth, Fresnel, LayerMaterial } from "lamina";
import { useRef } from "react";

import CustomLayer from "./CustomLayer";

extend({ CustomLayer });


const Planet = () => {
  const materialRef = useRef<CustomLayer>(null);

  useFrame((state) => {
    const { clock } = state;
    if (materialRef.current) {
      materialRef.current.time = clock.getElapsedTime();
    }
  });

  return (
    <mesh position={[0, 0, 0]} rotation={[0, Math.PI, 0]} scale={1.5}>
      <icosahedronGeometry args={[2, 11]} />
      {/* @ts-expect-error LayerMaterial typing issue with lamina */}
      <LayerMaterial lighting="lambert">
        {/* @ts-expect-error customLayer is extended via extend() */}
        <customLayer ref={materialRef} time={0.0} lacunarity={2.3} />
        <Depth colorA="blue" colorB="aqua" alpha={0.9} mode="add" />
        <Fresnel color="#FEB3D9" mode="add" />
      </LayerMaterial>
    </mesh>
  );
};

const Shader = () => {
  return (
    <div className="bg-primary">
      <Navbar />

      <section className="h-screen flex">
        <Canvas camera={{ position: [0.0, 0.0, 8.0] }}>
          <ambientLight intensity={0.03} />
          <directionalLight position={[0.3, 0.15, 0.0]} intensity={2} />
          <Planet />
          <OrbitControls />
        </Canvas>
      </section>
    </div>
  );
};

export default Shader;
