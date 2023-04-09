import { Navbar } from "../";

import { OrbitControls } from "@react-three/drei";
import { Canvas, extend, useFrame } from "@react-three/fiber";
import { Depth, Fresnel, LayerMaterial } from "lamina";
import { useMemo, useRef } from "react";

import CustomLayer from "./CustomLayer";

extend({ CustomLayer });

const Planet = () => {
  const materialRef = useRef();

  useFrame((state) => {
    const { clock } = state;
    materialRef.current.time = clock.getElapsedTime();
  });

  return (
    <mesh position={[0, 0, 0]} rotation={[0, Math.PI, 0]} scale={1.5}>
      <icosahedronGeometry args={[2, 11]} />
      <LayerMaterial lighting="lambert">
        {/* First layer is our own custom layer that's based of the FBM shader */}
        {/* 
          Notice how we can use *any* uniforms as prop here 👇
          You can tweak the colors by adding a colorA or colorB prop!
        */}
        <customLayer ref={materialRef} time={0.0} lacunarity={2.3} />
        {/* Second layer is a depth based gradient that we "add" on top of our custom layer*/}
        <Depth colorA="blue" colorB="aqua" alpha={0.9} mode="add" />
        {/* Third Layer is a Fresnel shading effect that we add on*/}
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
        {/* https://blog.maximeheckel.com/posts/the-study-of-shaders-with-react-three-fiber/ */}
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
