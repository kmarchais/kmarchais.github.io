import React from "react";

import { Navbar } from '../';

import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';

const TPMS = () => {
    return (
        <div  className="bg-primary">
                <Navbar />
                
            <section className="h-screen flex">
                <Canvas>
                    
                    <OrthographicCamera makeDefault position={[10, 10, 10]} zoom={100} near={0.1} far={100} />
                    <ambientLight intensity={0.5} />
                    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />

                    <OrbitControls makeDefault />
                </Canvas>
            </section>
        </div>
    );
};

export default TPMS;