import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PONDS } from "./ponds";
import { heightAt } from "./useHeightAt";

/**
 * Four small circular ponds. Purely decorative geometry — obstacle avoidance
 * and drink logic live in obstacles.ts / Player.tsx (via ponds.ts).
 */
export function Ponds({ vrSafe = false }: { vrSafe?: boolean }) {
  const waterRefs = useRef<Array<THREE.MeshPhysicalMaterial | null>>([]);

  const items = useMemo(
    () =>
      PONDS.map((p) => {
        // Sink water surface just below the terrain at the pond center.
        const y = heightAt(p.x, p.z) - 0.25;
        return { ...p, y };
      }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    waterRefs.current.forEach((m) => {
      if (!m) return;
      // Subtle shimmer via clearcoat roughness modulation.
      m.clearcoatRoughness = 0.08 + Math.sin(t * 1.3) * 0.03;
    });
  });

  return (
    <group>
      {items.map((p, i) => (
        <group key={i} position={[p.x, p.y, p.z]}>
          {/* Muddy bank ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
            <circleGeometry args={[p.r + 0.7, 40]} />
            <meshStandardMaterial color="#2b1d12" roughness={1} />
          </mesh>
          {/* Water disc */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[p.r, 40]} />
            {vrSafe ? (
              <meshStandardMaterial color="#1f5f7c" roughness={0.28} metalness={0.02} />
            ) : (
              <meshPhysicalMaterial
                ref={(m) => {
                  waterRefs.current[i] = m;
                }}
                color="#1f4a63"
                transparent
                opacity={0.92}
                roughness={0.1}
                metalness={0.05}
                transmission={0.3}
                thickness={0.5}
                ior={1.33}
                clearcoat={1}
                clearcoatRoughness={0.1}
                envMapIntensity={1.4}
              />
            )}
          </mesh>
          {/* Highlight ripple layer */}
          {!vrSafe && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
              <circleGeometry args={[p.r * 0.7, 32]} />
              <meshStandardMaterial
                color="#78a8c0"
                transparent
                opacity={0.18}
                roughness={0.25}
                metalness={0.1}
                depthWrite={false}
              />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}
