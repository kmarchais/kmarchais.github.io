import { Canvas, useFrame } from "@react-three/fiber";

import { shaderMaterial } from "@react-three/drei";
import React, { useRef } from "react";

import * as THREE from "three";

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 colorA;
  uniform vec3 colorB;
  varying vec2 vUv;
  void main() {
    // gl_FragColor = vec4(mix(colorA, colorB, vUv.y), 1.0);

    float kx = 2.0 * 3.141592535;
    float ky = 2.0 * 3.141592535;
    float kz = 2.0 * 3.141592535;

    vec2 uv = 25.0 * vUv;
    float x = uv.x;
    float y = uv.y;
    float z = 3.1415926535;
    float d = sin(kx * x)*cos(ky * y) + sin(ky * y)*cos(kz * z) + sin(kz * z)*cos(kx * x);
    // diamond
    //d = sin(x)*sin(y)*sin(z)+sin(x)*cos(y)*cos(z)+cos(x)*sin(y)*cos(z)+cos(x)*cos(y)*sin(z);
    //Schwartz
    //d = cos(kx * x)+cos(ky * y)+cos(kz * z);

    float l = 0.0;

    //float thickness = 0.25 * (1.0 - abs(vUv.y - 0.5));
    float thickness = -5.0 * (vUv.y - 0.05) * (vUv.y - 0.88);

    if(abs(d) < thickness){l=1.0;};

    // Output to screen
    if (l == 0.0) {
        gl_FragColor = vec4(colorB, 1.0);
    } else {
        gl_FragColor = vec4(colorA, 1.0);
    }
  }
`;

const GradientBackground = () => {
  const uniforms = {
    colorB: { value: new THREE.Color(0x0d1b2a) },
    colorA: { value: new THREE.Color(0x1b263b) },
  };

  return (
    <Canvas orthographic={true}>
      <mesh>
        <planeBufferGeometry args={[1920, 1080]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
        />
      </mesh>
    </Canvas>
  );
};

export default GradientBackground;
