"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Suspense, useMemo } from "react";

function Skyscraper({ x, z, h }: { x: number; z: number; h: number }) {
  const geom = useMemo(() => new THREE.BoxGeometry(1, h, 1), [h]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: new THREE.Color(0.07, 0.07, 0.07), metalness: 0.6, roughness: 0.5 }), []);
  return (
    <mesh geometry={geom} material={mat} position={[x, h / 2, z]}
      castShadow receiveShadow>
      <meshStandardMaterial color="#121212"/>
    </mesh>
  );
}

function Buildings() {
  const blocks = useMemo(() => {
    const arr: { x: number; z: number; h: number }[] = [];
    for (let x = -8; x <= 8; x += 2) {
      for (let z = -8; z <= 8; z += 2) {
        if (Math.abs(x) < 2 && Math.abs(z) < 2) continue; // leave center for stage
        const h = 1 + Math.random() * 6;
        arr.push({ x, z, h });
      }
    }
    return arr;
  }, []);
  return (
    <group>
      {blocks.map((b, i) => <Skyscraper key={i} {...b} />)}
    </group>
  );
}

function Stage() {
  return (
    <group>
      {/* Stage base */}
      <mesh position={[0, 0.2, 0]} receiveShadow>
        <cylinderGeometry args={[2.5, 2.5, 0.4, 64]} />
        <meshStandardMaterial color="#0f0f0f" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Truss */}
      <mesh position={[0, 2.2, 0]}>
        <torusGeometry args={[2.6, 0.04, 16, 100]} />
        <meshStandardMaterial color="#151515" metalness={1} roughness={0.4} />
      </mesh>
      {/* Moving spotlights */}
      <MovingSpot angle={0} />
      <MovingSpot angle={Math.PI / 2} />
      <MovingSpot angle={Math.PI} />
      <MovingSpot angle={(3 * Math.PI) / 2} />
    </group>
  );
}

function MovingSpot({ angle }: { angle: number }) {
  const color = new THREE.Color("#E50914");
  const light = useMemo(() => new THREE.SpotLight(color, 2.3, 18, Math.PI / 8, 0.4, 0.5), []);
  // rudimentary animation using onUpdate inside fiber loop
  let t = 0;
  return (
    <primitive
      object={light}
      position={[Math.cos(angle) * 2.6, 2.5, Math.sin(angle) * 2.6]}
      rotation={[0, -angle, 0]}
      onUpdate={(obj: THREE.SpotLight) => {
        t += 0.02; // approximate; fiber will keep calling
        const r = 4;
        obj.target.position.set(Math.cos(angle + t) * r, 0.5 + Math.sin(t) * 0.5, Math.sin(angle + t) * r);
        obj.target.updateMatrixWorld();
      }}
    />
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[60, 60]} />
      <meshStandardMaterial color="#050505" />
    </mesh>
  );
}

export default function CityConcert3D() {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [8, 8, 10], fov: 48 }}>
      <color attach="background" args={["#000000"]} />
      <ambientLight intensity={0.2} />
      <directionalLight position={[6, 10, 4]} intensity={1.2} castShadow />
      <Suspense fallback={null}>
        <Ground />
        <Buildings />
        <Stage />
      </Suspense>
      <OrbitControls enablePan={false} minPolarAngle={0.9} maxPolarAngle={1.35} />
      {/* Atmospheric red haze */}
      <fog attach="fog" args={["#090909", 10, 40]} />
    </Canvas>
  );
}
