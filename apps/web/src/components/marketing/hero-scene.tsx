'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { SceneCanvas } from '@/components/three/scene-canvas';

/** Approximates the `--accent` design token (`oklch(0.64 0.15 73)`, a warm brass/amber) —
 * a literal hex, not the CSS variable itself: three.js materials parse color strings
 * directly, with no DOM/CSS context to resolve a custom property against. */
const ACCENT_HEX = '#b8863a';

function RotatingShape() {
  const ref = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x += delta * 0.15;
    ref.current.rotation.y += delta * 0.2;
  });

  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[1.6, 1]} />
      <meshStandardMaterial color={ACCENT_HEX} wireframe roughness={0.3} metalness={0.4} />
    </mesh>
  );
}

/**
 * Purely decorative Home-hero accent — primitive geometry only, no GLTF models (none
 * exist yet). `next/dynamic({ssr:false})`-imported by `home-hero.tsx`, per
 * `scene-canvas.tsx`'s own requirement (WebGL can't render on the server). Never
 * load-bearing content: `home-hero.tsx` skips rendering this entirely under reduced
 * motion or below the `lg` breakpoint.
 */
function HeroScene() {
  return (
    <SceneCanvas camera={{ position: [0, 0, 5], fov: 45 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 3, 3]} intensity={1} />
      <RotatingShape />
    </SceneCanvas>
  );
}

export default HeroScene;
