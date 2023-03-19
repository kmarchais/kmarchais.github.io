import { Navbar } from '../';

import { Edges, GizmoHelper, GizmoViewport, OrbitControls, OrthographicCamera, PivotControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';

import * as THREE from 'three';

import { forwardRef, React, useRef } from 'react';


function Scene() {
    const boxRef = useRef();
    const sphereRef = useRef();
    const pivotRef = useRef();

    useFrame(() => {
        const box = boxRef.current;
        const sphere = sphereRef.current.children[0];

        // console.log(pivotRef.current)

        const boxPos = new THREE.Vector3().setFromMatrixPosition(box.matrixWorld);
        const boxDim = new THREE.Vector3(box.geometry.parameters.width, box.geometry.parameters.height, box.geometry.parameters.depth).divideScalar(2.);
        const spherePos = new THREE.Vector3().setFromMatrixPosition(sphere.matrixWorld);
        const radius = sphere.geometry.parameters.radius;

        // const closestPoint = new THREE.Vector3().clamp(spherePos, boxPos.clone().sub(box.geometry.parameters), boxPos.clone().add(box.geometry.parameters));
        // const distance = spherePos.distanceTo(closestPoint);
        let absPos = new THREE.Vector3(Math.abs(spherePos.x), Math.abs(spherePos.y), Math.abs(spherePos.z));
        let sign_x = Math.sign(spherePos.x);
        let sign_y = Math.sign(spherePos.y);
        let sign_z = Math.sign(spherePos.z);
        let signPos = new THREE.Vector3(sign_x, sign_y, sign_z);

        let rad = new THREE.Vector3(radius, radius, radius);
        let overlap = absPos.add(rad).sub(boxDim)

        overlap.setX(overlap.x < 0 ? 0 : overlap.x);
        overlap.setY(overlap.y < 0 ? 0 : overlap.y);
        overlap.setZ(overlap.z < 0 ? 0 : overlap.z);

        overlap.multiply(signPos);
        let length_overlap = overlap.length();
        if (length_overlap > 0) {
            console.log('Overlap detected!');
        }
    });

    return (
        <group>
            <OrthographicCamera makeDefault position={[10, 10, 10]} zoom={100} near={0.1} far={100} />
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />

            <Box ref={boxRef} />
            <PivotControls depthTest={false} scale={0.5} ref={pivotRef}>
                <Sphere ref={sphereRef} />
            </PivotControls>


            <GizmoHelper alignment="bottom-right" margin={[100, 100]}>
                <GizmoViewport />
            </GizmoHelper>

            <OrbitControls makeDefault />
        </group>
    );
}

const Box = forwardRef((props, ref) => {
    return (
        <mesh ref={ref} {...props}>
            <boxGeometry args={[2.5, 5, 8]} />
            <meshPhongMaterial color={'#777777'} transparent opacity={0.5} />
            <Edges />
        </mesh>
    )
});

const Sphere = forwardRef((props, ref) => {
    const arrowRef = useRef();
    const scale = 2;

    useFrame(() => {
        const arrow = arrowRef.current;
        if (ref.current) {
            arrow.position.copy(ref.current.position);
            arrow.setLength(scale);
        }
    });

    return (
        <group ref={ref}>
            <mesh {...props}>
                <sphereGeometry args={[1, 32, 32]} />
                <meshPhongMaterial color={'#f3f3f3'} />
            </mesh>
            <arrowHelper ref={arrowRef} />
        </group>
    );
});


const Collisions = () => {

    return (
        <div className="bg-primary">
            <Navbar />
            {/* <section className="w-full h-screen"> */}
            <section className="h-screen flex">
                <Canvas>
                    <Scene />
                </Canvas>
                <div className="w-[50%] pt-[10%] bg-red-700">
                    <h1 className="text-4xl text-center text-white">Collisions</h1>
                    <ol>
                        <li>Box</li>
                        <li>Sphere</li>
                        <li>Arrow</li>
                    </ol>
                </div>
            </section>
        </div >
    );
};

export default Collisions;