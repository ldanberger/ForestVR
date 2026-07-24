import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function Stream() {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  // Procedural normal map for ripples
  const normalMap = useMemo(() => {
    const size = 256;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const nx = Math.sin(x * 0.12) * Math.cos(y * 0.09);
        const ny = Math.cos(x * 0.07) * Math.sin(y * 0.11);
        data[i] = 128 + nx * 60;
        data[i + 1] = 128 + ny * 60;
        data[i + 2] = 255;
        data[i + 3] = 255;
      }
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 40);
    tex.needsUpdate = true;
    return tex;
  }, []);

  useFrame((_, dt) => {
    normalMap.offset.y -= dt * 0.25;
    normalMap.offset.x += dt * 0.03;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.85, 0]} receiveShadow>
      <planeGeometry args={[3, 240, 1, 60]} />
      <meshStandardMaterial
        ref={matRef}
        color="#2b5a78"
        transparent
        opacity={0.88}
        roughness={0.15}
        metalness={0.35}
        normalMap={normalMap}
        normalScale={new THREE.Vector2(0.6, 0.6)}
        envMapIntensity={1.2}
      />
    </mesh>
  );
}
