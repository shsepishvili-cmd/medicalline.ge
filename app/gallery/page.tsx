"use client";

import React, { useState, Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Image as DreiImage, Environment, OrbitControls, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { galleryImages } from './galleryData';

// --- ცენტრალური ლოგო (EIGHTEETH) ---
function CenterLogo() {
  const logoRef = useRef(null);

  // ლოგო ნელა ტრიალებს საპირისპირო მიმართულებით
  useFrame((state, delta) => {
     if (logoRef.current) {
       (logoRef.current as any).rotation.y -= delta * 0.1; 
     }
  });

  return (
    <group position={[0, -0.2, 0]}> 
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5} floatingRange={[-0.1, 0.1]}>
        {/* ✅ აქ ჩავსვით ზუსტად შენი PNG ლოგო */}
        <DreiImage 
          ref={logoRef}
          url="/images/eighteeth-logo.png" 
          transparent // ეს აუცილებელია PNG-სთვის, რომ ფონი არ ჰქონდეს
          side={THREE.DoubleSide}
          scale={[5, 5, 1]} // ზომები: სიგანე 4, სიმაღლე 1.5 (შეცვალე თუ გაწელილია)
          toneMapped={false}
        />
      </Float>
    </group>
  );
}

// --- გარშემო მბრუნავი სურათები ---
function CarouselItem({ url, position, rotation, title }: any) {
  const [hovered, setHover] = useState(false);

  return (
    <group position={position} rotation={rotation}>
      <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
        <DreiImage 
          url={url} 
          transparent 
          side={THREE.DoubleSide}
          onPointerOver={() => setHover(true)}
          onPointerOut={() => setHover(false)}
          scale={hovered ? [2.4, 1.8, 1] : [2.2, 1.65, 1]}
          toneMapped={false}
        />
        <Text
          position={[0, -1.1, 0]}
          fontSize={0.12}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.005}
          outlineColor="black"
        >
          {title.toUpperCase()}
        </Text>
      </Float>
    </group>
  );
}

// --- კარუსელის ჯგუფი ---
function Carousel() {
  const radius = 5.5; // რადიუსი ოდნავ გავზარდე, რომ ლოგოს არ დაეჯახონ
  const count = galleryImages.length;

  return (
    <group position={[0, -0.5, 0]}>
      {galleryImages.map((img, i) => {
        const angle = (i / count) * Math.PI * 2;
        const x = Math.sin(angle) * radius;
        const z = Math.cos(angle) * radius;

        return (
          <CarouselItem 
            key={img.id} 
            url={img.url} 
            title={img.title}
            position={[x, 0, z]} 
            rotation={[0, angle, 0]} 
          />
        );
      })}
    </group>
  );
}

// --- მთავარი გვერდი ---
export default function Gallery3DPage() {
  return (
    <main className="h-screen w-full bg-slate-950 relative overflow-hidden">
      
      {/* Header */}
      <div className="absolute top-0 left-0 z-50 p-6 flex items-center justify-between w-full pointer-events-none">
         <Link href="/" className="flex items-center gap-2 text-white/70 hover:text-white transition font-bold uppercase tracking-widest text-xs pointer-events-auto">
           <ArrowLeft size={18}/> მთავარზე
         </Link>
         <h1 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 uppercase italic tracking-tighter">
            3D გალერეა
         </h1>
         <div className="w-20"></div>
      </div>

      <Canvas gl={{ antialias: true }} dpr={[1, 1.5]} camera={{ position: [0, 0, 12], fov: 50 }}>
        <color attach="background" args={['#020617']} />
        
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
        <Environment preset="city" />

        <Suspense fallback={null}>
           {/* ცენტრალური ლოგო */}
           <CenterLogo />
           
           {/* მბრუნავი სურათები */}
           <Carousel />
           
           <OrbitControls 
             autoRotate 
             autoRotateSpeed={0.5}
             enableZoom={false}
             enablePan={false}
             minPolarAngle={Math.PI / 2.5}
             maxPolarAngle={Math.PI / 1.8}
           />
        </Suspense>
      </Canvas>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50 text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] pointer-events-none animate-pulse text-center w-full">
        გამოიყენეთ თითი ან მაუსი
      </div>
    </main>
  );
}