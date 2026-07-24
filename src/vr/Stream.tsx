import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function Stream() {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((_, dt) => {
    if (matRef.current?.normalMap) {
      matRef.current.normalMap.offset.y -= dt * 0.15;
    }
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.9, 0]}>
      <planeGeometry args={[3, 220, 1, 40]} />
      <meshStandardMaterial
        ref={matRef}
        color="#3a6b8a"
        transparent
        opacity={0.85}
        roughness={0.25}
        metalness={0.1}
      />
    </mesh>
  );
}
