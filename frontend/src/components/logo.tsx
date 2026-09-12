"use client";

import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

interface LogoProps {
  darkMode?: boolean;
}

function EmblemScene({ darkMode = true }: LogoProps) {
  const outerRingRef = useRef<THREE.Mesh>(null);
  const innerCoreRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (outerRingRef.current) {
      outerRingRef.current.rotation.x += delta * 0.9;
      outerRingRef.current.rotation.y += delta * 0.6;
    }
    if (innerCoreRef.current) {
      innerCoreRef.current.rotation.y -= delta * 1.4;
      innerCoreRef.current.rotation.z += delta * 0.8;
    }
  });

  return (
    <Float speed={2.5} rotationIntensity={0.2} floatIntensity={0.2}>
      {/* Outer Crimson Shield Ring */}
      <mesh ref={outerRingRef}>
        <torusGeometry args={[0.34, 0.035, 16, 40]} />
        <meshStandardMaterial
          color="#f43f5e"
          emissive="#e11d48"
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.7}
        />
      </mesh>

      {/* Floating Cyan/Teal Diamond Core */}
      <mesh ref={innerCoreRef}>
        <octahedronGeometry args={[0.18, 0]} />
        <meshStandardMaterial
          color={darkMode ? "#38bdf8" : "#0284c7"}
          emissive={darkMode ? "#0284c7" : "#38bdf8"}
          emissiveIntensity={0.6}
          roughness={0.1}
          metalness={0.9}
          wireframe
        />
      </mesh>
    </Float>
  );
}

export default function Logo3D({ darkMode = true }: LogoProps) {
  return (
    <div className="w-9 h-9 relative flex items-center justify-center">
      <Canvas camera={{ position: [0, 0, 1.1] }}>
        <ambientLight intensity={1.2} />
        <pointLight position={[2, 2, 2]} intensity={2} color="#f43f5e" />
        <pointLight position={[-2, -2, -2]} intensity={1.5} color="#38bdf8" />
        <EmblemScene darkMode={darkMode} />
      </Canvas>
    </div>
  );
}