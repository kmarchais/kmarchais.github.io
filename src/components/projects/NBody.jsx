import { Line, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import React, { useRef } from 'react';
import * as THREE from 'three';

import Navbar from '../Navbar';

const Planet = ({ size, orbit_radius, color }) => {
    const meshRef = useRef()
    const time = useRef(0)

    useFrame(() => {
        const speed = 0.01 // adjust this to change the speed of orbit
        const x = orbit_radius * Math.sin(time.current)
        const z = orbit_radius * Math.cos(time.current)
        time.current += speed

        meshRef.current.position.set(x, 0, z)
    })

    const orbitPoints = Array.from(Array(361).keys()).map(i => {
        const angle = i * Math.PI / 180;
        const x = orbit_radius * Math.sin(angle);
        const z = orbit_radius * Math.cos(angle);
        return new THREE.Vector3(x, 0, z);
    });

    return (
        <group>
            <Line points={orbitPoints} color={color} />
            <mesh ref={meshRef}>
                <sphereGeometry args={[size, 32, 32]} />
                <meshStandardMaterial color={color} />
            </mesh>
        </group>
    )
};

const Star = () => {
    const meshRef = useRef()

    return (
        <mesh ref={meshRef}>
            <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[1, 32, 32]} />
                <meshStandardMaterial color={'#d35400'} />
            </mesh>
        </mesh>
    )
};

const NBody = () => {
    const groupRef = useRef();
    const controlsRef = useRef();

    return (
        <div className="bg-black">
            <Navbar />
            <section className="w-full h-screen">
                <Canvas
                    camera={{ position: [0, 5, 10], fov: 60 }}
                    onCreated={({ gl, camera }) => {
                        gl.shadowMap.enabled = true;
                        gl.shadowMap.type = THREE.PCFSoftShadowMap;
                        camera.lookAt(0, 0, 0);
                    }}
                >
                    <OrbitControls ref={controlsRef} />
                    <ambientLight intensity={0.5} />
                    <spotLight position={[0, 10, 10]} penumbra={1} castShadow />
                    <group ref={groupRef}>
                        <Planet size={0.1} orbit_radius={2.} color={"grey"} />
                        <Planet size={0.1} orbit_radius={4.} color={"orange"} />
                        <Planet size={0.1} orbit_radius={5.} color={"blue"} />
                        <Planet size={0.1} orbit_radius={6.} color={"red"} />
                        <Star />
                    </group>
                </Canvas>
            </section>
        </div>
    );
};

export default NBody;